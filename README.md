# Retirement Planner – Monte Carlo

Single-page retirement calculator that estimates the earliest retirement age meeting a target success probability. It models accumulation, retirement withdrawals, historical stock/bond return sampling, and simplified health/LTC shocks.

## How to use

1. Open `retirement_calculator.html` in a browser.
2. Enter household income, current savings, savings rate, retirement spending assumption, planning horizon, and success target.
3. Expand **Advanced portfolio, health & return assumptions** to adjust equity weights, expected real returns, health shocks, and LTC duration.
4. Click **Run simulation**.
5. Review the success curve, wealth fan chart, retirement wealth distribution, final wealth distribution, and failure-age chart.

## Model summary

The app:
- Uses embedded annual real stock and bond return data.
- Builds pre- and post-retirement portfolios from equity-weight inputs.
- Rescales historical portfolio returns to match the selected expected real return.
- Randomly samples one historical year at a time during each simulation.
- Adds annual savings before retirement and fixed base withdrawals after retirement.
- Adds simplified catastrophic health shocks and optional long-term-care costs.
- Reports the earliest retirement age that reaches the target success probability.

## Important limitations

This is a planning toy, not financial advice.

Major limitations to keep in mind:

- **Expected return inputs are very powerful.** The app rescales historical returns to match the selected expected return, so aggressive assumptions can dominate the result.
- **Historical returns are sampled independently by year.** This loses multi-year regime structure, valuation effects, inflation persistence, and sequence-of-return patterns.
- **The model is U.S.-historical-data heavy.** It may understate risks from weaker future returns, non-U.S. outcomes, or long stagnation periods.
- **Taxes are not modeled.** Taxable, Roth, pre-tax, employer stock, capital gains, RMDs, state taxes, and Medicare IRMAA are all ignored.
- **Retirement spending is simplified.** Base retirement spending is calculated as a percentage of income at retirement, not from a detailed expense budget.
- **Savings are simplified.** Contributions are modeled as a fixed percentage of income, without payroll taxes, contribution limits, employer matches, or account-type constraints.
- **No Social Security, pension, annuity, rental, or other guaranteed income streams are included.**
- **Mortality is simplified.** The app uses a fixed planning horizon rather than survival-weighted life expectancy.
- **Health and LTC costs are stylized.** Shock probabilities, costs, LTC probability, and real medical inflation are rough placeholders.
- **Spending is not dynamic.** The app does not model discretionary spending cuts, guardrails, or other adaptive withdrawal rules.

## Recommended use

Use the app for sensitivity testing, not precise prediction. Run at least three cases:

| Case | Pre-ret real return | Post-ret real return | Real income growth |
|---|---:|---:|---:|
| Conservative | 4–5% | 2.5–3.5% | 0–0.5% |
| Base | 5–6% | 3–4% | 0.5–1% |
| Optimistic | 7–10% | 4–5% | 1–2% |

Avoid treating recent personal investment performance as a reliable long-run expected return unless you also model the added concentration, leverage, or strategy risk.

## Good next improvements

Highest-impact future upgrades:

1. Add return presets and side-by-side scenario comparison.
2. Add account buckets and rough tax treatment.
3. Add fixed-dollar retirement spending mode.
4. Add block-bootstrap or historical-sequence replay.
5. Add Social Security, pension, annuity, and other income streams.
6. Add mortality-weighted outcomes using public SSA life tables.
7. Make health and LTC assumptions editable.
8. Add adaptive spending rules.

## Disclaimer

Outputs are estimates based on simplified assumptions and random simulations. They should not be used as the sole basis for retirement, investment, tax, or estate-planning decisions.
