# Quick Start Guide - Qaran Exchange Authentication System

## 🚀 Get Started in 5 Minutes

### Step 1: Install Node.js Dependencies

```bash
npm install
```

### Step 2: Create Environment File

Create a `.env` file in the project root:

```env
PORT=3000
SESSION_SECRET=my-super-secret-key-change-this-in-production
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
OTP_EXPIRY_MINUTES=10
```

**Important:** Replace `EMAIL_USER` and `EMAIL_PASS` with your Gmail credentials.

### Step 3: Setup Gmail App Password (Required for OTP emails)

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Go to **App passwords** (search for it)
4. Select **Mail** and **Other** (custom name)
5. Copy the 16-character password
6. Paste it in `.env` as `EMAIL_PASS`

### Step 4: Start the Server

```bash
npm start
```

Server will run at: **http://localhost:3000**

### Step 5: Test the System

1. Open http://localhost:3000
2. Click **"Register"** button
3. Fill in your details
4. Check your email for 6-digit OTP
5. Enter OTP to verify account
6. Login and access your dashboard!

---

## 📋 Features Included

✅ User Registration (email/phone)
✅ OTP Email Verification
✅ Login (password or passwordless OTP)
✅ User Dashboard
✅ Session Management
✅ Secure Authentication
✅ Bilingual (EN/SO)

## 🔧 Troubleshooting

**Server won't start?**
- Make sure port 3000 is not in use
- Check that Node.js is installed: `node --version`

**Email not sending?**
- Verify Gmail App Password is correct
- Check 2FA is enabled on Google account
- Look for error messages in terminal

**Can't login?**
- Clear browser cookies
- Check if server is running
- Verify email in registration was correct

## 📁 Project Structure

```
Qaran Exchange/
├── server.js           # Backend API server
├── package.json        # Dependencies
├── .env               # Your configuration (create this)
├── database.db        # Auto-created SQLite database
├── register.html      # User registration
├── login.html         # User login
├── verify.html        # OTP verification (register)
├── verify-login.html  # OTP verification (login)
├── dashboard.html     # User dashboard
├── js/
│   └── auth.js       # Authentication state management
└── AUTH_SETUP.md     # Detailed setup guide
```

## 🎯 Next Steps

1. ✅ Test registration flow
2. ✅ Test login (both methods)
3. ✅ Access dashboard
4. 📝 Customize email templates in `server.js`
5. 🎨 Add exchange functionality
6. 🚀 Deploy to production

## 📞 Support

Need help? Check:
- `AUTH_SETUP.md` for detailed documentation
- Server console for error messages
- Browser console (F12) for frontend errors

---

**Note:** In development, if email sending fails, OTP codes are displayed on screen for testing.
