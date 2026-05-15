# Retirement Planner – Monte Carlo

## Project Overview

Single-file retirement calculator for users, split into maintainable source files for development. The generated app estimates the earliest retirement age meeting a target success probability using accumulation, retirement withdrawals, historical stock/bond return sampling, and simplified health/LTC shocks.

## Build Instructions

macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python build.py
open dist/retirement_calculator.html
```

## Open The App

The build writes one standalone browser file:

```text
dist/retirement_calculator.html
```

Open that file directly. No local server, npm install, bundler, or sibling runtime files are required. Chart.js and Google Fonts load from CDNs.

## Source Layout

```text
build.py
requirements.txt
src/
  index.html.j2
  partials/
  css/app.css
  js/
  sim/
  data/market-data.json
tests/
  fixtures/original_retirement_calculator.html
dist/retirement_calculator.html
```

## Where To Edit

- HTML shell and page composition: `src/index.html.j2`
- Page sections: `src/partials/*.html.j2`
- CSS: `src/css/app.css`
- Main-thread app JavaScript: `src/js/*.js`
- Worker and simulation JavaScript: `src/sim/*.js`
- Historical market data: `src/data/market-data.json`

Do not edit `dist/retirement_calculator.html` directly. It is generated and will be overwritten by `python build.py`.

## Build Behavior

`python build.py` always:

1. Reads files from `src/`.
2. Validates `src/data/market-data.json`.
3. Renders Jinja templates.
4. Inlines CSS, JSON data, main JavaScript, and Blob worker source.
5. Writes `dist/retirement_calculator.html`.

There are no build flags or modes.

## Test Instructions

The test suite uses Python `unittest` and is designed to run in the same venv as the build. It rebuilds the generated HTML and checks the parts that can be validated reliably without browser automation.

```bash
source .venv/bin/activate
python -m unittest discover -s tests -v
```

The tests cover:

- deterministic build output
- market data validation, including expected failure cases
- single-file HTML constraints, including no local runtime assets
- preserved visible markup, inputs, buttons, canvases, and expected default values
- embedded market data JSON
- configured app/worker JavaScript bundle order
- worker simulation equivalence against the original one-file app using a seeded random stream

The worker equivalence test uses `node` if it is available on `PATH`; otherwise it is skipped. Browser interaction checks are intentionally left to the manual QA checklist because local `file://` and `localhost` browser automation may be blocked in some sandboxed environments.

`tests/fixtures/original_retirement_calculator.html` is the historical one-file implementation used only for behavior/equivalence comparison tests. Do not edit it as the current app source.

## Manual QA Checklist

After a refactor or model change:

1. Run `python build.py`.
2. Open `dist/retirement_calculator.html` directly in a browser.
3. Confirm default inputs and layout match expectations, including the Base / Recommended return preset.
4. Confirm the retirement spending preview updates when income or replacement rate changes.
5. Open and close the advanced assumptions panel.
6. Switch return presets and confirm derived pre/post-retirement returns update.
7. Switch to Custom, enter high stock/bond return assumptions, and confirm warnings appear without blocking simulation.
8. Run the simulation and confirm status text changes while running.
9. Confirm summary cards update after completion.
10. Confirm the fan chart, success chart, distribution charts, failure-age chart, and projection table populate.
11. Check the browser console for new errors.

## Known Limitations

This is a planning toy, not financial advice.

- Return presets derive portfolio-level expected returns from stock/bond assumptions and equity weights; the selected expectation still rescales historical return samples.
- Historical returns are sampled independently by year.
- Taxes, Social Security, pensions, annuities, and account buckets are not modeled.
- Retirement spending is simplified as a percentage of income at retirement.
- Health and LTC costs are stylized placeholders.
- Spending is not dynamic.

## Future Improvements

Possible later work includes fixed-dollar spending, tax/account buckets, Social Security, block bootstrap, historical replay, mortality weighting, editable health/LTC assumptions, offline Chart.js bundling, minified output, browser tests, CLI flags, or a module/bundler migration.

## Disclaimer

Outputs are estimates based on simplified assumptions and random simulations. They should not be used as the sole basis for retirement, investment, tax, or estate-planning decisions.
