simsLabel.textContent = simsInput.value;
simsInput.addEventListener('input', () => {
  simsLabel.textContent = simsInput.value;
});

const RETURN_PRESETS = {
  conservative: {
    label: 'Conservative',
    stockReturn: 4.0,
    bondReturn: 0.5
  },
  base: {
    label: 'Base / Recommended',
    stockReturn: 5.5,
    bondReturn: 1.0
  },
  aggressive: {
    label: 'Aggressive',
    stockReturn: 7.5,
    bondReturn: 2.0
  }
};

const DEFAULT_RETURN_HINT =
  'Choose a forward-looking real return scenario. These are not predictions; they are planning assumptions. ' +
  'Custom values should represent forward-looking real stock and bond returns. Do not enter recent portfolio CAGR unless you are intentionally modeling an upside case.';

const retSpendPreview = document.getElementById('retSpendPreview');
function updateRetSpendPreview() {
      const income = parseFloat(document.getElementById('income').value) || 0;
      const replaceRate = parseFloat(document.getElementById('replaceRate').value) || 0;
      const val = income * replaceRate / 100.0;
      retSpendPreview.textContent = val > 0 ? ('$' + formatMoney(val) + ' / yr') : '–';
    }
document.getElementById('income').addEventListener('input', updateRetSpendPreview);
document.getElementById('replaceRate').addEventListener('input', updateRetSpendPreview);
updateRetSpendPreview();

function clampNumber(value, min, max) {
      if (value < min) return min;
      if (value > max) return max;
      return value;
    }

function computeAfterTaxStartFactor(preTaxShare, preTaxWithdrawalTaxRate) {
      const share = clampNumber(preTaxShare || 0, 0, 1);
      const rate = clampNumber(preTaxWithdrawalTaxRate || 0, 0, 0.60);
      return 1 - share * rate;
    }

function computeAdjustedCurrentSavings(currentSavings, preTaxShare, preTaxWithdrawalTaxRate) {
      const savings = Math.max(0, currentSavings || 0);
      return savings * computeAfterTaxStartFactor(preTaxShare, preTaxWithdrawalTaxRate);
    }

function updateTaxAdjustmentPreview() {
      const currentSavings = Math.max(0, parseFloat(document.getElementById('currentSavings').value) || 0);
      const rawSharePct = parseFloat(document.getElementById('preTaxShare').value) || 0;
      const rawRatePct = parseFloat(document.getElementById('preTaxWithdrawalTaxRate').value) || 0;
      const preTaxShare = rawSharePct / 100.0;
      const preTaxWithdrawalTaxRate = rawRatePct / 100.0;
      const boundedShare = clampNumber(preTaxShare, 0, 1);
      const boundedRate = clampNumber(preTaxWithdrawalTaxRate, 0, 0.60);
      const adjustedCurrentSavings = computeAdjustedCurrentSavings(
        currentSavings,
        boundedShare,
        boundedRate
      );
      const taxAdjustment = currentSavings - adjustedCurrentSavings;
      const messages = [];
      let hasWarning = false;

      if (rawSharePct < 0 || rawSharePct > 100) {
        messages.push('Pre-tax share must be between 0% and 100%.');
        hasWarning = true;
      }
      if (rawRatePct < 0 || rawRatePct > 60) {
        messages.push('Expected tax rate must be between 0% and 60%.');
        hasWarning = true;
      }

      if (boundedShare === 0 && !hasWarning) {
        messages.push('No pre-tax adjustment is being applied.');
      } else if (boundedShare > 0.80) {
        messages.push('Most assets are marked as pre-tax. The tax adjustment may materially reduce modeled retirement wealth.');
        hasWarning = true;
      }

      if (boundedShare > 0) {
        if (boundedRate === 0) {
          messages.push('Pre-tax withdrawals are being treated as tax-free.');
          hasWarning = true;
        } else if (boundedRate > 0.40) {
          messages.push('This is a high effective retirement tax rate. Confirm this is intentional.');
          hasWarning = true;
        }
      }

      document.getElementById('afterTaxStartPreview').textContent =
        'Estimated after-tax starting wealth: $' + formatMoney(adjustedCurrentSavings);
      document.getElementById('alreadyAfterTaxSharePreview').textContent =
        'Already-after-tax share: ' + Math.round((1 - boundedShare) * 100) + '%';
      document.getElementById('taxAdjustmentPreview').textContent =
        'Tax adjustment: ' + (taxAdjustment > 0 ? '-$' : '$') + formatMoney(taxAdjustment);
      document.getElementById('taxAdjustmentHint').textContent = messages.length
        ? messages.join(' ')
        : 'This is a simplified adjustment. The calculator does not model tax brackets, cost basis, capital gains, RMDs, Roth conversions, or contribution limits.';
      document.getElementById('taxAdjustmentHint').style.color = hasWarning ? 'var(--bad)' : 'var(--muted)';
    }

document.getElementById('currentSavings').addEventListener('input', updateTaxAdjustmentPreview);
document.getElementById('preTaxShare').addEventListener('input', updateTaxAdjustmentPreview);
document.getElementById('preTaxWithdrawalTaxRate').addEventListener('input', updateTaxAdjustmentPreview);
updateTaxAdjustmentPreview();

function computeDerivedReturn(eqWeight, stockReturnPct, bondReturnPct) {
      const eq = Math.max(0, Math.min(1, eqWeight || 0));
      return eq * stockReturnPct + (1 - eq) * bondReturnPct;
    }

function getReturnPresetLabel() {
      const presetKey = document.getElementById('returnPreset').value;
      if (presetKey === 'custom') return 'Custom';
      return RETURN_PRESETS[presetKey] ? RETURN_PRESETS[presetKey].label : 'Unknown';
    }

