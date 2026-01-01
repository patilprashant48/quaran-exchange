# Qaran Exchange - Digital Wallet Exchange Platform

A complete bilingual (English/Somali) money exchange website with user authentication system.

## 🌟 Overview

Qaran Exchange is a professional money transfer and digital wallet exchange platform that supports:
- **Mobile Money**: EVC Plus, Zaad, Premier Wallet
- **Betting Wallets**: 1XBET, Melbet
- **Other Platforms**: Moneygo, Edahap
- **Cryptocurrency**: USDT Exchange

## ✨ Features

### Website Features
✅ **Fully Responsive Design** - Works perfectly on all devices
✅ **Bilingual Support** - Complete English & Somali translations
✅ **5 Main Pages:**
   - Home (index.html) - Hero, features, services showcase
   - About Us (about.html) - Company info and values
   - Services (services.html) - Detailed service offerings
   - Contact Us (contact.html) - Contact form with WhatsApp integration
   - Chat Support (chat.html) - Live chat interface

### 🔐 Authentication System (NEW!)
✅ **User Registration** - Email or phone number with OTP verification
✅ **Secure Login** - Password or passwordless (OTP-based) authentication  
✅ **Email OTP Verification** - 6-digit codes with 10-minute expiry
✅ **Password Security** - bcrypt hashing (10 rounds)
✅ **Session Management** - Secure session cookies (24-hour expiry)
✅ **User Dashboard** - Personal account management
✅ **Protected Routes** - Login required for dashboard access

### Interactive Features
✅ Language switcher (EN/SO)
✅ Live chat with automated responses
✅ Contact form with validation
✅ WhatsApp integration (+252 61 217 8241)
✅ Platform logos showcase (8 platforms)
✅ Smooth animations and transitions
✅ Mobile-friendly navigation

## 📦 Tech Stack

### Frontend
- HTML5, CSS3, Vanilla JavaScript
- Font Awesome 6.4.0
- LocalStorage for language preference
- Responsive design (5 breakpoints)

### Backend (Authentication System)
- **Node.js** (v14+)
- **Express.js** 4.18.2 - Web server
- **SQLite3** 5.1.6 - Database
- **bcryptjs** 2.4.3 - Password hashing
- **express-session** 1.17.3 - Session management
- **nodemailer** 6.9.7 - Email OTP delivery
- **helmet**, **cors** - Security middleware
- **express-rate-limit** - DDoS protection (100 req/15min)

## 🚀 Quick Start

### Option 1: Static Website Only (No Authentication)
Simply open `index.html` in your browser. All pages work without a server.

### Option 2: Full System with Authentication

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Configure Environment
Create `.env` file:
```env
PORT=3000
SESSION_SECRET=your-random-secret-key
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
OTP_EXPIRY_MINUTES=10
```

**See [QUICKSTART.md](QUICKSTART.md) for detailed setup steps including Gmail App Password configuration.**

#### 3. Start Server
```bash
npm start
```

Visit http://localhost:3000

## 📁 File Structure

```
Qaran Exchange/
├── Frontend (Public Pages)
│   ├── index.html             # Home page
│   ├── about.html             # About page
│   ├── services.html          # Services page
│   ├── contact.html           # Contact page
│   ├── chat.html              # Chat support
│   ├── css/
│   │   └── styles.css         # Main stylesheet (1800+ lines)
│   ├── js/
│   │   ├── main.js           # Core functionality
│   │   ├── chat.js           # Chat responses
│   │   ├── translations.js   # Bilingual content
│   │   └── auth.js           # Authentication state (NEW)
│   └── images/
│       ├── logo.jpg          # Company logo
│       ├── platforms/        # Platform logos (8 images)
│       ├── about-img.jpg
│       ├── money-transfer.jpg
│       ├── currency-exchange.jpg
│       └── digital-currency.jpg
│
├── Authentication Pages (NEW)
│   ├── register.html          # User registration
│   ├── login.html             # User login
│   ├── verify.html            # OTP verification (register)
│   ├── verify-login.html      # OTP verification (login)
│   └── dashboard.html         # User dashboard (protected)
│
├── Backend Server (NEW)
│   ├── server.js              # Express API server (400+ lines)
│   ├── package.json           # Dependencies
│   ├── .env                   # Configuration (create this)
│   ├── .env.example           # Configuration template
│   └── database.db            # SQLite database (auto-created)
│
└── Documentation
    ├── README.md              # This file
    ├── QUICKSTART.md          # 5-minute setup guide (NEW)
    ├── AUTH_SETUP.md          # Detailed auth guide (NEW)
    └── image-guidelines.html  # Image sourcing
```

