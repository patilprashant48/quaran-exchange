module.exports = (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Direct Vercel function works!',
        timestamp: new Date().toISOString()
    });
};
