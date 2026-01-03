const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB, User, OTP, Payment, Submission } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB before processing API requests (skip for static files)
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ error: 'Database connection failed', details: error.message });
    }
});

// Session configuration
    secret: process.env.SESSION_SECRET || 'qaran-exchange-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);

// Email transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Helper Functions
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendOTPEmail(email, otp, name) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Qaran Exchange - Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a73e8;">Qaran Exchange</h2>
                <p>Hello ${name},</p>
                <p>Your verification code is:</p>
                <h1 style="color: #1a73e8; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                <p>This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">Qaran Exchange - Secure Money Transfer</p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

// API Routes

// Register User
app.post('/api/register', async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || (!email && !phone)) {
        return res.status(400).json({ error: 'Name and email or phone are required' });
    }

    try {
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

        // Generate and send OTP
        const otp = generateOTP();
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

        await OTP.create({
            user_id: user._id,
            code: otp,
            type: email ? 'email' : 'sms',
            expires_at: expiresAt
        });

        // Send OTP
        if (email) {
            sendOTPEmail(email, otp, name)
                .then(() => {
                    req.session.pendingUserId = user._id.toString();
                    res.json({ 
                        success: true, 
                        message: 'Registration successful. Please check your email for verification code.',
                        userId: user._id.toString(),
                        verificationType: 'email'
                    });
                })
                .catch(err => {
                    console.error('Email error:', err);
                    res.json({ 
                        success: true, 
                        message: 'Registration successful. Your verification code is: ' + otp,
                        userId: user._id.toString(),
                        verificationType: 'email',
                        otp: otp // For testing without email
                    });
                });
        } else {
            // For SMS, return OTP in response (in production, send via Twilio)
            req.session.pendingUserId = user._id.toString();
            res.json({ 
                success: true, 
                message: 'Registration successful. Your verification code is: ' + otp,
                userId: user._id.toString(),
                verificationType: 'sms',
                otp: otp // In production, this would be sent via SMS
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'User ID and code are required' });
    }

    try {
        // Find valid OTP
        const otpRecord = await OTP.findOne({
            user_id: userId,
            code,
            is_used: false,
            expires_at: { $gt: new Date() }
        }).sort({ created_at: -1 });

        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        // Mark OTP as used
        otpRecord.is_used = true;
        await otpRecord.save();

        // Mark user as verified
        const user = await User.findByIdAndUpdate(
            userId,
            { is_verified: true },
            { new: true, select: 'id name email phone' }
        );

        if (!user) {
            return res.status(500).json({ error: 'User not found' });
        }

        req.session.userId = userId;
        req.session.user = user;

        res.json({ 
            success: true, 
            message: 'Account verified successfully!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { identifier, password } = req.body; // identifier can be email or phone

    if (!identifier) {
        return res.status(400).json({ error: 'Email or phone is required' });
    }

    try {
        // Find user by email or phone
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }],
            is_verified: true
        });

        if (!user) {
            return res.status(400).json({ error: 'User not found or not verified' });
        }

        // If password is provided, verify it
        if (password && user.password) {
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(400).json({ error: 'Invalid password' });
            }
        }

        // Generate and send OTP for passwordless login
        if (!password) {
            const otp = generateOTP();
            const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
            const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

            await OTP.create({
                user_id: user._id,
                code: otp,
                type: user.email ? 'email' : 'sms',
                expires_at: expiresAt
            });

            if (user.email) {
                sendOTPEmail(user.email, otp, user.name)
                    .then(() => {
                        res.json({ 
                            success: true, 
                            message: 'Login code sent to your email',
                            userId: user._id.toString(),
                            requiresOTP: true
                        });
                    })
                    .catch(err => {
                        console.error('Email error:', err);
                        res.json({ 
                            success: true, 
                            message: 'Your login code is: ' + otp,
                            userId: user._id.toString(),
                            requiresOTP: true,
                            otp: otp
                        });
                    });
            } else {
                res.json({ 
                    success: true, 
                    message: 'Your login code is: ' + otp,
                    userId: user._id.toString(),
                    requiresOTP: true,
                    otp: otp
                });
            }
        } else {
            // Password login successful
            user.last_login = new Date();
            await user.save();
            
            req.session.userId = user._id.toString();
            req.session.user = {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            };

            res.json({ 
                success: true, 
                message: 'Login successful',
                user: req.session.user
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Check session
app.get('/api/check-session', (req, res) => {
    if (req.session.userId && req.session.user) {
        res.json({ 
            authenticated: true, 
            user: req.session.user 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Resend OTP
app.post('/api/resend-otp', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const otp = generateOTP();
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60000);

        await OTP.create({
            user_id: userId,
            code: otp,
            type: user.email ? 'email' : 'sms',
            expires_at: expiresAt
        });

        if (user.email) {
            sendOTPEmail(user.email, otp, user.name)
                .then(() => {
                    res.json({ 
                        success: true, 
                        message: 'New verification code sent to your email'
                    });
                })
                .catch(err => {
                    console.error('Email error:', err);
                    res.json({ 
                        success: true, 
                        message: 'Your new verification code is: ' + otp,
                        otp: otp
                    });
                });
        } else {
            res.json({ 
                success: true, 
                message: 'Your new verification code is: ' + otp,
                otp: otp
            });
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ error: 'Failed to resend OTP' });
    }
});

// ==================== PAYMENT ENDPOINTS ====================

// Create new payment
app.post('/api/payments/create', limiter, async (req, res) => {
    const {
        paymentMethod,
        amount,
        fee,
        totalAmount,
        exchangeType,
        senderAccount,
        receiverAccount,
        customerName,
        customerPhone,
        customerEmail,
        notes
    } = req.body;

    // Validate required fields
    if (!paymentMethod || !amount || !exchangeType || !senderAccount || 
        !receiverAccount || !customerName || !customerPhone) {
        return res.json({ 
            success: false, 
            error: 'Missing required fields' 
        });
    }

    try {
        // Generate unique transaction ID
        const transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

        // Get user_id from session if logged in
        const userId = req.session.userId || null;

        const payment = await Payment.create({
            transaction_id: transactionId,
            user_id: userId,
            payment_method: paymentMethod,
            amount,
            fee,
            total_amount: totalAmount,
            exchange_type: exchangeType,
            sender_account: senderAccount,
            receiver_account: receiverAccount,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            notes: notes || null,
            status: 'completed'
        });

        res.json({ 
            success: true, 
            message: 'Payment completed successfully',
            paymentId: payment._id.toString(),
            transactionId: transactionId
        });
    } catch (error) {
        console.error('Payment creation error:', error);
        res.json({ 
            success: false, 
            error: 'Failed to create payment' 
        });
    }
});

// Get payment by ID
app.get('/api/payments/:id', async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.json({ 
                success: false, 
                error: 'Payment not found' 
            });
        }

        res.json({ 
            success: true, 
            payment: payment 
        });
    } catch (error) {
        console.error('Payment fetch error:', error);
        res.json({ 
            success: false, 
            error: 'Database error' 
        });
    }
});

// Get all payments (Admin)
app.get('/api/payments/all', async (req, res) => {
    try {
        const payments = await Payment.find().sort({ created_at: -1 });

        res.json({ 
            success: true, 
            payments: payments || [] 
        });
    } catch (error) {
        console.error('Payments fetch error:', error);
        res.json({ 
            success: false, 
            error: 'Database error' 
        });
    }
});

// Get user payments (authenticated user only)
app.get('/api/payments/user/history', async (req, res) => {
    if (!req.session.userId) {
        return res.json({ 
            success: false, 
            error: 'Not authenticated' 
        });
    }

    try {
        const payments = await Payment.find({ user_id: req.session.userId }).sort({ created_at: -1 });

        res.json({ 
            success: true, 
            payments: payments || [] 
        });
    } catch (error) {
        console.error('User payments fetch error:', error);
        res.json({ 
            success: false, 
            error: 'Database error' 
        });
    }
});

// Get payment statistics
app.get('/api/payments/stats', async (req, res) => {
    try {
        const stats = {
            total: await Payment.countDocuments(),
            completed: await Payment.countDocuments({ status: 'completed' }),
            pending: await Payment.countDocuments({ status: 'pending' }),
            volume: 0
        };

        const volumeResult = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);

        stats.volume = volumeResult.length > 0 ? volumeResult[0].total : 0;

        res.json({ 
            success: true, 
            stats: stats 
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.json({ 
            success: false, 
            error: 'Database error' 
        });
    }
});

// ============================================
// CUSTOMER SUBMISSION ENDPOINTS
// ============================================

// Create customer submission
app.post('/api/submissions/create', async (req, res) => {
    const { 
        customerName, 
        customerPhone, 
        customerEmail, 
        usdtWallet, 
        evcPlusNumber, 
        xbetId, 
        melbetId, 
        moneygoWallet, 
        edahapNumber, 
        premierWallet, 
        notes 
    } = req.body;

    // Validate required fields
    if (!customerName || !customerPhone || !customerEmail) {
        return res.status(400).json({ 
            success: false, 
            message: 'Customer name, phone, and email are required' 
        });
    }

    // Check if at least one account is provided
    const accounts = [usdtWallet, evcPlusNumber, xbetId, melbetId, moneygoWallet, edahapNumber, premierWallet];
    const hasAccount = accounts.some(acc => acc && acc.trim() !== '');

    if (!hasAccount) {
        return res.status(400).json({ 
            success: false, 
            message: 'At least one account detail is required' 
        });
    }

    // Get user_id if logged in
    const userId = req.session.userId || null;

    try {
        // Create submission
        const submission = await Submission.create({
            user_id: userId,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail,
            usdt_wallet: usdtWallet || null,
            evc_plus_number: evcPlusNumber || null,
            xbet_id: xbetId || null,
            melbet_id: melbetId || null,
            moneygo_wallet: moneygoWallet || null,
            edahap_number: edahapNumber || null,
            premier_wallet: premierWallet || null,
            notes: notes || null,
            status: 'pending'
        });

        // Send email notification to admin
        sendAdminNotificationEmail({
            submissionId: submission._id,
            customerName,
            customerPhone,
            customerEmail,
            accounts: {
                usdtWallet,
                evcPlusNumber,
                xbetId,
                melbetId,
                moneygoWallet,
                edahapNumber,
                premierWallet
            },
            notes
        });

        res.json({ 
                    success: true, 
                    message: 'Your details have been submitted successfully',
                    submissionId: submissionId
                });
            }
        );
    } catch (error) {
        console.error('Error creating submission:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while processing your submission' 
        });
    }
});

