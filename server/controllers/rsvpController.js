const RSVP = require('../models/RSVP');

exports.createRsvp = async (req, res) => {
  try {
    const { eventId, eventTitle, name, email, phone } = req.body;

    if (!eventId || !eventTitle || !name || !email || !phone) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const rsvp = await RSVP.create({ eventId, eventTitle, name, email, phone });
    res.status(201).json({ message: 'RSVP received!', rsvp });
  } catch (err) {
    console.error('RSVP error:', err);
    res.status(500).json({ message: 'Could not save your RSVP. Please try again.' });
  }
};
