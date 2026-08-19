const cron = require('node-cron');
const { cronSchedule, timezone } = require('./config');
const { sendMonthlyReport, isMailConfigured } = require('./mailer');
const { listEntriesForMonth } = require('./db');

function previousMonthKey(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based; -1 gives previous month directly
  const prev = new Date(year, month - 1, 1);
  const y = prev.getFullYear();
  const m = String(prev.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function start() {
  if (!isMailConfigured()) {
    console.warn(
      '[scheduler] SMTP/recipient not configured (.env) - monthly email is disabled until you set it up.'
    );
    return null;
  }

  const task = cron.schedule(
    cronSchedule,
    async () => {
      const month = previousMonthKey(new Date());
      try {
        const entries = listEntriesForMonth(month);
        await sendMonthlyReport(month, entries);
        console.log(`[scheduler] Monthly report for ${month} emailed successfully.`);
      } catch (err) {
        console.error(`[scheduler] Failed to send monthly report for ${month}:`, err.message);
      }
    },
    { timezone }
  );

  console.log(`[scheduler] Monthly email scheduled (cron "${cronSchedule}", timezone ${timezone}).`);
  return task;
}

module.exports = { start, previousMonthKey };
