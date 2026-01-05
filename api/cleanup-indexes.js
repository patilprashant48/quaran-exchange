const mongoose = require('mongoose');

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

module.exports = async (req, res) => {
    try {
        await connectDB();
        
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');
        
        // Drop old problematic indexes
        try {
            await usersCollection.dropIndex('phone_1');
            console.log('Dropped phone_1 index');
        } catch (e) {
            console.log('phone_1 index not found or already dropped');
        }
        
        try {
            await usersCollection.dropIndex('email_1');
            console.log('Dropped email_1 index');
        } catch (e) {
            console.log('email_1 index not found or already dropped');
        }
        
        // List current indexes
        const indexes = await usersCollection.indexes();
        
        return res.status(200).json({
            success: true,
            message: 'Old indexes cleaned up',
            currentIndexes: indexes
        });
        
    } catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ 
            error: 'Cleanup failed', 
            details: error.message 
        });
    }
};