// Get all customer submissions (Admin)
app.get('/api/submissions/all', async (req, res) => {
    try {
        const submissions = await Submission.find().sort({ created_at: -1 });

        res.json({ 
            success: true, 
            submissions: submissions || [] 
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error' 
        });
    }
});

// Get single submission by ID
app.get('/api/submissions/:id', async (req, res) => {
    try {
        const submission = await Submission.findById(req.params.id);

        if (!submission) {
            return res.status(404).json({ 
                success: false, 
                error: 'Submission not found' 
            });
        }

        res.json({ 
            success: true, 
            submission: submission 
        });
    } catch (error) {
        console.error('Submission fetch error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error' 
        });
    }
});

// Update submission status (Admin)
app.put('/api/submissions/:id/status', async (req, res) => {
    const { status } = req.body;

    if (!status || !['pending', 'processing', 'completed', 'rejected'].includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid status' 
        });
    }

    try {
        const submission = await Submission.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!submission) {
            return res.status(404).json({ 
                success: false, 
                error: 'Submission not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Status updated successfully' 
        });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Database error' 
        });
    }
});

// Function to send admin notification email
async function sendAdminNotificationEmail(data) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Build account details HTML
        let accountsHtml = '';
        if (data.accounts.usdtWallet) {
            accountsHtml += `<p><strong>USDT Wallet:</strong> ${data.accounts.usdtWallet}</p>`;
        }
        if (data.accounts.evcPlusNumber) {
            accountsHtml += `<p><strong>EVC Plus Number:</strong> ${data.accounts.evcPlusNumber}</p>`;
        }
        if (data.accounts.xbetId) {
            accountsHtml += `<p><strong>1xBet ID:</strong> ${data.accounts.xbetId}</p>`;
        }
        if (data.accounts.melbetId) {
            accountsHtml += `<p><strong>Melbet ID:</strong> ${data.accounts.melbetId}</p>`;
        }
        if (data.accounts.moneygoWallet) {
            accountsHtml += `<p><strong>MoneyGo U Wallet:</strong> ${data.accounts.moneygoWallet}</p>`;
        }
        if (data.accounts.edahapNumber) {
            accountsHtml += `<p><strong>Edahap Number:</strong> ${data.accounts.edahapNumber}</p>`;
        }
        if (data.accounts.premierWallet) {
            accountsHtml += `<p><strong>Premier Wallet:</strong> ${data.accounts.premierWallet}</p>`;
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject: `New Customer Submission #${data.submissionId} - Qaran Exchange`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2196F3; border-bottom: 3px solid #2196F3; padding-bottom: 10px;">
                        New Customer Account Details Submission
                    </h2>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Customer Information</h3>
                        <p><strong>Submission ID:</strong> #${data.submissionId}</p>
                        <p><strong>Name:</strong> ${data.customerName}</p>
                        <p><strong>Phone:</strong> ${data.customerPhone}</p>
                        <p><strong>Email:</strong> ${data.customerEmail}</p>
                    </div>

                    <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Account Details</h3>
                        ${accountsHtml}
                    </div>

                    ${data.notes ? `
                    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Additional Notes</h3>
                        <p>${data.notes}</p>
                    </div>
                    ` : ''}

                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                        <p>This is an automated notification from Qaran Exchange system.</p>
                        <p>Please login to the admin panel to review and process this submission.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Admin notification email sent successfully');
    } catch (error) {
        console.error('Error sending admin notification email:', error);
        // Don't throw error - submission should still succeed even if email fails
    }
}

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Export for serverless (Vercel)
module.exports = app;

// Start server if not in serverless environment
if (require.main === module) {
    const serverInstance = app.listen(PORT, () => {
        console.log(`🚀 Qaran Exchange server running on http://localhost:${PORT}`);
        console.log(`📧 Email configured: ${process.env.EMAIL_USER ? 'Yes' : 'No (using demo mode)'}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            serverInstance.close();
            console.log('\n👋 Qaran Exchange server closed');
            process.exit(0);
        });
    });
}
