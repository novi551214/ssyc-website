const express = require('express');
const router = express.Router();
const {
  getPublicConfig,
  createSubscriptionSession,
  createDonationSession,
  stripeWebhook,
  paypalCreateOrder,
  paypalCaptureOrder,
} = require('../controllers/supportController');

router.get('/config', getPublicConfig);
router.post('/create-subscription-session', createSubscriptionSession);
router.post('/create-donation-session', createDonationSession);

router.post('/paypal/create-order', paypalCreateOrder);
router.post('/paypal/capture-order', paypalCaptureOrder);
// NOTE: the Stripe webhook route itself is mounted separately in server.js
// (before express.json()) because Stripe requires the RAW request body to
// verify the signature. See server.js for `/api/support/webhook`.
module.exports = router;
module.exports.stripeWebhook = stripeWebhook;
