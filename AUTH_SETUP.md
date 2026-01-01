# Qaran Exchange - Authentication System Setup

This guide will help you set up and run the user authentication system with OTP verification.

## Prerequisites

- Node.js (v14 or higher) - [Download](https://nodejs.org/)
- NPM (comes with Node.js)
- A Gmail account for sending OTP emails (or SMTP server)

## Installation Steps

### 1. Install Dependencies

Open terminal in the project folder and run:

```bash
npm install
```

This will install all required packages:
- express (web server)
- sqlite3 (database)
- bcryptjs (password hashing)
- nodemailer (email sending)
- express-session (session management)
- And other security packages

### 2. Configure Environment Variables

Create a `.env` file in the root directory by copying the example:

```bash
copy .env.example .env
```

Or manually create `.env` file and add:

```env
# Server Configuration
PORT=3000

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-random-string-here-change-this

# Email Configuration (for OTP delivery)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# SMS Configuration (optional - for production)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# OTP Settings
OTP_EXPIRY_MINUTES=10
```

### 3. Setup Gmail App Password

To send OTP emails via Gmail:

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App passwords
4. Create a new app password for "Mail"
5. Copy the 16-character password
6. Paste it in `.env` as `EMAIL_PASS`

**Important:** Never use your actual Gmail password!

### 4. Generate Session Secret

Generate a secure random string for SESSION_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it in `.env` as `SESSION_SECRET`

## Running the Server

### Development Mode (auto-restart on changes)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start at `http://localhost:3000`

## Testing the System

### 1. Open the Website

Navigate to `http://localhost:3000` in your browser

### 2. Register a New Account

1. Click "Register" in the header
2. Fill in your details (name, email/phone, optional password)
3. Click "Create Account"
4. Check your email for the 6-digit OTP code
5. Enter the code on the verification page

**Note:** In development mode, the OTP will also be displayed on screen if email sending fails.

### 3. Login

**Option A: With Password**
1. Click "Login"
2. Enter email/phone and password
3. Click "Login"

**Option B: Passwordless (OTP only)**
1. Click "Login"
2. Switch to "With OTP" tab
3. Enter email/phone
4. Click "Send OTP"
5. Check email for OTP
6. Enter code on verification page

### 4. Access Dashboard

After successful login, you'll be redirected to your dashboard where you can:
- View account statistics
- Access quick actions
- See transaction history (placeholder)
- Logout

## Database

The system uses SQLite database (`database.db`) which is automatically created on first run.

**Tables:**
- `users` - User accounts
- `otp_codes` - Verification codes
- `sessions_table` - Active sessions

To reset the database, simply delete `database.db` and restart the server.

## API Endpoints

The backend provides these REST API endpoints:

- `POST /api/register` - Create new user account
- `POST /api/verify-otp` - Verify OTP code
- `POST /api/login` - Login with password or request OTP
- `GET /api/check-session` - Check if user is logged in
- `POST /api/logout` - Logout current user
- `POST /api/resend-otp` - Resend verification code

## Security Features

✅ Password hashing with bcrypt
✅ Session-based authentication
✅ HTTP-only secure cookies
✅ Rate limiting (100 requests per 15 minutes)
✅ CORS protection
✅ Helmet security headers
✅ SQL injection protection
✅ OTP expiry (10 minutes)
✅ One-time use OTP codes

## Troubleshooting

### Email not sending

1. Check your `.env` file has correct Gmail credentials
2. Verify you're using an App Password, not your Gmail password
3. Check if 2FA is enabled on your Google account
4. Look at the server console for error messages

### Port already in use

If port 3000 is busy, change it in `.env`:
```env
PORT=3001
```

### Database errors

Delete `database.db` and restart the server to recreate tables.

### Session not persisting

Clear browser cookies and try again. Check if SESSION_SECRET is set in `.env`.

## Production Deployment

Before deploying to production:

1. ✅ Set strong SESSION_SECRET
2. ✅ Use environment variables (not .env file)
3. ✅ Enable HTTPS
4. ✅ Set up proper SMTP or Twilio for SMS
5. ✅ Configure firewall rules
6. ✅ Set up database backups
7. ✅ Use process manager (PM2)
8. ✅ Set NODE_ENV=production

## File Structure

```
Qaran Exchange/
├── server.js              # Backend server
├── package.json           # Dependencies
├── .env                   # Environment config (create this)
├── .env.example          # Environment template
├── database.db           # SQLite database (auto-created)
├── register.html         # Registration page
├── login.html            # Login page
├── verify.html           # OTP verification (registration)
├── verify-login.html     # OTP verification (login)
├── dashboard.html        # User dashboard
├── js/
│   └── auth.js          # Authentication state management
└── css/
    └── styles.css       # Styles (includes auth UI)
```

## Support

For questions or issues:
- Check server console logs
- Verify .env configuration
- Test API endpoints with Postman
- Check browser console for frontend errors

## Next Steps

After setup:
1. Test registration flow
2. Test both login methods (password & OTP)
3. Customize email templates in `server.js`
4. Add transaction/exchange functionality
5. Integrate with payment gateways
6. Set up SMS for phone verification

---

**Important:** Never commit `.env` file to version control. It contains sensitive credentials.
