const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup - use in-memory database for Vercel (serverless), file-based for local
const dbPath = process.env.VERCEL ? ':memory:' : './database.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log(`Connected to SQLite database (${process.env.VERCEL ? 'in-memory for serverless' : 'file-based'})`);
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password TEXT,
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        user_id INTEGER,
        payment_method TEXT NOT NULL,
        amount REAL NOT NULL,
        fee REAL NOT NULL,
        total_amount REAL NOT NULL,
        exchange_type TEXT NOT NULL,
        sender_account TEXT NOT NULL,
        receiver_account TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        notes TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS customer_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        usdt_wallet TEXT,
        evc_plus_number TEXT,
        xbet_id TEXT,
        melbet_id TEXT,
        moneygo_wallet TEXT,
        edahap_number TEXT,
        premier_wallet TEXT,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Session configuration
app.use(session({
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
        const checkQuery = email 
            ? 'SELECT * FROM users WHERE email = ?' 
            : 'SELECT * FROM users WHERE phone = ?';
        
        db.get(checkQuery, [email || phone], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (row) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Hash password if provided
            const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

            // Insert user
            const insertQuery = `INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)`;
            db.run(insertQuery, [name, email, phone, hashedPassword], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }

                const userId = this.lastID;

                // Generate and send OTP
                const otp = generateOTP();
                const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
                const expiresAt = new Date(Date.now() + expiryMinutes * 60000).toISOString();

                db.run(
                    'INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, ?, ?)',
                    [userId, otp, email ? 'email' : 'sms', expiresAt],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to generate OTP' });
                        }

                        // Send OTP
                        if (email) {
                            sendOTPEmail(email, otp, name)
                                .then(() => {
                                    req.session.pendingUserId = userId;
                                    res.json({ 
                                        success: true, 
                                        message: 'Registration successful. Please check your email for verification code.',
                                        userId: userId,
                                        verificationType: 'email'
                                    });
                                })
                                .catch(err => {
                                    console.error('Email error:', err);
                                    res.json({ 
                                        success: true, 
                                        message: 'Registration successful. Your verification code is: ' + otp,
                                        userId: userId,
                                        verificationType: 'email',
                                        otp: otp // For testing without email
                                    });
                                });
                        } else {
                            // For SMS, return OTP in response (in production, send via Twilio)
                            req.session.pendingUserId = userId;
                            res.json({ 
                                success: true, 
                                message: 'Registration successful. Your verification code is: ' + otp,
                                userId: userId,
                                verificationType: 'sms',
                                otp: otp // In production, this would be sent via SMS
                            });
                        }
                    }
                );
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { userId, code } = req.body;

    if (!userId || !code) {
        return res.status(400).json({ error: 'User ID and code are required' });
    }

    const query = `
        SELECT * FROM otp_codes 
        WHERE user_id = ? AND code = ? AND is_used = 0 
        AND datetime(expires_at) > datetime('now')
        ORDER BY created_at DESC LIMIT 1
    `;

    db.get(query, [userId, code], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        // Mark OTP as used
        db.run('UPDATE otp_codes SET is_used = 1 WHERE id = ?', [row.id], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Verification failed' });
            }

            // Mark user as verified
            db.run('UPDATE users SET is_verified = 1 WHERE id = ?', [userId], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Verification failed' });
                }

                // Get user data
                db.get('SELECT id, name, email, phone FROM users WHERE id = ?', [userId], (err, user) => {
                    if (err || !user) {
                        return res.status(500).json({ error: 'User not found' });
                    }

                    req.session.userId = userId;
                    req.session.user = user;

                    res.json({ 
                        success: true, 
                        message: 'Account verified successfully!',
                        user: user
                    });
                });
            });
        });
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { identifier, password } = req.body; // identifier can be email or phone

    if (!identifier) {
        return res.status(400).json({ error: 'Email or phone is required' });
    }

    const query = 'SELECT * FROM users WHERE (email = ? OR phone = ?) AND is_verified = 1';
    
    db.get(query, [identifier, identifier], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
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
            const expiresAt = new Date(Date.now() + expiryMinutes * 60000).toISOString();

            db.run(
                'INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, ?, ?)',
                [user.id, otp, user.email ? 'email' : 'sms', expiresAt],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to generate OTP' });
                    }

                    if (user.email) {
                        sendOTPEmail(user.email, otp, user.name)
                            .then(() => {
                                res.json({ 
                                    success: true, 
                                    message: 'Login code sent to your email',
                                    userId: user.id,
                                    requiresOTP: true
                                });
                            })
                            .catch(err => {
                                res.json({ 
                                    success: true, 
                                    message: 'Your login code is: ' + otp,
                                    userId: user.id,
                                    requiresOTP: true,
                                    otp: otp
                                });
                            });
                    } else {
                        res.json({ 
                            success: true, 
                            message: 'Your login code is: ' + otp,
                            userId: user.id,
                            requiresOTP: true,
                            otp: otp
                        });
                    }
                }
            );
        } else {
            // Password login successful
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
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
    });
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
app.post('/api/resend-otp', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const otp = generateOTP();
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60000).toISOString();

        db.run(
            'INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, ?, ?)',
            [userId, otp, user.email ? 'email' : 'sms', expiresAt],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to generate OTP' });
                }

                if (user.email) {
                    sendOTPEmail(user.email, otp, user.name)
                        .then(() => {
                            res.json({ 
                                success: true, 
                                message: 'New verification code sent to your email'
                            });
                        })
                        .catch(err => {
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
            }
        );
    });
});

