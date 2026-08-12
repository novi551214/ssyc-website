// ==========================================================================
// contact.js — handles the Contact Us form submission
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  if (form) form.addEventListener('submit', handleContactSubmit);
});

async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const msgEl = form.querySelector('.form-msg');
  const originalText = btn.textContent;

  const payload = {
    name: form.querySelector('[name="name"]').value.trim(),
    email: form.querySelector('[name="email"]').value.trim(),
    message: form.querySelector('[name="message"]').value.trim(),
  };

  setMsg(msgEl, '');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await fetch(`${window.location.origin}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      setMsg(msgEl, "Message sent! We'll get back to you soon, insha'Allah.", 'success');
      form.reset();
    } else {
      setMsg(msgEl, data.message || 'Could not send message. Please try again.', 'error');
    }
  } catch (err) {
    setMsg(msgEl, 'Network error — please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (type ? ` ${type}` : '');
  el.style.display = text ? 'block' : 'none';
}
