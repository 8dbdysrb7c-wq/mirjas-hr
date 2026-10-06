// Display allocation of a monthly deduction, preserving its rounded total.
export const distributePreviewAmount = (rows, total, weight = () => 1) => {
  if (!rows.length) return [];
  const cents = Math.max(0, Math.round((Number(total) || 0) * 100));
  const weights = rows.map(row => Math.max(0, Number(weight(row)) || 0));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const shares = weights.map(value => cents * (weightTotal ? value / weightTotal : 1 / rows.length));
  const allocations = shares.map(Math.floor);
  let remainder = cents - allocations.reduce((sum, value) => sum + value, 0);
  const order = shares.map((share, index) => ({ index, fraction: share - allocations[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index++) allocations[order[index % order.length].index]++;
  return rows.map((row, index) => ({ ...row, amount: allocations[index] / 100 }));
};
