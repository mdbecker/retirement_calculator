simsLabel.textContent = simsInput.value;
simsInput.addEventListener('input', () => {
  simsLabel.textContent = simsInput.value;
});

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

function getConfigFromUI() {
      const getNum = (id, def = 0) => {
        const v = parseFloat(document.getElementById(id).value);
        return isNaN(v) ? def : v;
      };
      const currentAge = getNum('currentAge', 42);
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
        expPre: getNum('expPre', 16.5) / 100.0,
        expPost: getNum('expPost', 6) / 100.0,
        healthShocks: getNum('healthShocks', 3),
        ltcYears: getNum('ltcYears', 3),
        // simple real drift for health/LTC costs per year in retirement
        medInflation: 0.02
      };
    }
