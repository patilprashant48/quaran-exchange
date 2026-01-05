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

// Payment Schema
const paymentSchema = new mongoose.Schema({
    transaction_id: { type: String, required: true, unique: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payment_method: { type: String, required: true },
    amount: { type: Number, required: true },
    fee: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    exchange_type: String,
    sender_account: String,
    receiver_account: String,
    customer_name: { type: String, required: true },
    customer_phone: { type: String, required: true },
    customer_email: String,
    notes: String,
    transaction_hash: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        await connectDB();
        
        // Get all payments sorted by most recent
        const payments = await Payment.find({})
            .sort({ createdAt: -1 })
            .limit(1000) // Limit to last 1000 payments
            .lean();
        
        // Format for frontend
        const formattedPayments = payments.map(payment => ({
            id: payment._id.toString(),
            transaction_id: payment.transaction_id,
            payment_method: payment.payment_method,
            amount: payment.amount,
            fee: payment.fee,
            total_amount: payment.total_amount,
            exchange_type: payment.exchange_type,
            sender_account: payment.sender_account,
            receiver_account: payment.receiver_account,
            customer_name: payment.customer_name,
            customer_phone: payment.customer_phone,
            customer_email: payment.customer_email,
            notes: payment.notes,
            transaction_hash: payment.transaction_hash,
            status: payment.status,
            created_at: payment.createdAt,
            updated_at: payment.updatedAt
        }));
        
        return res.status(200).json({
            success: true,
            payments: formattedPayments,
            count: formattedPayments.length
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch payments'
        });
    }
};
