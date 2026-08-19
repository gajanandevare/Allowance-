require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,

  // Allowance rates (INR per unit). Kept in one place so a rate change
  // doesn't require touching calculation logic anywhere else.
  rates: {
    shiftPerDay: Number(process.env.RATE_SHIFT_PER_DAY || 250),
    transportPerDay: Number(process.env.RATE_TRANSPORT_PER_DAY || 300),
    onCallPerDay: Number(process.env.RATE_ONCALL_PER_DAY || 750),
  },

  shiftTypes: [
    '250 Shift 2pm to 11pm',
    '400 Shift 6pm to 3am',
  ],

  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.FROM_EMAIL || process.env.SMTP_USER || '',
    to: process.env.RECIPIENT_EMAIL || '',
  },

  // Cron expression for the monthly email. Default: 9:00 AM on the 1st of every month.
  cronSchedule: process.env.CRON_SCHEDULE || '0 9 1 * *',
  timezone: process.env.TZ_NAME || 'Asia/Kolkata',
};
