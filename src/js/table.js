function updateTable(bestAge, fan, baseSpend) {
      if (!fan || !fan.ages || !fan.ages.length) return;
      const cfg = getConfigFromUI();
      const ages = fan.ages;
      const medWealth = fan.p50;

      const rows = [];
      const money = n => '$' + formatMoney(n);

      // Income at current age, grows deterministically until retirement
      let income = cfg.income;
      const currentAge = cfg.currentAge;

      // We treat row "Age X" as the year from X-1 → X
      for (let i = 1; i < ages.length; i++) {
        const age = ages[i];
        const begin = medWealth[i - 1];
        const end = medWealth[i];

        let contrib = 0;
        let spend = 0;
        let withdraw = 0;

        if (age < bestAge) {
          // Pre-retirement: contributions from income, no withdrawals
          contrib = income * cfg.savingsRate;
          spend = 0;
          withdraw = 0;
          // Advance income for next year
          income *= (1 + cfg.incomeGrowth);
        } else {
          // Post-retirement: no contributions, baseSpend as "retire with % of income"
          contrib = 0;
          spend = baseSpend;
          withdraw = spend;
        }

        // Solve for investment growth: end = begin + growth + contrib - withdraw
        const growth = end - begin - contrib + withdraw;

        rows.push({
          age,
          begin,
          growth,
          contrib,
          spend,
          withdraw,
          end
        });
      }

      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${r.age}</td>
          <td>${money(r.begin)}</td>
          <td>${money(r.growth)}</td>
          <td>${money(r.contrib)}</td>
          <td>${money(r.spend)}</td>
          <td>${money(r.withdraw)}</td>
          <td>${money(r.end)}</td>
        </tr>
      `).join('');
    }
