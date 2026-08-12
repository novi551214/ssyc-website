const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

exports.sendContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // If SMTP isn't configured yet, don't crash — just log and respond success
    // so the frontend still works during local development.
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('[contact] SMTP not configured. Message received:', { name, email, message });
      return res.json({ message: 'Message received (email delivery not yet configured).' });
    }

    await getTransporter().sendMail({
      from: `"SSYC Website" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER,
      replyTo: email,
      subject: `New Contact Form Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    });

    res.json({ message: 'Message sent successfully.' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ message: 'Could not send your message. Please try again later.' });
  }
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
