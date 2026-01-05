const mongoose = require('mongoose');

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
        const { userId, otp } = req.body;
        
        if (!userId || !otp) {
            return res.status(400).json({ error: 'User ID and OTP are required' });
        }
        
        await connectDB();
        
        // Find valid OTP
        const otpRecord = await OTP.findOne({
            user_id: userId,
            code: otp,
            is_used: false,
            expires_at: { $gt: new Date() }
        });
        
        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        
        // Mark OTP as used
        await OTP.updateOne({ _id: otpRecord._id }, { is_used: true });
        
        // Mark user as verified
        await User.updateOne({ _id: userId }, { is_verified: true });
        
        return res.status(200).json({ 
            success: true, 
            message: 'Account verified successfully'
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ 
            error: 'Server error', 
            details: error.message 
        });
    }
};
