require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { stripeWebhook } = require('./controllers/supportController');

const rsvpRoutes = require('./routes/rsvp');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');

const app = express();

// --- Database ---
connectDB();

// --- Security & logging ---
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for simplicity w/ inline scripts + CDN fonts
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));

// --- Rate limiting for form-submission endpoints (basic abuse protection) ---
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
app.use('/api/rsvp', formLimiter);
app.use('/api/contact', formLimiter);
app.use('/api/newsletter', formLimiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// --- Stripe webhook needs the RAW body, so it must be registered BEFORE
//     express.json() and outside of any route file that assumes parsed JSON. ---
app.post('/api/support/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// --- Standard body parsing (after the webhook route above) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Sessions (used for simple admin auth) ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'insecure_dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in prod
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

// --- API routes ---
app.use('/api/rsvp', rsvpRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// --- Serve the static frontend (client/) ---
app.use(express.static(path.join(__dirname, '..', 'client')));

// Fallback: any unmatched non-API GET request serves index.html (simple SPA-ish routing safety net)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'), (err) => {
    if (err) next();
  });
});

// --- 404 for unmatched API routes ---
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

// --- Central error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SSYC server running on http://localhost:${PORT}`);
});
