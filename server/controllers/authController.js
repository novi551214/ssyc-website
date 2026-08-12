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

    req.session.adminId = admin._id.toString();
    req.session.adminEmail = admin.email;

    res.json({ message: 'Logged in successfully.', email: admin.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
};

exports.me = (req, res) => {
  if (req.session && req.session.adminId) {
    return res.json({ email: req.session.adminEmail });
  }
  res.status(401).json({ message: 'Not authenticated.' });
};