function updateReturnWarnings(pre, post, stockReturn, bondReturn) {
      const el = document.getElementById('returnAssumptionHint');
      const warnings = [];

      if (stockReturn > 8) {
        warnings.push('Stock return assumption is high for a real forward-looking return.');
      }
      if (bondReturn > 3) {
        warnings.push('Bond return assumption is high for a real forward-looking return.');
      }
      if (pre > 10) {
        warnings.push('Extremely optimistic pre-retirement return. This can materially pull retirement age earlier. Use only as a high-upside scenario, not a planning baseline.');
      } else if (pre > 8) {
        warnings.push('Very optimistic pre-retirement return. Treat as an upside scenario, not a planning baseline.');
      }
      if (post > 5.5) {
        warnings.push('Derived post-retirement return is aggressive for retirement planning.');
      }

      if (warnings.length) {
        el.textContent = warnings.join(' ');
        el.style.color = 'var(--bad)';
      } else {
        el.textContent = DEFAULT_RETURN_HINT;
        el.style.color = 'var(--muted)';
      }
    }

function updateDerivedReturns() {
      const eqPre = parseFloat(document.getElementById('eqPre').value) || 0;
      const eqPost = parseFloat(document.getElementById('eqPost').value) || 0;
      const stockReturn = parseFloat(document.getElementById('stockReturn').value) || 0;
      const bondReturn = parseFloat(document.getElementById('bondReturn').value) || 0;

      const pre = computeDerivedReturn(eqPre, stockReturn, bondReturn);
      const post = computeDerivedReturn(eqPost, stockReturn, bondReturn);

      document.getElementById('expPre').value = pre.toFixed(1);
      document.getElementById('expPost').value = post.toFixed(1);

      updateReturnWarnings(pre, post, stockReturn, bondReturn);
    }

function normalizeEquityWeightInput(id, def) {
      const input = document.getElementById(id);
      const raw = parseFloat(input.value);
      const value = isNaN(raw) ? def : raw;
      const bounded = clampNumber(value, 0, 1);
      input.value = Number(bounded.toFixed(2)).toString();
      updateDerivedReturns();
    }

function applyReturnPreset() {
      const presetKey = document.getElementById('returnPreset').value;
      const isCustom = presetKey === 'custom';

      const stockInput = document.getElementById('stockReturn');
      const bondInput = document.getElementById('bondReturn');

      if (!isCustom) {
        const preset = RETURN_PRESETS[presetKey];
        stockInput.value = preset.stockReturn.toFixed(1);
        bondInput.value = preset.bondReturn.toFixed(1);
      }

      stockInput.disabled = !isCustom;
      bondInput.disabled = !isCustom;

      updateDerivedReturns();
    }

document.getElementById('returnPreset').addEventListener('change', applyReturnPreset);
document.getElementById('stockReturn').addEventListener('input', updateDerivedReturns);
document.getElementById('bondReturn').addEventListener('input', updateDerivedReturns);
document.getElementById('eqPre').addEventListener('input', updateDerivedReturns);
document.getElementById('eqPost').addEventListener('input', updateDerivedReturns);
document.getElementById('eqPre').addEventListener('blur', () => normalizeEquityWeightInput('eqPre', 0.85));
document.getElementById('eqPost').addEventListener('blur', () => normalizeEquityWeightInput('eqPost', 0.6));
applyReturnPreset();

function getConfigFromUI() {
      const getNum = (id, def = 0) => {
        const v = parseFloat(document.getElementById(id).value);
        return isNaN(v) ? def : v;
      };
      const currentAge = getNum('currentAge', 30);
      const maxAge     = getNum('maxAge', 110);
      const maxRetAge  = getNum('maxRetAge', 65);
      const currentSavings = Math.max(0, getNum('currentSavings', 0));
      const eqPre = clampNumber(getNum('eqPre', 0.85), 0, 1);
      const eqPost = clampNumber(getNum('eqPost', 0.6), 0, 1);
      const preTaxShare = clampNumber(getNum('preTaxShare', 0) / 100.0, 0, 1);
      const preTaxWithdrawalTaxRate = clampNumber(getNum('preTaxWithdrawalTaxRate', 25) / 100.0, 0, 0.60);
      const afterTaxStartFactor = computeAfterTaxStartFactor(
        preTaxShare,
        preTaxWithdrawalTaxRate
      );
      const adjustedCurrentSavings = computeAdjustedCurrentSavings(
        currentSavings,
        preTaxShare,
        preTaxWithdrawalTaxRate
      );

      return {
        currentAge,
        currentSavings,
        preTaxShare,
        preTaxWithdrawalTaxRate,
        afterTaxStartFactor,
        adjustedCurrentSavings,
        income: getNum('income', 0),
        savingsRate: getNum('savingsRate', 0) / 100.0,
        incomeGrowth: getNum('incomeGrowth', 0) / 100.0,
        replaceRate: getNum('replaceRate', 0) / 100.0,
        maxAge,
        sims: getNum('sims', 5000),
        targetSuccess: getNum('targetSuccess', 0.95),
        maxRetAgeCandidate: Math.min(maxRetAge, maxAge - 5),
        eqPre,
        eqPost,
        expPre: getNum('expPre', 4.8) / 100.0,
        expPost: getNum('expPost', 3.7) / 100.0,
        healthShocks: getNum('healthShocks', 3),
        ltcYears: getNum('ltcYears', 3),
        // simple real drift for health/LTC costs per year in retirement
        medInflation: 0.02
      };
    }
