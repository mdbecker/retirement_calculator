self.onmessage = function(e) {
  const msg = e.data;
  if (!msg || msg.type !== 'runSimulation') return;
  const config = msg.config;
  const histStock = msg.histStock;
  const histBond  = msg.histBond;

  const portPre  = buildPortfolioReturns(histStock, histBond, config.eqPre,  config.expPre);
  const portPost = buildPortfolioReturns(histStock, histBond, config.eqPost, config.expPost);

  const minRetAge = config.currentAge + 1;
  const maxRetAge = Math.min(config.maxRetAgeCandidate, config.maxAge - 1);

  const ages = [];
  const probs = [];
  let bestAge = null;

  for (let age = minRetAge; age <= maxRetAge; age++) {
    const res = simulateForRetAge(age, config, portPre, portPost, false);
    ages.push(age);
    probs.push(res.successProb);
    if (bestAge === null && res.successProb >= config.targetSuccess) {
      bestAge = age;
    }
  }
  if (bestAge === null) bestAge = maxRetAge;

  const detailed = simulateForRetAge(bestAge, config, portPre, portPost, true);

  const retW = detailed.retireWealth;
  const finW = detailed.finalWealth;
  const retP5  = percentile(retW, 0.05);
  const retP50 = percentile(retW, 0.50);
  const retP95 = percentile(retW, 0.95);
  const finP5  = percentile(finW, 0.05);
  const finP50 = percentile(finW, 0.50);
  const finP95 = percentile(finW, 0.95);

  const retHist = makeHistogram(retW, 20);
  const finHist = makeHistogram(finW, 20);

  const failureAll = [];
  if (detailed.failureAges) {
    for (let i = 0; i < detailed.failureAges.length; i++) {
      const v = detailed.failureAges[i];
      if (Number.isFinite(v)) failureAll.push(v);
    }
  }
  let failureStats = {
    p5: NaN, p50: NaN, p95: NaN,
    histBins: [], histCounts: []
  };
  if (failureAll.length > 0) {
    const fP5  = percentile(failureAll, 0.05);
    const fP50 = percentile(failureAll, 0.50);
    const fP95 = percentile(failureAll, 0.95);
    const fHist = makeHistogram(failureAll, 15);
    failureStats = {
      p5: fP5,
      p50: fP50,
      p95: fP95,
      histBins: fHist.mids,
      histCounts: fHist.counts
    };
  }

  self.postMessage({
    type: 'simulationResult',
    bestRetAge: bestAge,
    bestRetSuccess: detailed.successProb,
    successCurve: { ages, probs },
    fan: detailed.fan,
    retireStats: {
      p5: retP5,
      p50: retP50,
      p95: retP95,
      histBins: retHist.mids,
      histCounts: retHist.counts
    },
    finalStats: {
      p5: finP5,
      p50: finP50,
      p95: finP95,
      histBins: finHist.mids,
      histCounts: finHist.counts
    },
    failureStats,
    baseSpend: detailed.baseSpend
  });
};
