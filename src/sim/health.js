// --- Health shock & LTC helpers (lognormal costs, age-dependent probs) ---
const CATA_MU = 150000;
const CATA_SIG = 50000;
const LTC_COST = 110000;
const LTC_PROB = 0.30; // lifetime probability of an LTC episode

function lognormalParams(mean, sd) {
  const var2 = sd * sd;
  const phi = Math.sqrt(var2 + mean * mean);
  const sigma2 = Math.log((phi * phi) / (mean * mean));
  const mu = Math.log(mean) - 0.5 * sigma2;
  return { mu, sigma: Math.sqrt(sigma2) };
}
const CATA_LN = lognormalParams(CATA_MU, CATA_SIG);

let _spare = null;
function randStdNormal() {
  if (_spare !== null) {
    const v = _spare;
    _spare = null;
    return v;
  }
  let u = 0, v = 0, s = 0;
  while (s === 0 || s >= 1) {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u*u + v*v;
  }
  const mul = Math.sqrt(-2 * Math.log(s) / s);
  _spare = v * mul;
  return u * mul;
}
function sampleHealthShock() {
  const z = randStdNormal();
  return Math.exp(CATA_LN.mu + CATA_LN.sigma * z);
}
function cataProbForAge(age) {
  if (age < 60) return 0.0;
  else if (age < 70) return 0.05;
  else if (age < 80) return 0.10;
  else return 0.15;
}
function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
