const Admin = require('../models/Admin');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await admin.checkPassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        console.error('Session regeneration error:', regenerateError);
        return res.status(500).json({ message: 'Server error during login.' });
      }
      req.session.adminId = admin._id.toString();
      req.session.adminEmail = admin.email;
      req.session.save((saveError) => {
        if (saveError) {
          console.error('Session save error:', saveError);
          return res.status(500).json({ message: 'Server error during login.' });
        }
        return res.json({ message: 'Logged in successfully.', email: admin.email });
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ message: 'Could not log out.' });
    res.clearCookie('ssyc.sid', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.json({ message: 'Logged out.' });
  });
};

exports.me = (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({ email: req.session.adminEmail });
  }
  res.status(401).json({ message: 'Not authenticated.' });
};
