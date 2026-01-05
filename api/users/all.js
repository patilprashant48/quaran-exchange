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

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, sparse: true },
    phone: { type: String, sparse: true },
    password: String,
    is_verified: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

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
        
        // Get all users sorted by most recent
        const users = await User.find({})
            .select('-password') // Exclude password field
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();
        
        // Format for frontend
        const formattedUsers = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone,
            is_verified: user.is_verified,
            created_at: user.createdAt,
            updated_at: user.updatedAt
        }));
        
        return res.status(200).json({
            success: true,
            users: formattedUsers,
            count: formattedUsers.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
};
