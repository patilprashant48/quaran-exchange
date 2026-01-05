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

// Submission Schema
const submissionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customer_name: { type: String, required: true },
    customer_phone: { type: String, required: true },
    customer_email: String,
    exchange_details: {
        from_platform: String,
        to_platform: String,
        amount: Number
    },
    accounts: {
        evcplus: String,
        zaad: String,
        premier: String,
        edahap: String,
        moneygo: String,
        xbet_1: String,
        melbet: String,
        usdt_trc20: String,
        usdt_erc20: String,
        usdt_bep20: String
    },
    notes: String,
    status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled'], default: 'pending' },
}, { timestamps: true });

const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

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
        
        // Get all submissions sorted by most recent
        const submissions = await Submission.find({})
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();
        
        // Format for frontend
        const formattedSubmissions = submissions.map(submission => ({
            id: submission._id.toString(),
            customer_name: submission.customer_name,
            customer_phone: submission.customer_phone,
            customer_email: submission.customer_email,
            exchange_details: submission.exchange_details,
            accounts: submission.accounts,
            notes: submission.notes,
            status: submission.status,
            created_at: submission.createdAt,
            updated_at: submission.updatedAt
        }));
        
        return res.status(200).json({
            success: true,
            submissions: formattedSubmissions,
            count: formattedSubmissions.length
        });
    } catch (error) {
        console.error('Error fetching submissions:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch submissions'
        });
    }
};
