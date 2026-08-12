// ==========================================================================
// countdown.js — live countdown to the next weekly gathering
// The exact time/sport for each week is announced in the WhatsApp group
// every Friday. These constants are placeholder default times so the
// countdown always has something to point to — update them to match your
// actual usual start times, or wire this up to pull from the group each week.
// ==========================================================================

const FRIDAY_HOUR = 20;   // 8:00 PM default — adjust to your usual Friday start time
const FRIDAY_MINUTE = 0;
const SATURDAY_HOUR = 16; // 4:00 PM default — adjust to your usual Saturday start time
const SATURDAY_MINUTE = 0;

function getNextGathering() {
  const now = new Date();
  const candidates = [];

  // Build candidate Date objects for the next 8 days and pick the closest future one
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const day = d.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat

    if (day === 5) {
      d.setHours(FRIDAY_HOUR, FRIDAY_MINUTE, 0, 0);
      candidates.push({ date: d, label: 'Friday Hangout' });
    }
    if (day === 6) {
      d.setHours(SATURDAY_HOUR, SATURDAY_MINUTE, 0, 0);
      candidates.push({ date: d, label: 'Saturday Hangout' });
    }
  }

  const future = candidates.filter(c => c.date.getTime() > now.getTime());
  future.sort((a, b) => a.date - b.date);
  return future[0];
}

function tickCountdown() {
  const numEls = {
    days: document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    minutes: document.querySelector('[data-cd="minutes"]'),
    seconds: document.querySelector('[data-cd="seconds"]'),
  };
  const noteEl = document.querySelector('[data-cd="note"]');
  if (!numEls.days) return; // countdown not on this page

  const next = getNextGathering();
  if (!next) return;

  const diff = next.date.getTime() - Date.now();
  if (diff <= 0) {
    if (noteEl) noteEl.textContent = "We're gathering right now — come through!";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  numEls.days.textContent = String(days).padStart(2, '0');
  numEls.hours.textContent = String(hours).padStart(2, '0');
  numEls.minutes.textContent = String(minutes).padStart(2, '0');
  numEls.seconds.textContent = String(seconds).padStart(2, '0');
  if (noteEl) noteEl.textContent = `Next up: ${next.label}, outside Masjid-e-Ali`;
}

document.addEventListener('DOMContentLoaded', () => {
  tickCountdown();
  setInterval(tickCountdown, 1000);
});
