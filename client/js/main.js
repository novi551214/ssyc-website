// ==========================================================================
// main.js — shared behavior across every page (nav, fade-ins, popup, footer form)
// ==========================================================================

const API_BASE = window.location.origin; // backend + frontend served from same origin

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initFadeIns();
  initNewsletterPopup();
  initFooterNewsletterForm();
  markActiveNavLink();
});

/* --- Mobile nav toggle --- */
function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
}

/* --- Highlight current page in nav --- */
function markActiveNavLink() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
}

/* --- Fade elements in as they scroll into view --- */
function initFadeIns() {
  const items = document.querySelectorAll('.fade-in');
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(el => observer.observe(el));
}

/* --- Newsletter popup: appears 5s after page load, once per session --- */
function initNewsletterPopup() {
  const overlay = document.getElementById('newsletterModal');
  if (!overlay) return;

  const alreadyShown = sessionStorage.getItem('ssyc_popup_shown');
  if (!alreadyShown) {
    setTimeout(() => {
      overlay.classList.add('open');
      sessionStorage.setItem('ssyc_popup_shown', '1');
    }, 5000);
  }

  overlay.querySelector('.modal-close')?.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  const form = document.getElementById('popupNewsletterForm');
  if (form) form.addEventListener('submit', (e) => handleNewsletterSubmit(e, form, overlay));
}

/* --- Footer newsletter form (separate instance of the same handler) --- */
function initFooterNewsletterForm() {
  const form = document.getElementById('footerNewsletterForm');
  if (form) form.addEventListener('submit', (e) => handleNewsletterSubmit(e, form));
}

async function handleNewsletterSubmit(e, form, overlayToClose) {
  e.preventDefault();
  const emailInput = form.querySelector('input[type="email"]');
  const msgEl = form.querySelector('.form-msg');
  const btn = form.querySelector('button[type="submit"]');
  const email = emailInput.value.trim();

  setMsg(msgEl, '');
  btn.disabled = true;
  btn.textContent = 'Subscribing...';

  try {
    const res = await fetch(`${API_BASE}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok) {
      setMsg(msgEl, data.message || "You're subscribed! Welcome to the fam.", 'success');
      form.reset();
      if (overlayToClose) setTimeout(() => overlayToClose.classList.remove('open'), 1800);
    } else {
      setMsg(msgEl, data.message || 'Something went wrong. Try again.', 'error');
    }
  } catch (err) {
    setMsg(msgEl, 'Network error — please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Subscribe';
  }
}

function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = 'form-msg' + (type ? ` ${type}` : '');
  el.style.display = text ? 'block' : 'none';
}
