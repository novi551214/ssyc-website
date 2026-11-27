document.getElementById('adminLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  const message = form.querySelector('.form-msg');

  button.disabled = true;
  button.textContent = 'Logging in...';
  message.style.display = 'none';

  try {
    const response = await fetch(`${window.location.origin}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value }),
    });
    const data = await response.json();
    if (response.ok) {
      window.location.href = 'admin-dashboard.html';
      return;
    }
    message.textContent = data.message || 'Invalid credentials.';
    message.className = 'form-msg error';
    message.style.display = 'block';
  } catch {
    message.textContent = 'Network error — please try again.';
    message.className = 'form-msg error';
    message.style.display = 'block';
  } finally {
    button.disabled = false;
    button.textContent = 'Log In';
  }
});
