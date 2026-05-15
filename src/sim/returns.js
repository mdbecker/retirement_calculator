function buildPortfolioReturns(histStock, histBond, eqWeight, targetReturn) {
  const eq = Math.max(0, Math.min(1, eqWeight || 0));
  const n = Math.min(histStock.length, histBond.length);
  const port = new Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    const r = eq * histStock[i] + (1 - eq) * histBond[i];
    port[i] = r;
    mean += r;
  }
  mean /= n || 1;
  if (!isFinite(targetReturn)) targetReturn = mean;
  let scale = 1;
  if (n > 0) {
    scale = (1 + targetReturn) / (1 + mean || 1e-9);
  }
  const scaled = new Array(n);
  for (let i = 0; i < n; i++) {
    scaled[i] = (1 + port[i]) * scale - 1;
  }
  return scaled;
}

function drawReturn(port) {
  const n = port.length;
  if (!n) return 0;
  const idx = Math.floor(Math.random() * n);
  return port[idx];
}
