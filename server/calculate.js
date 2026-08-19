const { rates } = require('./config');

function withAmounts(entry) {
  const shiftAmount = entry.daysPresent * rates.shiftPerDay;
  const transportAmount = entry.transportDays * rates.transportPerDay;
  const onCallAmount = entry.onCallDays * rates.onCallPerDay;
  return {
    ...entry,
    shiftAmount,
    transportAmount,
    onCallAmount,
    total: shiftAmount + transportAmount + onCallAmount,
  };
}

function withTotals(entries) {
  const rows = entries.map(withAmounts);
  const totals = rows.reduce(
    (acc, r) => ({
      daysPresent: acc.daysPresent + r.daysPresent,
      transportDays: acc.transportDays + r.transportDays,
      onCallDays: acc.onCallDays + r.onCallDays,
      shiftAmount: acc.shiftAmount + r.shiftAmount,
      transportAmount: acc.transportAmount + r.transportAmount,
      onCallAmount: acc.onCallAmount + r.onCallAmount,
      total: acc.total + r.total,
    }),
    { daysPresent: 0, transportDays: 0, onCallDays: 0, shiftAmount: 0, transportAmount: 0, onCallAmount: 0, total: 0 }
  );
  return { rows, totals };
}

module.exports = { withAmounts, withTotals };
