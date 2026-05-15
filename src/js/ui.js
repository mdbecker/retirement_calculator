advancedToggle.addEventListener('click', () => {
  advancedPanel.classList.toggle('open');
  advancedChevron.textContent = advancedPanel.classList.contains('open') ? '▴' : '▾';
});

function setStatusRunning() {
  runBtn.disabled = true;
  statusDot.style.display = 'inline-block';
  statusMsg.textContent = 'Running Monte Carlo…';
}
function setStatusReady() {
  runBtn.disabled = false;
  statusDot.style.display = 'none';
  statusMsg.textContent = 'Ready';
}

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-target');
    Object.values(panels).forEach(p => p.classList.remove('active'));
    panels[target].classList.add('active');
  });
});

function updateSummary(data) {
      const cfg = getConfigFromUI();
      const age = data.bestRetAge;
      const p   = data.bestRetSuccess;
      const baseSpend = data.baseSpend;

      retAgeLabel.textContent = age ? age.toString() : '–';
      pillRetAge.classList.remove('good', 'bad');
      if (p >= cfg.targetSuccess) pillRetAge.classList.add('good');
      else pillRetAge.classList.add('bad');
      const years = age ? (age - cfg.currentAge) : null;
      retAgeDetail.textContent = age
        ? `Earliest age where success ≈ ${formatPct(p)} (target ${formatPct(cfg.targetSuccess)}); about ${years} years from now. Return case: ${getReturnPresetLabel()}. Derived real returns: ${formatPct(cfg.expPre)} pre-ret, ${formatPct(cfg.expPost)} post-ret.`
        : 'Could not find a retirement age that reaches the target success probability.';

      const rs = data.retireStats;
      retWealthLabel.textContent = '$' + formatMoney(rs.p50);
      const spendStr = baseSpend ? '$' + formatMoney(baseSpend) + ' / yr' : '–';
      retWealthDetail.textContent =
        `5–95% band at retirement: $${formatMoney(rs.p5)} – $${formatMoney(rs.p95)}. ` +
        `Target retirement income (before health/LTC shocks): ${spendStr}.`;

      const fs = data.finalStats;
      finalWealthLabel.textContent = '$' + formatMoney(fs.p50);
      pillFinalWealth.classList.remove('good', 'bad');
      if (fs.p50 >= 0) pillFinalWealth.classList.add('good'); else pillFinalWealth.classList.add('bad');
      finalWealthDetail.textContent =
        `5–95% band at horizon: $${formatMoney(fs.p5)} – $${formatMoney(fs.p95)} (negative values mean the portfolio was exhausted early, often due to health/LTC costs).`;

      const fail = data.failureStats || {};
      const hasFailures = fail.histBins && fail.histBins.length > 0;
      pillFailure.classList.remove('good', 'bad');
      if (hasFailures) pillFailure.classList.add('bad'); else pillFailure.classList.add('good');
      if (hasFailures) {
        failureLabel.textContent = `${fail.p50 ? fail.p50.toFixed(1) : '–'}`;
        failureDetail.textContent =
          `Failure ages (5–95%): ${fail.p5 ? fail.p5.toFixed(1) : '–'} – ${fail.p95 ? fail.p95.toFixed(1) : '–'} (conditional on failure).`;
      } else {
        failureLabel.textContent = 'No failures';
        failureDetail.textContent = 'In this run, no simulations depleted the portfolio before the planning horizon.';
      }
    }
