const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  source: { type: String, default: 'website' }, // 'popup' | 'footer' | 'website'
  mailchimpSynced: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
