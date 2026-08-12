const Stripe = require('stripe');
const Transaction = require('../models/Transaction');
const paypal = require('../config/paypalClient');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('xxxx')) {
    return null; // not configured yet
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const TIER_PRICE_ENV = {
  friend: 'STRIPE_PRICE_FRIEND',
  supporter: 'STRIPE_PRICE_SUPPORTER',
  patron: 'STRIPE_PRICE_PATRON',
};

/* GET /api/support/config — publishable/public keys only, never secrets */
exports.getPublicConfig = (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
  });
};

/* POST /api/support/create-subscription-session  { tier } */
exports.createSubscriptionSession = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env.' });
    }

    const { tier } = req.body;
    const priceEnvKey = TIER_PRICE_ENV[tier];
    const priceId = priceEnvKey && process.env[priceEnvKey];

    if (!priceId || priceId.includes('xxxx')) {
      return res.status(400).json({ message: `Stripe Price ID for "${tier}" is not configured yet.` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/support-success.html`,
      cancel_url: `${process.env.CLIENT_URL}/support-cancel.html`,
      metadata: { tier },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe subscription session error:', err);
    res.status(500).json({ message: 'Could not start checkout. Please try again.' });
  }
};

/* POST /api/support/create-donation-session  { amount } */
exports.createDonationSession = async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env.' });
    }

    const { amount } = req.body;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ message: 'Please provide a valid donation amount.' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'SSYC One-Time Donation' },
            unit_amount: Math.round(amountNum * 100), // cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/support-success.html`,
      cancel_url: `${process.env.CLIENT_URL}/support-cancel.html`,
      metadata: { type: 'donation', amount: String(amountNum) },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe donation session error:', err);
    res.status(500).json({ message: 'Could not start checkout. Please try again.' });
  }
};

/* POST /api/support/webhook — Stripe webhook (raw body required, see routes/support.js) */
exports.stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe not configured.');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email || null;

        if (session.mode === 'subscription') {
          await Transaction.create({
            type: 'subscription',
            tier: session.metadata?.tier || null,
            email: customerEmail,
            provider: 'stripe',
            providerRefId: session.subscription,
            status: 'active',
          });
        } else {
          await Transaction.create({
            type: 'donation',
            amount: Number(session.metadata?.amount) || (session.amount_total ? session.amount_total / 100 : null),
            email: customerEmail,
            provider: 'stripe',
            providerRefId: session.id,
            status: 'completed',
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await Transaction.findOneAndUpdate(
          { providerRefId: subscription.id },
          { status: 'canceled' }
        );
        break;
      }
      default:
        // Other event types are safely ignored for now
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error handling Stripe webhook:', err);
    res.status(500).send('Webhook handler error.');
  }
};

/* ---------------- PayPal ---------------- */

/* POST /api/support/paypal/create-order  { amount } */
exports.paypalCreateOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Please provide a valid donation amount.' });
    }
    const order = await paypal.createOrder(amount);
    res.json(order);
  } catch (err) {
    console.error('PayPal create order error:', err.message);
    res.status(503).json({ message: 'PayPal is not fully configured yet. Add real sandbox credentials to .env.' });
  }
};

/* POST /api/support/paypal/capture-order  { orderID } */
exports.paypalCaptureOrder = async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ message: 'orderID is required.' });

    const capture = await paypal.captureOrder(orderID);
    const payerEmail = capture.payer?.email_address || null;
    const amount = Number(
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
    ) || null;

    await Transaction.create({
      type: 'donation',
      amount,
      email: payerEmail,
      provider: 'paypal',
      providerRefId: orderID,
      status: capture.status === 'COMPLETED' ? 'completed' : capture.status,
    });

    res.json(capture);
  } catch (err) {
    console.error('PayPal capture order error:', err.message);
    res.status(503).json({ message: 'Could not capture PayPal payment.' });
  }
};

/* POST /api/support/paypal/subscription-confirmed  { subscriptionID, tier } */
exports.paypalSubscriptionConfirmed = async (req, res) => {
  try {
    const { subscriptionID, tier } = req.body;
    if (!subscriptionID || !tier) {
      return res.status(400).json({ message: 'subscriptionID and tier are required.' });
    }

    await Transaction.create({
      type: 'subscription',
      tier,
      provider: 'paypal',
      providerRefId: subscriptionID,
      status: 'active',
    });

    res.json({ message: 'Subscription logged.' });
  } catch (err) {
    console.error('PayPal subscription log error:', err);
    res.status(500).json({ message: 'Could not log subscription.' });
  }
};
