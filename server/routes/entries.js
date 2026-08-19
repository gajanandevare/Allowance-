const express = require('express');
const db = require('../db');
const { withTotals } = require('../calculate');
const { sendMonthlyReport } = require('../mailer');
const { rates, shiftTypes } = require('../config');

const router = express.Router();
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidMonth(month) {
  return typeof month === 'string' && MONTH_RE.test(month);
}

router.get('/config', (req, res) => {
  res.json({ rates, shiftTypes });
});

router.get('/months', (req, res) => {
  res.json({ months: db.listMonths() });
});

router.get('/entries', (req, res) => {
  const { month } = req.query;
  if (!isValidMonth(month)) return res.status(400).json({ error: 'A valid month (YYYY-MM) is required' });
  const entries = db.listEntriesForMonth(month);
  res.json(withTotals(entries));
});

router.post('/entries', (req, res) => {
  const { month } = req.body;
  if (!isValidMonth(month)) return res.status(400).json({ error: 'A valid month (YYYY-MM) is required' });
  if (!req.body.employeeName || !String(req.body.employeeName).trim()) {
    return res.status(400).json({ error: 'Employee name is required' });
  }
  const entry = db.createEntry(req.body);
  res.status(201).json(entry);
});

router.put('/entries/:id', (req, res) => {
  const updated = db.updateEntry(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Entry not found' });
  res.json(updated);
});

router.delete('/entries/:id', (req, res) => {
  const ok = db.deleteEntry(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Entry not found' });
  res.status(204).end();
});

router.post('/entries/copy', (req, res) => {
  const { fromMonth, toMonth } = req.body;
  if (!isValidMonth(fromMonth) || !isValidMonth(toMonth)) {
    return res.status(400).json({ error: 'Both fromMonth and toMonth (YYYY-MM) are required' });
  }
  const result = db.copyMonthRoster(fromMonth, toMonth);
  res.json(result);
});

router.post('/send-email', async (req, res) => {
  const month = isValidMonth(req.body.month) ? req.body.month : null;
  if (!month) return res.status(400).json({ error: 'A valid month (YYYY-MM) is required' });
  try {
    const entries = db.listEntriesForMonth(month);
    const info = await sendMonthlyReport(month, entries);
    res.json({ sent: true, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
