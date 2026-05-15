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

function computeDerivedReturn(eqWeight, stockReturnPct, bondReturnPct) {
      const eq = Math.max(0, Math.min(1, eqWeight || 0));
      return eq * stockReturnPct + (1 - eq) * bondReturnPct;
    }

function getReturnPresetLabel() {
      const presetKey = document.getElementById('returnPreset').value;
      return presetKey === 'custom' ? 'Custom' : RETURN_PRESETS[presetKey].label;
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
        warnings.push('Very optimistic pre-retirement return. Suitable for upside scenario only.');
      } else if (pre > 8) {
        warnings.push('Very optimistic pre-retirement return. This can materially pull retirement age earlier. Treat as an upside scenario, not a planning baseline.');
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
applyReturnPreset();

function getConfigFromUI() {
      const getNum = (id, def = 0) => {
        const v = parseFloat(document.getElementById(id).value);
        return isNaN(v) ? def : v;
      };
      const currentAge = getNum('currentAge', 30);
      const maxAge     = getNum('maxAge', 110);
      const maxRetAge  = getNum('maxRetAge', 65);

      return {
        currentAge,
        currentSavings: getNum('currentSavings', 0),
        income: getNum('income', 0),
        savingsRate: getNum('savingsRate', 0) / 100.0,
        incomeGrowth: getNum('incomeGrowth', 0) / 100.0,
        replaceRate: getNum('replaceRate', 0) / 100.0,
        maxAge,
        sims: getNum('sims', 5000),
        targetSuccess: getNum('targetSuccess', 0.95),
        maxRetAgeCandidate: Math.min(maxRetAge, maxAge - 5),
        eqPre: getNum('eqPre', 0.85),
        eqPost: getNum('eqPost', 0.6),
        expPre: getNum('expPre', 4.8) / 100.0,
        expPost: getNum('expPost', 3.7) / 100.0,
        healthShocks: getNum('healthShocks', 3),
        ltcYears: getNum('ltcYears', 3),
        // simple real drift for health/LTC costs per year in retirement
        medInflation: 0.02
      };
    }
