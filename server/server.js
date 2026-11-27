require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
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
const isProduction = process.env.NODE_ENV === 'production';

function configuredOrigins() {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL || '';
  const origins = raw.split(',').map((value) => value.trim()).filter(Boolean).map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      throw new Error(`Invalid client origin: ${value}`);
    }
  });
  if (isProduction && origins.length === 0) {
    throw new Error('CLIENT_URL or CLIENT_URLS must contain an exact HTTPS origin in production.');
  }
  return origins;
}

function sessionSecret() {
  const value = process.env.SESSION_SECRET || '';
  const placeholder = /change|replace|insecure|example/i.test(value);
  if (value.length >= 32 && !placeholder) return value;
  if (isProduction) {
    throw new Error('SESSION_SECRET must be a non-placeholder value of at least 32 characters in production.');
  }
  console.warn('SESSION_SECRET is missing or weak; using an ephemeral development-only secret.');
  return crypto.randomBytes(32).toString('hex');
}

const allowedOrigins = configuredOrigins();
if (isProduction) app.set('trust proxy', 1);

// --- Database ---
connectDB();

// --- Security & logging ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", 'https://www.paypal.com', 'https://www.paypalobjects.com'],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.paypal.com', 'https://*.paypalobjects.com'],
      connectSrc: ["'self'", 'https://*.paypal.com'],
      frameSrc: ["'self'", 'https://*.paypal.com'],
      formAction: ["'self'", 'https://*.paypal.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origin not allowed by CORS.'), { status: 403 }));
  },
  credentials: true,
}));

app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (!origin || allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ message: 'Request origin is not allowed.' });
});

// --- Rate limiting for form-submission endpoints (basic abuse protection) ---
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
app.use('/api/rsvp', formLimiter);
app.use('/api/contact', formLimiter);
app.use('/api/newsletter', formLimiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/support/create-subscription-session', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/support/create-donation-session', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/support/paypal', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

// --- Stripe webhook needs the RAW body, so it must be registered BEFORE
//     express.json() and outside of any route file that assumes parsed JSON. ---
app.post('/api/support/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// --- Standard body parsing (after the webhook route above) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Sessions (used for simple admin auth) ---
app.use(session({
  name: 'ssyc.sid',
  secret: sessionSecret(),
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 8 * 60 * 60,
    touchAfter: 5 * 60,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
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
  res.status(err.status || 500).json({ message: err.status === 403 ? err.message : 'Something went wrong on our end.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SSYC server running on http://localhost:${PORT}`);
});
