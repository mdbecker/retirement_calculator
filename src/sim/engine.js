function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

function percentile(arr, p) {
  if (!arr.length) return NaN;
  const copy = arr.slice().sort((a,b) => a - b);
  const idx = clamp((copy.length - 1) * p, 0, copy.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return copy[lo];
  const t = idx - lo;
  return copy[lo] * (1 - t) + copy[hi] * t;
}

function makeHistogram(data, bins) {
  if (!data.length) return { mids: [], counts: [] };
  const sorted = data.slice().sort((a,b) => a - b);
  const p99 = percentile(sorted, 0.99);
  const min = Math.min(sorted[0], 0);
  const max = p99 <= min ? min + 1 : p99;
  const width = (max - min) / bins;
  if (width <= 0) return { mids: [min], counts: [data.length] };
  const counts = new Array(bins).fill(0);
  for (let v of data) {
    let x = v;
    if (x < min) x = min;
    if (x > max) x = max;
    let idx = Math.floor((x - min) / width);
    if (idx === bins) idx = bins - 1;
    counts[idx] += 1;
  }
  const mids = [];
  for (let i = 0; i < bins; i++) {
    mids.push(min + width * (i + 0.5));
  }
  return { mids, counts };
}

function simulateForRetAge(ageRet, config, portPre, portPost, trackDetails) {
  const sims = config.sims;
  const currentAge = config.currentAge;
  const maxAge = config.maxAge;
  const totalYears = maxAge - currentAge;

  const success = new Array(sims);
  const wealthPaths = trackDetails ? new Array(sims) : null;
  const retireWealth = trackDetails ? new Array(sims) : null;
  const finalWealth = trackDetails ? new Array(sims) : null;
  const failureAges = trackDetails ? new Array(sims) : null;

  const baseSpend = computeBaseSpend(ageRet, config);
  const maxShocksCfg = Math.max(0, Math.round(config.healthShocks || 0));
  const ltcYearsCfg = Math.max(0, Math.round(config.ltcYears || 0));
  const medInfl = config.medInflation || 0;

  for (let s = 0; s < sims; s++) {
    let cap = config.currentSavings;
    let income = config.income;

    if (trackDetails) {
      wealthPaths[s] = new Float64Array(totalYears + 1);
      wealthPaths[s][0] = cap;
      failureAges[s] = NaN;
    }

    let remainingShocks = maxShocksCfg;
    let ltcOnsetAge = Infinity;
    if (ltcYearsCfg > 0) {
      const hasLTC = Math.random() < LTC_PROB;
      if (hasLTC) {
        const maxA = Math.min(config.maxAge, 95);
        ltcOnsetAge = randInt(75, maxA);
      }
    }

    // Health/LTC real drift multiplier (starts at 1.0)
    let healthIndex = 1.0;

    // Accumulation phase
    for (let age = currentAge + 1; age < ageRet; age++) {
      const r = drawReturn(portPre);
      const contrib = income * config.savingsRate;
      cap = cap * (1 + r) + contrib;
      income = income * (1 + config.incomeGrowth);

      if (trackDetails) {
        const idx = age - currentAge;
        wealthPaths[s][idx] = cap;
      }
    }

    // Decumulation phase with health/LTC drift
    for (let age = ageRet; age <= maxAge; age++) {
      const r = drawReturn(portPost);

      // Health/LTC costs grow in real terms
      healthIndex *= (1 + medInfl);

      let extraCost = 0;
      if (ltcYearsCfg > 0 && age >= ltcOnsetAge && age < ltcOnsetAge + ltcYearsCfg) {
        extraCost += LTC_COST * healthIndex;
      }
      if (remainingShocks > 0) {
        const pShock = cataProbForAge(age);
        if (pShock > 0 && Math.random() < pShock) {
          extraCost += sampleHealthShock() * healthIndex;
          remainingShocks -= 1;
        }
      }

      const spend = baseSpend + extraCost;
      cap = cap * (1 + r) - spend;
      if (cap < 0) {
        if (trackDetails && !Number.isFinite(failureAges[s])) {
          failureAges[s] = age;
        }
        cap = -1;
      }

      if (trackDetails) {
        const idx = age - currentAge;
        wealthPaths[s][idx] = cap;
      }
    }

    success[s] = cap >= 0;
    if (trackDetails) {
      const idxRet = ageRet - currentAge;
      retireWealth[s] = wealthPaths[s][idxRet];
      finalWealth[s] = wealthPaths[s][totalYears];
    }
  }

  let successes = 0;
  for (let s = 0; s < sims; s++) if (success[s]) successes++;
  const p = sims ? successes / sims : 0;

  if (!trackDetails) {
    return { successProb: p };
  }

  const ages = [];
  const p50 = [];
  const p5  = [];
  const p25 = [];
  const p75 = [];
  const p95 = [];
  for (let t = 0; t <= totalYears; t++) {
    const age = currentAge + t;
    const vals = new Array(sims);
    for (let s = 0; s < sims; s++) {
      vals[s] = wealthPaths[s][t];
    }
    ages.push(age);
    p50.push(percentile(vals, 0.50));
    p5.push(percentile(vals, 0.05));
    p25.push(percentile(vals, 0.25));
    p75.push(percentile(vals, 0.75));
    p95.push(percentile(vals, 0.95));
  }

  return {
    successProb: p,
    fan: { ages, p50, p5, p25, p75, p95 },
    retireWealth,
    finalWealth,
    failureAges,
    baseSpend
  };
}
