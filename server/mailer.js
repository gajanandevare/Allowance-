const nodemailer = require('nodemailer');
const { mail } = require('./config');
const { withTotals } = require('./calculate');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMonth(month) {
  const [year, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

function isMailConfigured() {
  return Boolean(mail.host && mail.user && mail.pass && mail.to);
}

function buildTransport() {
  if (!isMailConfigured()) {
    throw new Error(
      'Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and RECIPIENT_EMAIL in .env'
    );
  }
  return nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure,
    auth: { user: mail.user, pass: mail.pass },
  });
}

function currency(n) {
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

function buildReportHtml(month, entries) {
  const label = formatMonth(month);

  if (entries.length === 0) {
    return `
      <p>No allowance entries have been filled in yet for <strong>${label}</strong>.</p>
      <p>Please ask the SAP team to fill in the allowance tracker for this month.</p>
    `;
  }

  const { rows, totals } = withTotals(entries);
  const rowsHtml = rows
    .map(
      (r) => `
        <tr>
          <td>${r.employeeName}</td>
          <td>${r.employeeId}</td>
          <td style="text-align:center">${r.daysPresent}</td>
          <td style="text-align:center">${r.transportDays}</td>
          <td style="text-align:center">${r.onCallDays}</td>
          <td style="text-align:right">${currency(r.shiftAmount)}</td>
          <td style="text-align:right">${currency(r.transportAmount)}</td>
          <td style="text-align:right">${currency(r.onCallAmount)}</td>
          <td style="text-align:right"><strong>${currency(r.total)}</strong></td>
          <td>${r.remark || ''}</td>
        </tr>`
    )
    .join('');

  return `
    <p>SAP shift allowance summary for <strong>${label}</strong>:</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;width:100%">
      <thead style="background:#f0f0f0">
        <tr>
          <th>Employee Name</th>
          <th>Employee ID</th>
          <th>Days Present</th>
          <th>Transport Days</th>
          <th>On-Call Days</th>
          <th>Shift Allowance</th>
          <th>Transport Allowance</th>
          <th>On-Call Allowance</th>
          <th>Total</th>
          <th>On-Call Remark</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr style="background:#f7f7f7;font-weight:bold">
          <td colspan="2">Total</td>
          <td style="text-align:center">${totals.daysPresent}</td>
          <td style="text-align:center">${totals.transportDays}</td>
          <td style="text-align:center">${totals.onCallDays}</td>
          <td style="text-align:right">${currency(totals.shiftAmount)}</td>
          <td style="text-align:right">${currency(totals.transportAmount)}</td>
          <td style="text-align:right">${currency(totals.onCallAmount)}</td>
          <td style="text-align:right">${currency(totals.total)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;
}

async function sendMonthlyReport(month, entries) {
  const transport = buildTransport();
  const label = formatMonth(month);
  const subject =
    entries.length === 0
      ? `Reminder: SAP shift allowance not filled for ${label}`
      : `SAP Shift Allowance Report - ${label}`;

  return transport.sendMail({
    from: mail.from,
    to: mail.to,
    subject,
    html: buildReportHtml(month, entries),
  });
}

module.exports = { sendMonthlyReport, isMailConfigured, formatMonth };
