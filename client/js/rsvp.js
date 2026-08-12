// ==========================================================================
// rsvp.js — handles all "RSVP" forms on the Events page (one per event card)
// Each form has data-event-id, data-event-title identifying which gathering.
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.rsvp-form').forEach(form => {
    form.addEventListener('submit', handleRsvpSubmit);
  });
});

async function handleRsvpSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const msgEl = form.querySelector('.form-msg');
  const originalBtnText = btn.textContent;

  const payload = {
    eventId: form.dataset.eventId,
    eventTitle: form.dataset.eventTitle,
    name: form.querySelector('[name="name"]').value.trim(),
    email: form.querySelector('[name="email"]').value.trim(),
    phone: form.querySelector('[name="phone"]').value.trim(),
  };

  setMsg(msgEl, '');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch(`${window.location.origin}/api/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      setMsg(msgEl, `You're on the list for ${payload.eventTitle}! See you there.`, 'success');
      form.reset();
    } else {
      setMsg(msgEl, data.message || 'Could not submit RSVP. Please try again.', 'error');
    }
  } catch (err) {
    setMsg(msgEl, 'Network error — please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalBtnText;
  }
}

function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (type ? ` ${type}` : '');
  el.style.display = text ? 'block' : 'none';
}
