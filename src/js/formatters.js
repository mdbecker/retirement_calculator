function formatMoney(n) {
  if (n == null || isNaN(n)) return '–';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatPct(x) {
  if (x == null || isNaN(x)) return '–';
  return (x * 100).toFixed(1) + '%';
}

App.formatMoney = formatMoney;
App.formatPct = formatPct;
