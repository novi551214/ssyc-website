const RSVP = require('../models/RSVP');
const Subscriber = require('../models/Subscriber');
const Transaction = require('../models/Transaction');

exports.getRsvps = async (req, res) => {
  const rsvps = await RSVP.find().sort({ createdAt: -1 }).limit(500);
  res.json(rsvps);
};

exports.getSubscribers = async (req, res) => {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 }).limit(1000);
  res.json(subscribers);
};

exports.getTransactions = async (req, res) => {
  const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(500);
  res.json(transactions);
};
