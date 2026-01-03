const mongoose = require('mongoose');

// MongoDB connection state
let isConnected = false;

// Connect to MongoDB with caching for serverless
const connectDB = async () => {
    if (isConnected && mongoose.connection.readyState === 1) {
        console.log('✅ Using existing MongoDB connection');
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qaran-exchange', {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000,
        });
        
        isConnected = conn.connection.readyState === 1;
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        isConnected = false;
        throw error;
    }
};

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    password: String,
    is_verified: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    last_login: Date
});

// OTP Schema
const otpSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    code: { type: String, required: true },
    type: { type: String, required: true },
    expires_at: { type: Date, required: true },
    is_used: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
    transaction_id: { type: String, unique: true, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payment_method: { type: String, required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    exchange_type: { type: String, required: true },
    sender_account: { type: String, required: true },
    receiver_account: { type: String, required: true },
    customer_name: { type: String, required: true },
    customer_phone: { type: String, required: true },
    customer_email: String,
    notes: String,
    status: { type: String, default: 'completed' },
    created_at: { type: Date, default: Date.now }
});

// Customer Submission Schema
const submissionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customer_name: { type: String, required: true },
    customer_phone: { type: String, required: true },
    customer_email: { type: String, required: true },
    usdt_wallet: String,
    evc_plus_number: String,
    xbet_id: String,
    melbet_id: String,
    moneygo_wallet: String,
    edahap_number: String,
    premier_wallet: String,
    notes: String,
    status: { type: String, default: 'pending' },
    created_at: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Submission = mongoose.model('Submission', submissionSchema);

module.exports = {
    connectDB,
    User,
    OTP,
    Payment,
    Submission
};
