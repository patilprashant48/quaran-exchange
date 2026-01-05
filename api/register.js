const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

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

// Send OTP via SMS using Twilio
async function sendOTPSMS(phone, otp, name) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        throw new Error('Twilio SMS not configured');
    }
    
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
        body: `Welcome to Qaran Exchange, ${name}! Your verification code is: ${otp}. This code expires in 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
    });
}

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
        subject: 'Verify Your Qaran Exchange Account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a73e8;">Welcome to Qaran Exchange!</h2>
                <p>Hi ${name},</p>
                <p>Thank you for registering with Qaran Exchange. To complete your registration, please use the following verification code:</p>
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
        const { name, email, phone, password } = req.body;
        
        if (!name || (!email && !phone)) {
            return res.status(400).json({ error: 'Name and email or phone are required' });
        }
        
        await connectDB();
        
        // Check if user exists
        const existingUser = await User.findOne(email ? { email } : { phone });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password if provided
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        
        // Create user
        const user = await User.create({
            name,
            email: email || null,
            phone: phone || null,
            password: hashedPassword
        });
        
        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60000);
        
        await OTP.create({
            user_id: user._id,
            code: otp,
            type: email ? 'email' : 'sms',
            expires_at: expiresAt
        });
        
        // Send OTP
        if (email) {
            try {
                await sendOTPEmail(email, otp, name);
                return res.status(200).json({ 
                    success: true, 
                    message: 'Registration successful. Please check your email for the verification code.',
                    userId: user._id.toString(),
                    verificationType: 'email'
                });
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                // Delete the created user if email fails
                await User.findByIdAndDelete(user._id);
                await OTP.deleteMany({ user_id: user._id });
                return res.status(500).json({ 
                    success: false,
                    error: 'Failed to send verification email. Please try again.'
                });
            }
        } else {
            // For phone registration
            try {
                await sendOTPSMS(phone, otp, name);
                return res.status(200).json({ 
                    success: true, 
                    message: 'Registration successful. Please check your phone for the verification code.',
                    userId: user._id.toString(),
                    verificationType: 'sms'
                });
            } catch (smsError) {
                console.error('SMS sending failed:', smsError);
                // Delete the created user if SMS fails
                await User.findByIdAndDelete(user._id);
                await OTP.deleteMany({ user_id: user._id });
                return res.status(500).json({ 
                    success: false,
                    error: 'Failed to send verification SMS. Please check your phone number or try email registration.'
                });
            }
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ 
            error: 'Server error', 
            details: error.message 
        });
    }
};
