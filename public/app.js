const monthInput = document.getElementById('month');
const tableBody = document.getElementById('tableBody');
const statusEl = document.getElementById('status');

let rates = { shiftPerDay: 250, transportPerDay: 300, onCallPerDay: 750 };
let shiftTypes = [];

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;
}

function showStatus(message, ok = true) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = `status ${ok ? 'ok' : 'err'}`;
  setTimeout(() => { statusEl.hidden = true; }, 4000);
}

async function api(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function computeRow(entry) {
  const daysPresent = Number(entry.daysPresent) || 0;
  const transportDays = Number(entry.transportDays) || 0;
  const onCallDays = Number(entry.onCallDays) || 0;
  const shiftAmount = daysPresent * rates.shiftPerDay;
  const transportAmount = transportDays * rates.transportPerDay;
  const onCallAmount = onCallDays * rates.onCallPerDay;
  return { shiftAmount, transportAmount, onCallAmount, total: shiftAmount + transportAmount + onCallAmount };
}

function recalcTotals() {
  let totals = { daysPresent: 0, transportDays: 0, onCallDays: 0, shiftAmount: 0, transportAmount: 0, onCallAmount: 0, total: 0 };
  for (const row of tableBody.querySelectorAll('tr')) {
    const entry = readRow(row);
    const computed = computeRow(entry);
    totals.daysPresent += Number(entry.daysPresent) || 0;
    totals.transportDays += Number(entry.transportDays) || 0;
    totals.onCallDays += Number(entry.onCallDays) || 0;
    totals.shiftAmount += computed.shiftAmount;
    totals.transportAmount += computed.transportAmount;
    totals.onCallAmount += computed.onCallAmount;
    totals.total += computed.total;
  }
  document.getElementById('totalDaysPresent').textContent = totals.daysPresent;
  document.getElementById('totalTransportDays').textContent = totals.transportDays;
  document.getElementById('totalOnCallDays').textContent = totals.onCallDays;
  document.getElementById('totalShiftAmount').textContent = money(totals.shiftAmount);
  document.getElementById('totalTransportAmount').textContent = money(totals.transportAmount);
  document.getElementById('totalOnCallAmount').textContent = money(totals.onCallAmount);
  document.getElementById('totalAmount').textContent = money(totals.total);
}

function readRow(row) {
  return {
    id: row.dataset.id || null,
    employeeName: row.querySelector('.f-name').value.trim(),
    employeeId: row.querySelector('.f-empid').value.trim(),
    daysPresent: row.querySelector('.f-days').value,
    transportDays: row.querySelector('.f-transport').value,
    onCallDays: row.querySelector('.f-oncall').value,
    shiftType: row.querySelector('.f-shifttype').value,
    remark: row.querySelector('.f-remark').value,
  };
}

function updateComputedCells(row) {
  const entry = readRow(row);
  const c = computeRow(entry);
  row.querySelector('.c-shift').textContent = money(c.shiftAmount);
  row.querySelector('.c-transport').textContent = money(c.transportAmount);
  row.querySelector('.c-oncall').textContent = money(c.onCallAmount);
  row.querySelector('.c-total').textContent = money(c.total);
  recalcTotals();
}

async function persistRow(row) {
  const entry = readRow(row);
  if (!entry.employeeName) return; // nothing to save yet

  try {
    if (entry.id) {
      await api(`/entries/${entry.id}`, { method: 'PUT', body: JSON.stringify(entry) });
    } else {
      const created = await api('/entries', {
        method: 'POST',
        body: JSON.stringify({ ...entry, month: monthInput.value }),
      });
      row.dataset.id = created.id;
    }
  } catch (err) {
    showStatus(err.message, false);
  }
}

function shiftTypeOptions(selected) {
  const opts = ['<option value="">-</option>']
    .concat(shiftTypes.map((t) => `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`));
  return opts.join('');
}

function buildRow(entry) {
  const row = document.createElement('tr');
  if (entry.id) row.dataset.id = entry.id;
  row.innerHTML = `
    <td><input class="f-name" type="text" value="${entry.employeeName || ''}" placeholder="Employee name" /></td>
    <td><input class="f-empid" type="text" value="${entry.employeeId || ''}" placeholder="Employee ID" /></td>
    <td><input class="f-days num-input" type="number" min="0" max="31" value="${entry.daysPresent || 0}" /></td>
    <td><input class="f-transport num-input" type="number" min="0" max="31" value="${entry.transportDays || 0}" /></td>
    <td><input class="f-oncall num-input" type="number" min="0" max="31" value="${entry.onCallDays || 0}" /></td>
    <td><select class="f-shifttype">${shiftTypeOptions(entry.shiftType)}</select></td>
    <td class="amount-cell c-shift">${money(0)}</td>
    <td class="amount-cell c-transport">${money(0)}</td>
    <td class="amount-cell c-oncall">${money(0)}</td>
    <td class="amount-cell c-total"><strong>${money(0)}</strong></td>
    <td><input class="f-remark" type="text" value="${entry.remark || ''}" placeholder="Remark for On-Call" /></td>
    <td><button class="danger-link" type="button">Remove</button></td>
  `;

  row.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('input', () => updateComputedCells(row));
    el.addEventListener('change', () => persistRow(row));
  });

  row.querySelector('button.danger-link').addEventListener('click', async () => {
    const id = row.dataset.id;
    row.remove();
    recalcTotals();
    if (id) {
      try {
        await api(`/entries/${id}`, { method: 'DELETE' });
      } catch (err) {
        showStatus(err.message, false);
      }
    }
  });

  tableBody.appendChild(row);
  updateComputedCells(row);
  return row;
}

async function loadConfig() {
  const cfg = await api('/config');
  rates = cfg.rates;
  shiftTypes = cfg.shiftTypes;
  document.getElementById('rateShift').textContent = rates.shiftPerDay;
  document.getElementById('rateTransport').textContent = rates.transportPerDay;
  document.getElementById('rateOnCall').textContent = rates.onCallPerDay;
}

async function loadMonth() {
  tableBody.innerHTML = '';
  const data = await api(`/entries?month=${monthInput.value}`);
  data.rows.forEach(buildRow);
  recalcTotals();
}

document.getElementById('addRowBtn').addEventListener('click', () => {
  buildRow({});
});

document.getElementById('copyPrevBtn').addEventListener('click', async () => {
  const fromMonth = previousMonthKey(monthInput.value);
  try {
    const result = await api('/entries/copy', {
      method: 'POST',
      body: JSON.stringify({ fromMonth, toMonth: monthInput.value }),
    });
    if (result.skipped) {
      showStatus('This month already has entries; nothing was copied.', false);
    } else {
      showStatus(`Copied ${result.copied} employee(s) from ${fromMonth}.`);
      await loadMonth();
    }
  } catch (err) {
    showStatus(err.message, false);
  }
});

document.getElementById('sendEmailBtn').addEventListener('click', async () => {
  try {
    await api('/send-email', { method: 'POST', body: JSON.stringify({ month: monthInput.value }) });
    showStatus('Email sent successfully.');
  } catch (err) {
    showStatus(err.message, false);
  }
});

monthInput.addEventListener('change', loadMonth);

(async function init() {
  monthInput.value = currentMonthKey();
  await loadConfig();
  await loadMonth();
})();
