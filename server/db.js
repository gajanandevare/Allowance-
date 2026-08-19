const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'allowance-data.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: [] }, null, 2));
}

function readAll() {
  ensureStore();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return { entries: [] };
  }
}

function writeAll(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function listMonths() {
  const { entries } = readAll();
  const months = new Set(entries.map((e) => e.month));
  return Array.from(months).sort();
}

function listEntriesForMonth(month) {
  const { entries } = readAll();
  return entries
    .filter((e) => e.month === month)
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

function createEntry(entry) {
  const data = readAll();
  const newEntry = {
    id: randomUUID(),
    month: entry.month,
    employeeName: entry.employeeName || '',
    employeeId: entry.employeeId || '',
    daysPresent: Number(entry.daysPresent) || 0,
    transportDays: Number(entry.transportDays) || 0,
    onCallDays: Number(entry.onCallDays) || 0,
    shiftType: entry.shiftType || '',
    remark: entry.remark || '',
  };
  data.entries.push(newEntry);
  writeAll(data);
  return newEntry;
}

function updateEntry(id, updates) {
  const data = readAll();
  const idx = data.entries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const existing = data.entries[idx];
  const merged = {
    ...existing,
    ...updates,
    daysPresent: updates.daysPresent !== undefined ? Number(updates.daysPresent) || 0 : existing.daysPresent,
    transportDays: updates.transportDays !== undefined ? Number(updates.transportDays) || 0 : existing.transportDays,
    onCallDays: updates.onCallDays !== undefined ? Number(updates.onCallDays) || 0 : existing.onCallDays,
  };
  data.entries[idx] = merged;
  writeAll(data);
  return merged;
}

function deleteEntry(id) {
  const data = readAll();
  const before = data.entries.length;
  data.entries = data.entries.filter((e) => e.id !== id);
  writeAll(data);
  return data.entries.length !== before;
}

function copyMonthRoster(fromMonth, toMonth) {
  const data = readAll();
  const alreadyHasEntries = data.entries.some((e) => e.month === toMonth);
  if (alreadyHasEntries) return { copied: 0, skipped: true };

  const source = data.entries.filter((e) => e.month === fromMonth);
  const copies = source.map((e) => ({
    id: randomUUID(),
    month: toMonth,
    employeeName: e.employeeName,
    employeeId: e.employeeId,
    daysPresent: 0,
    transportDays: 0,
    onCallDays: 0,
    shiftType: '',
    remark: '',
  }));
  data.entries.push(...copies);
  writeAll(data);
  return { copied: copies.length, skipped: false };
}

module.exports = {
  listMonths,
  listEntriesForMonth,
  createEntry,
  updateEntry,
  deleteEntry,
  copyMonthRoster,
};
