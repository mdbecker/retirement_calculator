from pathlib import Path
import json

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Missing Python dependency: jinja2. Run `pip install -r requirements.txt` "
        "inside your project virtual environment, then run `python build.py` again."
    ) from exc

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
OUT = DIST / "retirement-calculator.html"

APP_JS_FILES = [
    "js/formatters.js",
    "js/state.js",
    "js/inputs.js",
    "js/ui.js",
    "js/charts.js",
    "js/table.js",
    "js/main.js",
]

WORKER_JS_FILES = [
    "sim/returns.js",
    "sim/spending.js",
    "sim/health.js",
    "sim/engine.js",
    "sim/worker.js",
]


def read_text(rel_path):
    return (SRC / rel_path).read_text(encoding="utf-8")


def bundle_js(files):
    parts = []
    for rel_path in files:
        parts.append(f"\n/* === {rel_path} === */\n")
        parts.append(read_text(rel_path))
    return "\n".join(parts)


def escape_inline_script(js):
    return js.replace("</script", "<\\/script")


def wrap_app_js(js):
    return (
        "(function(App) {\n"
        "\"use strict\";\n"
        f"{js}\n"
        "})(window.RetirementCalc = window.RetirementCalc || {});\n"
    )


def validate_market_data(data):
    required = ["year", "real_stock", "real_bond", "cpi_infl"]

    for key in required:
        if key not in data:
            raise ValueError(f"market-data.json missing required key: {key}")
        if not isinstance(data[key], list):
            raise ValueError(f"market-data.json key must be a list: {key}")
        if len(data[key]) == 0:
            raise ValueError(f"market-data.json key must not be empty: {key}")

    lengths = {key: len(data[key]) for key in required}
    if len(set(lengths.values())) != 1:
        raise ValueError(
            f"market-data.json arrays have inconsistent lengths: {lengths}"
        )


def main():
    try:
        market_data = json.loads(read_text("data/market-data.json"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"market-data.json is not valid JSON: {exc}") from exc

    validate_market_data(market_data)

    app_css = read_text("css/app.css")
    app_js = escape_inline_script(wrap_app_js(bundle_js(APP_JS_FILES)))
    worker_js = bundle_js(WORKER_JS_FILES)

    env = Environment(
        loader=FileSystemLoader(SRC),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("index.html.j2")

    html = template.render(
        app_title="Retirement Planner – Monte Carlo",
        app_css=app_css,
        market_data_json=escape_inline_script(
            json.dumps(market_data, separators=(",", ":"))
        ),
        worker_js_string=escape_inline_script(json.dumps(worker_js)),
        app_js=app_js,
    )

    DIST.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
