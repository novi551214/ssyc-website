const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['subscription', 'donation'], required: true },
  tier: { type: String, enum: ['friend', 'supporter', 'patron', null], default: null },
  amount: { type: Number, default: null }, // in USD, for one-time donations
  email: { type: String, trim: true, lowercase: true, default: null },
  provider: { type: String, enum: ['stripe', 'paypal'], required: true },
  providerRefId: { type: String, trim: true, required: true }, // Stripe session/subscription ID or PayPal order ID
  status: { type: String, default: 'pending' }, // pending | completed | active | canceled | failed
}, { timestamps: true });

transactionSchema.index({ provider: 1, providerRefId: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', transactionSchema);
