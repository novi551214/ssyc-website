// ==========================================================================
// support.js — monthly tiers through Stripe and one-time donations through
// Stripe Checkout or a server-created/captured PayPal order.
// ==========================================================================

let PUBLIC_CONFIG = null; // { stripePublishableKey, paypalClientId }
let selectedAmount = 20;  // default one-time donation amount

document.addEventListener('DOMContentLoaded', async () => {
  await loadPublicConfig();
  initTierButtons();
  initAmountToggle();
  initCustomAmountInput();
  initOneTimeStripeButton();
  loadPayPalSdkAndRenderButtons();
});

/* --- Fetch publishable keys from the backend (never hardcode secrets client-side) --- */
async function loadPublicConfig() {
  try {
    const res = await fetch(`${window.location.origin}/api/support/config`);
    PUBLIC_CONFIG = await res.json();
  } catch (err) {
    console.error('Failed to load payment config', err);
  }
}

/* --- Monthly tier buttons -> create a Stripe Checkout subscription session --- */
function initTierButtons() {
  document.querySelectorAll('.tier-subscribe-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tier = btn.dataset.tier; // "friend" | "supporter" | "patron"
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Redirecting...';

      try {
        const res = await fetch(`${window.location.origin}/api/support/create-subscription-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier })
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url; // redirect to Stripe-hosted Checkout
        } else {
          alert(data.message || 'Could not start checkout. Please try again.');
        }
      } catch (err) {
        alert('Network error — please try again.');
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });
}

/* --- Preset amount buttons for one-time donation --- */
function initAmountToggle() {
  const buttons = document.querySelectorAll('.amount-btn');
  const customInput = document.getElementById('customAmount');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = Number(btn.dataset.amount);
      if (customInput) customInput.value = '';
    });
  });
}

function initCustomAmountInput() {
  const customInput = document.getElementById('customAmount');
  if (!customInput) return;
  customInput.addEventListener('input', () => {
    const val = Number(customInput.value);
    if (val > 0) {
      selectedAmount = val;
      document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    }
  });
}

/* --- One-time donation via Stripe Checkout --- */
function initOneTimeStripeButton() {
  const btn = document.getElementById('donateStripeBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (!selectedAmount || selectedAmount <= 0) {
      alert('Please choose or enter a donation amount.');
      return;
    }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Redirecting...';

    try {
      const res = await fetch(`${window.location.origin}/api/support/create-donation-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedAmount })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || 'Could not start checkout. Please try again.');
      }
    } catch (err) {
      alert('Network error — please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

/* --- PayPal Smart Buttons (sandbox) for both one-time and recurring --- */
function loadPayPalSdkAndRenderButtons() {
  const waitForConfig = setInterval(() => {
    if (!PUBLIC_CONFIG) return;
    clearInterval(waitForConfig);

    if (!PUBLIC_CONFIG.paypalClientId) {
      console.warn('PayPal client ID not configured — skipping PayPal buttons.');
      return;
    }

    // One-time donation PayPal button
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PUBLIC_CONFIG.paypalClientId}&currency=USD&intent=capture`;
    script.onload = renderOneTimePayPalButton;
    document.body.appendChild(script);

  }, 150);
}

function renderOneTimePayPalButton() {
  const container = document.getElementById('paypal-donate-button');
  if (!container || !window.paypal) return;

  window.paypal.Buttons({
    style: { layout: 'horizontal', color: 'black', shape: 'pill', label: 'donate', height: 45 },
    createOrder: async () => {
      const res = await fetch(`${window.location.origin}/api/support/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedAmount })
      });
      const order = await res.json();
      return order.id;
    },
    onApprove: async (data) => {
      const res = await fetch(`${window.location.origin}/api/support/paypal/capture-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: data.orderID })
      });
      const result = await res.json();
      if (result.status === 'COMPLETED') {
        alert('Thank you for your donation! JazakAllah khair.');
      }
    },
    onError: (err) => {
      console.error('PayPal error', err);
      alert('Something went wrong with PayPal. Please try again.');
    }
  }).render('#paypal-donate-button');
}
