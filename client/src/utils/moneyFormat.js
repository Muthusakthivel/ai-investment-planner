/** Indian locale grouping (e.g. 10,00,000) */
export function formatEnIN(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num === 0) return '';
  return num.toLocaleString('en-IN');
}

export function parseMoneyDigits(s) {
  const d = String(s).replace(/\D/g, '');
  if (d === '') return 0;
  const n = Number(d);
  return Number.isFinite(n) ? Math.min(n, 1e15) : 0;
}
