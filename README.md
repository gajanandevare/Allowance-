# SAP Shift Allowance Tracker

A small web app that replaces the monthly Excel sheet used to track SAP team
shift, transport, and on-call allowance. The team fills in a table on a web
page each month; the app calculates the amounts automatically and, at the
start of every month, emails a summary of the completed month to you.

## Columns / calculation

Matches the existing Excel sheet:

| Column | Meaning |
|---|---|
| Employee Name / Employee ID | who the row is for |
| Days Present | days worked in the month |
| Transport Days | days transport allowance applies |
| On-Call Days | number of on-call days |
| Shift Type | optional note: `250 Shift 2pm to 11pm` or `400 Shift 6pm to 3am` |
| Remark (On-Call) | free text, e.g. reason for on-call |

Amounts are derived, not entered by hand:

- Shift Allowance = Days Present x 250
- Transport Allowance = Transport Days x 300
- On-Call Allowance = On-Call Days x 750

Rates live in `.env` (`RATE_SHIFT_PER_DAY`, `RATE_TRANSPORT_PER_DAY`,
`RATE_ONCALL_PER_DAY`) so they can be changed without touching code.

A **Month** field was added (the sheet's original ask) - every entry is
stored against a `YYYY-MM` month, so past months stay intact and the UI has
a month picker at the top.

## Running it

```bash
npm install
cp .env.example .env   # then fill in SMTP + RECIPIENT_EMAIL, see below
npm start
```

Open `http://localhost:3000`. Pick a month, click **+ Add Employee** for each
row (or **Copy Employees from Previous Month** to carry the roster forward),
fill in the numbers - each row saves automatically as you edit it.

## Monthly email

On the 1st of every month (09:00 by default, `CRON_SCHEDULE` in `.env`), the
server emails a table of the previous month's entries and totals to
`RECIPIENT_EMAIL`. If nothing was filled in for that month, it sends a
reminder instead of a blank report.

You can also click **Send Email Now** in the UI to send the current month's
data immediately (useful for testing your SMTP setup).

### SMTP setup

Fill these in `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=your-account@gmail.com
RECIPIENT_EMAIL=the-address-that-should-receive-reports@example.com
```

For Gmail you need an **App Password** (not your normal login password):
Google Account -> Security -> 2-Step Verification -> App passwords. Any
other SMTP provider (Outlook, your company mail server, SendGrid, etc.)
works the same way - just point `SMTP_HOST`/`SMTP_PORT` at it.

`.env` is gitignored - never commit real credentials.

### Important: the server must stay running for the email to fire

The monthly email is a `node-cron` job inside this same server process. It
only fires if the app is running at that moment, so for the automation to
actually work you need to host it somewhere that stays up continuously,
for example:

- a small always-on VM/VPS with `pm2 start server/index.js` (or a systemd
  service) so it restarts on crash/reboot,
- or a platform like Render/Railway/Fly.io with the free/hobby web-service
  tier (make sure "sleep on idle" is disabled, or use their own cron/scheduled-job
  feature to hit `POST /api/send-email` instead of relying on this in-process
  cron).

Running it only on your laptop when you happen to have it open will not
reliably trigger the start-of-month email.

## Data storage

Entries are stored in `data/allowance-data.json` (gitignored - it's your
team's data, not source code). Back this file up periodically if you care
about history; there's no database dependency to install.

## API

All under `/api`:

- `GET /entries?month=YYYY-MM` - list entries + computed totals for a month
- `POST /entries` - create an entry `{ month, employeeName, employeeId, daysPresent, transportDays, onCallDays, shiftType, remark }`
- `PUT /entries/:id` - update an entry
- `DELETE /entries/:id` - delete an entry
- `POST /entries/copy` - `{ fromMonth, toMonth }` copy the employee roster (names/IDs only) into a new month
- `GET /months` - list months that have data
- `GET /config` - current rates + shift type options
- `POST /send-email` - `{ month }` send the report for that month immediately
