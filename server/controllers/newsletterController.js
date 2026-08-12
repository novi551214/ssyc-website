const Subscriber = require('../models/Subscriber');

exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Save locally first (source of truth for our own admin dashboard)
    let subscriber = await Subscriber.findOne({ email: normalizedEmail });
    if (!subscriber) {
      subscriber = await Subscriber.create({ email: normalizedEmail, source: 'website' });
    }

    // Push to Mailchimp (best-effort — don't fail the request if Mailchimp errors)
    const mailchimpResult = await pushToMailchimp(normalizedEmail);
    if (mailchimpResult.ok) {
      subscriber.mailchimpSynced = true;
      await subscriber.save();
    } else {
      console.warn('[newsletter] Mailchimp sync failed:', mailchimpResult.error);
    }

    res.json({ message: "You're subscribed! Welcome to the SSYC community." });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    res.status(500).json({ message: 'Could not subscribe right now. Please try again.' });
  }
};

async function pushToMailchimp(email) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !serverPrefix || !audienceId || apiKey.includes('xxxx')) {
    // Not configured yet — treat as a no-op so local dev / demo still works
    return { ok: false, error: 'Mailchimp not configured (using placeholder keys).' };
  }

  try {
    const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Mailchimp accepts any string as the username; "anystring" is the convention
        Authorization: 'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64'),
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed', // use 'pending' if you want double opt-in
      }),
    });

    if (response.ok) return { ok: true };

    const errorBody = await response.json().catch(() => ({}));
    // "Member Exists" is not really an error for our purposes
    if (errorBody.title === 'Member Exists') return { ok: true };

    return { ok: false, error: errorBody.detail || response.statusText };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