// ==================== PAYMENT ENDPOINTS ====================

// Create new payment
app.post('/api/payments/create', limiter, (req, res) => {
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

    // Generate unique transaction ID
    const transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Get user_id from session if logged in
    const userId = req.session.userId || null;

    const query = `INSERT INTO payments 
        (transaction_id, user_id, payment_method, amount, fee, total_amount, 
         exchange_type, sender_account, receiver_account, customer_name, 
         customer_phone, customer_email, notes, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(
        query,
        [
            transactionId,
            userId,
            paymentMethod,
            amount,
            fee,
            totalAmount,
            exchangeType,
            senderAccount,
            receiverAccount,
            customerName,
            customerPhone,
            customerEmail || null,
            notes || null,
            'completed'
        ],
        function(err) {
            if (err) {
                console.error('Payment creation error:', err);
                return res.json({ 
                    success: false, 
                    error: 'Failed to create payment' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Payment completed successfully',
                paymentId: this.lastID,
                transactionId: transactionId
            });
        }
    );
});

// Get payment by ID
app.get('/api/payments/:id', (req, res) => {
    const paymentId = req.params.id;

    db.get(
        'SELECT * FROM payments WHERE id = ?',
        [paymentId],
        (err, payment) => {
            if (err) {
                return res.json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }

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
        }
    );
});

// Get all payments (Admin)
app.get('/api/payments/all', (req, res) => {
    db.all(
        'SELECT * FROM payments ORDER BY created_at DESC',
        [],
        (err, payments) => {
            if (err) {
                return res.json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }

            res.json({ 
                success: true, 
                payments: payments || [] 
            });
        }
    );
});

// Get user payments (authenticated user only)
app.get('/api/payments/user/history', (req, res) => {
    if (!req.session.userId) {
        return res.json({ 
            success: false, 
            error: 'Not authenticated' 
        });
    }

    db.all(
        'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
        [req.session.userId],
        (err, payments) => {
            if (err) {
                return res.json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }

            res.json({ 
                success: true, 
                payments: payments || [] 
            });
        }
    );
});

// Get payment statistics
app.get('/api/payments/stats', (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as count FROM payments',
        completed: 'SELECT COUNT(*) as count FROM payments WHERE status = "completed"',
        pending: 'SELECT COUNT(*) as count FROM payments WHERE status = "pending"',
        volume: 'SELECT SUM(total_amount) as total FROM payments WHERE status = "completed"'
    };

    const stats = {};

    db.get(queries.total, (err, row) => {
        stats.total = row ? row.count : 0;
        
        db.get(queries.completed, (err, row) => {
            stats.completed = row ? row.count : 0;
            
            db.get(queries.pending, (err, row) => {
                stats.pending = row ? row.count : 0;
                
                db.get(queries.volume, (err, row) => {
                    stats.volume = row && row.total ? row.total : 0;
                    
                    res.json({ 
                        success: true, 
                        stats: stats 
                    });
                });
            });
        });
    });
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
        // Insert submission into database
        db.run(
            `INSERT INTO customer_submissions (
                user_id, customer_name, customer_phone, customer_email, 
                usdt_wallet, evc_plus_number, xbet_id, melbet_id, 
                moneygo_wallet, edahap_number, premier_wallet, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, customerName, customerPhone, customerEmail,
                usdtWallet || null, evcPlusNumber || null, xbetId || null, melbetId || null,
                moneygoWallet || null, edahapNumber || null, premierWallet || null, notes || null,
                'pending'
            ],
            function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to save submission' 
                    });
                }

                const submissionId = this.lastID;

                // Send email notification to admin
                sendAdminNotificationEmail({
                    submissionId,
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
app.get('/api/submissions/all', (req, res) => {
    db.all(
        'SELECT * FROM customer_submissions ORDER BY created_at DESC',
        [],
        (err, submissions) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }

            res.json({ 
                success: true, 
                submissions: submissions || [] 
            });
        }
    );
});

// Get single submission by ID
app.get('/api/submissions/:id', (req, res) => {
    const submissionId = req.params.id;

    db.get(
        'SELECT * FROM customer_submissions WHERE id = ?',
        [submissionId],
        (err, submission) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }

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
        }
    );
});

// Update submission status (Admin)
app.put('/api/submissions/:id/status', (req, res) => {
    const submissionId = req.params.id;
    const { status } = req.body;

    if (!status || !['pending', 'processing', 'completed', 'rejected'].includes(status)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid status' 
        });
    }

    db.run(
        'UPDATE customer_submissions SET status = ? WHERE id = ?',
        [status, submissionId],
        function(err) {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Database error' 
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Submission not found' 
                });
            }

            res.json({ 
                success: true, 
                message: 'Status updated successfully' 
            });
        }
    );
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
