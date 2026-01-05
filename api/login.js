const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// MongoDB connection
let isConnected = false;

const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
    });
    
    isConnected = mongoose.connection.readyState === 1;
};

// Send OTP Email
async function sendOTPEmail(email, otp, name) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email not configured');
    }
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    
    const mailOptions = {
        from: `"Qaran Exchange" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Qaran Exchange Login Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a73e8;">Qaran Exchange Login</h2>
                <p>Hi ${name},</p>
                <p>You requested to login to your Qaran Exchange account. Please use the following verification code:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #1a73e8; margin: 0; letter-spacing: 5px;">${otp}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from Qaran Exchange. Please do not reply to this email.</p>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
}

// Schemas
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, sparse: true },
    phone: { type: String, sparse: true },
    password: String,
    is_verified: { type: Boolean, default: false },
}, { timestamps: true });

// Create compound unique index for email and phone
userSchema.index({ email: 1 }, { unique: true, sparse: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, sparse: true, partialFilterExpression: { phone: { $type: 'string' } } });

const otpSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    type: { type: String, enum: ['email', 'sms'], required: true },
    expires_at: { type: Date, required: true },
    is_used: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { identifier, password, usePassword } = req.body;
        
        if (!identifier) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Only accept email
        if (!identifier.includes('@')) {
            return res.status(400).json({ error: 'Please provide a valid email address' });
        }
        
        await connectDB();
        
        // Find user by email
        const user = await User.findOne({ email: identifier });
        
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        
        if (!user.is_verified) {
            return res.status(400).json({ error: 'Please verify your account first' });
        }
        
        // Password-based login
        if (usePassword) {
            if (!password) {
                return res.status(400).json({ error: 'Password is required' });
            }
            
            if (!user.password) {
                return res.status(400).json({ error: 'No password set for this account. Please use OTP login.' });
            }
            
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Invalid password' });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }
            });
        }
        
        // OTP-based login
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000);
        
        await OTP.create({
            user_id: user._id,
            code: otp,
            type: 'email',
            expires_at: expiresAt
        });
        
        // Send OTP via email
        try {
            await sendOTPEmail(user.email, otp, user.name);
            return res.status(200).json({
                success: true,
                requiresOTP: true,
                message: 'OTP sent to your email',
                userId: user._id.toString(),
                verificationType: 'email'
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            return res.status(500).json({
                success: false,
                error: 'Failed to send OTP email. Please try again.'
            });
        }
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            error: 'Server error', 
            details: error.message 
        });
    }
};
