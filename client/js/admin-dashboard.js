const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
  if (!(await checkAuth())) {
    window.location.href = 'admin-login.html';
    return;
  }
  await Promise.all([
    loadTable('/api/admin/rsvps', 'rsvpTableBody', 'statRsvps', ['name', 'email', 'phone', 'eventTitle', 'createdAt']),
    loadTable('/api/admin/subscribers', 'subscriberTableBody', 'statSubscribers', ['email', 'createdAt']),
    loadTable('/api/admin/transactions', 'transactionTableBody', 'statTransactions', ['type', 'tierOrAmount', 'email', 'provider', 'status', 'createdAt']),
  ]);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  window.location.href = 'admin-login.html';
});

async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
    if (!response.ok) return false;
    const data = await response.json();
    document.getElementById('adminName').textContent = data.email ? `, ${data.email}` : '';
    return true;
  } catch {
    return false;
  }
}

function displayValue(row, key) {
  if (key === 'createdAt') return row.createdAt ? new Date(row.createdAt).toLocaleString() : '—';
  if (key === 'tierOrAmount') return row.tier || (Number.isFinite(row.amount) ? `$${row.amount}` : '—');
  return row[key] ?? '—';
}

async function loadTable(path, bodyId, countId, columns) {
  const body = document.getElementById(bodyId);
  try {
    const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Request failed.');
    const rows = await response.json();
    document.getElementById(countId).textContent = rows.length;
    body.replaceChildren();
    if (rows.length === 0) {
      const cell = document.createElement('td');
      cell.colSpan = columns.length;
      cell.textContent = 'No records yet.';
      const tableRow = document.createElement('tr');
      tableRow.appendChild(cell);
      body.appendChild(tableRow);
      return;
    }
    for (const row of rows) {
      const tableRow = document.createElement('tr');
      for (const column of columns) {
        const cell = document.createElement('td');
        cell.textContent = String(displayValue(row, column));
        tableRow.appendChild(cell);
      }
      body.appendChild(tableRow);
    }
  } catch {
    body.replaceChildren();
    const cell = document.createElement('td');
    cell.colSpan = columns.length;
    cell.textContent = 'Unable to load records.';
    const tableRow = document.createElement('tr');
    tableRow.appendChild(cell);
    body.appendChild(tableRow);
  }
}