## 🔐 Authentication System

### Features
- Email/Phone registration
- OTP verification (6-digit codes)
- Dual login methods (password or OTP)
- Secure session management
- User dashboard
- Password hashing with bcrypt
- Rate limiting (100 req/15min)

### API Endpoints
- `POST /api/register` - Create account
- `POST /api/verify-otp` - Verify OTP
- `POST /api/login` - Login
- `GET /api/check-session` - Check auth status
- `POST /api/logout` - Logout
- `POST /api/resend-otp` - Resend OTP

### Database Tables
- **users** - User accounts
- **otp_codes** - Verification codes
- **sessions_table** - Active sessions

## 🌍 Bilingual Support

Complete translations in:
- **English (EN)**
- **Somali (SO)**

Toggle with globe icon in header. Language preference saved in LocalStorage.

## 📞 Contact Integration

- **WhatsApp**: +252 61 217 8241 (click to chat)
- **Email**: info@qaranexchange.com
- **Location**: Mogadishu, Somalia

## 🎨 Supported Platforms

### Mobile Money
- EVC Plus
- Zaad
- Premier Wallet

### Betting Platforms
- 1XBET
- Melbet

### Other Services
- Moneygo
- Edahap
- USDT

## 🔧 Customization

### Update Colors
Edit CSS variables in `css/styles.css`:
```css
:root {
    --primary-color: #1a73e8;
    --secondary-color: #34a853;
}
```

### Modify Email Template
Edit `sendOTPEmail()` function in `server.js`

### Add Platform Logos
1. Add image to `images/platforms/`
2. Update HTML platform sections
3. Add translations in `js/translations.js`

## 📱 Responsive Design

Breakpoints:
- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile Large: 640px - 767px
- Mobile: < 640px

## 🚀 Deployment

### Development
```bash
npm run dev  # Auto-restart on changes
```

### Production
1. Set environment variables (don't commit .env)
2. Configure HTTPS
3. Use PM2 process manager:
```bash
pm2 start server.js --name qaran-exchange
```

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[AUTH_SETUP.md](AUTH_SETUP.md)** - Complete authentication setup
- **[image-guidelines.html](image-guidelines.html)** - Image guidelines

## 🐛 Troubleshooting

**Email not sending?**
- Verify Gmail App Password
- Enable 2FA on Google account
- Check server logs

**Port 3000 busy?**
- Change PORT in .env
- Kill existing process

**Database errors?**
- Delete database.db
- Restart server

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)  
- Mobile browsers

## Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Icons**: Font Awesome 6.4.0
- **Security**: bcrypt, helmet, cors

## 📄 License

Created for Qaran Exchange.

## 👨‍💻 Support

For questions: info@qaranexchange.com

---

**Built with ❤️ for Qaran Exchange**  
Last Updated: 2024

4. Test in multiple browsers before deploying

## Important Notes

⚠️ **Security:** The contact form currently uses simulated submission. You'll need to:
- Set up a backend API for actual form submissions
- Add proper email service integration (e.g., SendGrid, Mailgun)
- Implement CAPTCHA to prevent spam

⚠️ **Chat:** The chat feature uses predefined responses. For real live chat:
- Integrate with services like Tawk.to, Intercom, or LiveChat
- Or build a custom backend with WebSocket support

⚠️ **Images:** Replace all placeholder images with high-quality, relevant images

## License
This website template is ready for commercial use for Qaran Exchange.

---

**Built with ❤️ for Qaran Exchange**

For questions or support, please contact your development team.
