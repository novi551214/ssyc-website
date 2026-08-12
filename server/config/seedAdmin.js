// Run with: npm run seed:admin
// Creates (or updates the password of) the admin account defined in .env

require('dotenv').config();
const connectDB = require('./db');
const Admin = require('../models/Admin');

(async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const passwordHash = await Admin.hashPassword(password);
  const admin = await Admin.findOneAndUpdate(
    { email },
    { email, passwordHash },
    { upsert: true, new: true }
  );

  console.log(`✅ Admin account ready: ${admin.email}`);
  process.exit(0);
})();
