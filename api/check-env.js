module.exports = async (req, res) => {
    res.status(200).json({
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        hasMongoUri: !!process.env.MONGODB_URI,
        emailUserPrefix: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 5) + '***' : 'NOT SET'
    });
};
