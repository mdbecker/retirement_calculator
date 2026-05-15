function computeBaseSpend(ageRet, config) {
  let income = config.income;
  for (let age = config.currentAge + 1; age < ageRet; age++) {
    income *= (1 + config.incomeGrowth);
  }
  const finalIncome = income;
  return finalIncome * config.replaceRate;
}
