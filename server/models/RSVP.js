const mongoose = require('mongoose');

const rsvpSchema = new mongoose.Schema({
  eventId: { type: String, required: true, trim: true },
  eventTitle: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('RSVP', rsvpSchema);
