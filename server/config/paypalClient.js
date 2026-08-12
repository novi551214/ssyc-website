// Minimal PayPal REST API v2 helper (Orders API) using native fetch (Node 18+).
// Docs: https://developer.paypal.com/api/rest/

function getBaseUrl() {
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId.includes('sandbox_client_id_xxxx')) {
    throw new Error('PayPal credentials are not configured yet (.env placeholders detected).');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Failed to authenticate with PayPal.');
  const data = await res.json();
  return data.access_token;
}

async function createOrder(amountUsd) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description: 'SSYC one-time donation',
          amount: { currency_code: 'USD', value: Number(amountUsd).toFixed(2) },
        },
      ],
    }),
  });
  if (!res.ok) throw new Error('Failed to create PayPal order.');
  return res.json();
}

async function captureOrder(orderId) {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to capture PayPal order.');
  return res.json();
}

module.exports = { getAccessToken, createOrder, captureOrder, getBaseUrl };
