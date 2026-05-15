import hashlib
import html.parser
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "retirement_calculator.html"
ORIGINAL_FIXTURE = ROOT / "tests" / "fixtures" / "original_retirement_calculator.html"


def load_build_module():
    spec = importlib.util.spec_from_file_location("build", ROOT / "build.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_build():
    subprocess.run([sys.executable, "build.py"], cwd=ROOT, check=True, capture_output=True, text=True)


class AppHtmlParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip_depth = 0
        self.text = []
        self.inputs = []
        self.selects = []
        self.options = []
        self.buttons = []
        self.canvases = []
        self.links = []
        self.scripts = []
        self._script_attrs = None
        self._script_body = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"script", "style"}:
            self.skip_depth += 1
        if tag == "script":
            self._script_attrs = attrs
            self._script_body = []
        elif tag == "link":
            self.links.append(attrs)
        elif tag == "input":
            self.inputs.append(
                (
                    attrs.get("id"),
                    attrs.get("type"),
                    attrs.get("value"),
                    attrs.get("min"),
                    attrs.get("max"),
                    attrs.get("step"),
                    "disabled" in attrs,
                    "readonly" in attrs,
                )
            )
        elif tag == "select":
            self.selects.append((attrs.get("id"),))
        elif tag == "option":
            self.options.append((attrs.get("value"), "selected" in attrs))
        elif tag == "button":
            self.buttons.append((attrs.get("id"), attrs.get("class"), attrs.get("data-target")))
        elif tag == "canvas":
            self.canvases.append(attrs.get("id"))

    def handle_data(self, data):
        if self._script_body is not None:
            self._script_body.append(data)
        elif not self.skip_depth:
            text = " ".join(data.split())
            if text:
                self.text.append(text)

    def handle_endtag(self, tag):
        if tag == "script" and self._script_body is not None:
            self.scripts.append((self._script_attrs, "".join(self._script_body)))
            self._script_attrs = None
            self._script_body = None
        if tag in {"script", "style"} and self.skip_depth:
            self.skip_depth -= 1


def parse_html(html):
    parser = AppHtmlParser()
    parser.feed(html)
    return parser


class BuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run_build()
        # Historical one-file implementation used only as a behavior/equivalence fixture.
        cls.old_html = ORIGINAL_FIXTURE.read_text(encoding="utf-8")
        cls.new_html = OUT.read_text(encoding="utf-8")
        cls.old = parse_html(cls.old_html)
        cls.new = parse_html(cls.new_html)

    def test_build_output_is_deterministic(self):
        first_hash = hashlib.sha256(OUT.read_bytes()).hexdigest()
        run_build()
        second_hash = hashlib.sha256(OUT.read_bytes()).hexdigest()
        self.assertEqual(first_hash, second_hash)

    def test_market_data_validation(self):
        build = load_build_module()
        good_data = json.loads((ROOT / "src" / "data" / "market-data.json").read_text(encoding="utf-8"))
        build.validate_market_data(good_data)

        bad_cases = [
            {},
            {"year": [], "real_stock": [], "real_bond": [], "cpi_infl": []},
            {"year": [1], "real_stock": [0.1, 0.2], "real_bond": [0.1], "cpi_infl": [0.1]},
            {"year": [1], "real_stock": "bad", "real_bond": [0.1], "cpi_infl": [0.1]},
        ]
        for bad_data in bad_cases:
            with self.subTest(bad_data=bad_data):
                with self.assertRaises(ValueError):
                    build.validate_market_data(bad_data)

    def test_html_safe_json_dumps_escapes_html_sensitive_chars(self):
        build = load_build_module()
        dumped = build.html_safe_json_dumps({"value": "</script><div>&"})

        self.assertNotIn("<", dumped)
        self.assertNotIn(">", dumped)
        self.assertNotIn("&", dumped)
        self.assertEqual(json.loads(dumped), {"value": "</script><div>&"})

    def test_generated_html_is_single_file_app(self):
        external_urls = sorted(set(re.findall(r"https?://[^\"'<>\s]+", self.new_html)))
        self.assertEqual(
            external_urls,
            [
                "https://cdn.jsdelivr.net/npm/chart.js",
                "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
            ],
        )
        self.assertNotRegex(self.new_html, r"""(?:src|href)=["'](?!https?://|#)([^"']+)["']""")
        self.assertNotIn("fetch(", self.new_html)
        self.assertNotIn("PLACEHOLDER_DATA_JSON", self.new_html)
        self.assertIn("const SIM_WORKER_SOURCE =", self.new_html)
        self.assertIn("new Blob([SIM_WORKER_SOURCE]", self.new_html)

    def test_generated_html_preserves_markup_and_defaults(self):
        new_input_shapes = {item[0]: item[:2] + item[3:] for item in self.new.inputs}
        new_defaults = {item[0]: item[2] for item in self.new.inputs}
        disabled = {item[0] for item in self.new.inputs if item[6]}
        readonly = {item[0] for item in self.new.inputs if item[7]}
        expected_defaults = {
            "currentAge": "30",
            "currentSavings": "150000",
            "income": "180000",
            "savingsRate": "20",
            "incomeGrowth": "1.5",
            "replaceRate": "70",
            "maxAge": "110",
            "targetSuccess": "0.95",
            "sims": "40000",
            "maxRetAge": "65",
            "eqPre": "0.85",
            "eqPost": "0.6",
            "stockReturn": "5.5",
            "bondReturn": "1.0",
            "expPre": "4.8",
            "expPost": "3.7",
            "healthShocks": "3",
            "ltcYears": "3",
        }
        expected_shapes = {
            "currentAge": ("currentAge", "number", "18", "80", None, False, False),
            "currentSavings": ("currentSavings", "number", None, None, "10000", False, False),
            "income": ("income", "number", None, None, "1000", False, False),
            "savingsRate": ("savingsRate", "number", None, None, "0.5", False, False),
            "incomeGrowth": ("incomeGrowth", "number", None, None, "0.1", False, False),
            "replaceRate": ("replaceRate", "number", None, None, "0.5", False, False),
            "maxAge": ("maxAge", "number", "80", "120", None, False, False),
            "targetSuccess": ("targetSuccess", "number", "0.5", "0.99", "0.01", False, False),
            "sims": ("sims", "range", "1000", "100000", "1000", False, False),
            "maxRetAge": ("maxRetAge", "number", "40", "90", None, False, False),
            "eqPre": ("eqPre", "number", "0", "1", "0.05", False, False),
            "eqPost": ("eqPost", "number", "0", "1", "0.05", False, False),
            "stockReturn": ("stockReturn", "number", "-10", "20", "0.1", True, False),
            "bondReturn": ("bondReturn", "number", "-10", "10", "0.1", True, False),
            "expPre": ("expPre", "number", None, None, "0.1", False, True),
            "expPost": ("expPost", "number", None, None, "0.1", False, True),
            "healthShocks": ("healthShocks", "number", "0", "15", "1", False, False),
            "ltcYears": ("ltcYears", "number", "0", "10", "1", False, False),
        }

        self.assertEqual(self.old.buttons, self.new.buttons)
        self.assertEqual(sorted(self.old.canvases), sorted(self.new.canvases))
        self.assertEqual(new_input_shapes, expected_shapes)
        self.assertEqual(new_defaults, expected_defaults)
        self.assertEqual(disabled, {"stockReturn", "bondReturn"})
        self.assertEqual(readonly, {"expPre", "expPost"})
        self.assertIn(("returnPreset",), self.new.selects)
        self.assertEqual(
            self.new.options[:4],
            [
                ("conservative", False),
                ("base", True),
                ("aggressive", False),
                ("custom", False),
            ],
        )
        self.assertIn("Advanced portfolio, return & health assumptions", self.new.text)
        self.assertIn("Derived pre-ret return", " ".join(self.new.text))
        self.assertNotIn('id="expPre" type="number" value="16.5"', self.new_html)
        self.assertNotIn("expPre: getNum('expPre', 16.5) / 100.0", self.new_html)

    @unittest.skipIf(shutil.which("node") is None, "node is required for UI helper test")
    def test_return_assumption_helpers_derive_and_warn(self):
        script = textwrap.dedent(
            f"""
            const fs = require('fs');
            const vm = require('vm');
            const html = fs.readFileSync({str(OUT)!r}, 'utf8');
            const match = html.match(/\\/\\* === js\\/inputs\\.js === \\*\\/[\\s\\S]*?\\/\\* === js\\/ui\\.js === \\*\\//);
            if (!match) throw new Error('inputs bundle not found');
            const source = match[0].replace(/\\/\\* === js\\/ui\\.js === \\*\\//, '');

            const elements = new Map();
            function makeInput(id, value = '') {{
              const el = {{
                id,
                value,
                textContent: '',
                style: {{}},
                disabled: false,
                listeners: {{}},
                addEventListener(type, fn) {{ this.listeners[type] = fn; }}
              }};
              elements.set(id, el);
              return el;
            }}

            makeInput('sims', '40000');
            makeInput('simsLabel', '');
            makeInput('retSpendPreview', '');
            makeInput('income', '180000');
            makeInput('replaceRate', '70');
            makeInput('returnPreset', 'base');
            makeInput('stockReturn', '5.5').disabled = true;
            makeInput('bondReturn', '1.0').disabled = true;
            makeInput('eqPre', '0.85');
            makeInput('eqPost', '0.6');
            makeInput('expPre', '4.8');
            makeInput('expPost', '3.7');
            makeInput('returnAssumptionHint', '');
            for (const id of ['currentAge', 'currentSavings', 'incomeGrowth', 'maxAge', 'maxRetAge', 'targetSuccess', 'healthShocks', 'ltcYears']) {{
              makeInput(id, '0');
            }}

            const context = vm.createContext({{
              simsInput: elements.get('sims'),
              simsLabel: elements.get('simsLabel'),
              document: {{ getElementById(id) {{ return elements.get(id); }} }},
              formatMoney(value) {{ return String(Math.round(value)); }},
              Math,
              parseFloat,
              isNaN
            }});
            vm.runInContext(source, context);

            if (elements.get('expPre').value !== '4.8') throw new Error('base pre return mismatch: ' + elements.get('expPre').value);
            if (elements.get('expPost').value !== '3.7') throw new Error('base post return mismatch: ' + elements.get('expPost').value);
            if (!elements.get('stockReturn').disabled || !elements.get('bondReturn').disabled) throw new Error('preset fields should be disabled');

            elements.get('eqPre').value = '1';
            context.updateDerivedReturns();
            if (elements.get('expPre').value !== '5.5') throw new Error('equity weight 1 should equal stock return');

            elements.get('returnPreset').value = 'custom';
            context.applyReturnPreset();
            if (elements.get('stockReturn').disabled || elements.get('bondReturn').disabled) throw new Error('custom fields should be enabled');
            elements.get('stockReturn').value = '12';
            elements.get('bondReturn').value = '4';
            context.updateDerivedReturns();
            const warning = elements.get('returnAssumptionHint').textContent;
            if (!warning.includes('Stock return assumption is high')) throw new Error('missing stock warning: ' + warning);
            if (!warning.includes('Bond return assumption is high')) throw new Error('missing bond warning: ' + warning);
            if (!warning.includes('Extremely optimistic pre-retirement return')) throw new Error('missing pre warning: ' + warning);
            if (!warning.includes('high-upside scenario')) throw new Error('missing high-upside warning: ' + warning);
            """
        )

        with tempfile.NamedTemporaryFile("w", suffix=".cjs", delete=False) as handle:
            handle.write(script)
            script_path = Path(handle.name)
        try:
            subprocess.run(["node", str(script_path)], cwd=ROOT, check=True, capture_output=True, text=True)
        finally:
            script_path.unlink(missing_ok=True)

    def test_embedded_market_data_block(self):
        blocks = [body for attrs, body in self.new.scripts if attrs.get("id") == "market-data"]
        self.assertEqual(len(blocks), 1)
        data = json.loads(blocks[0])
        lengths = {key: len(data[key]) for key in ["year", "real_stock", "real_bond", "cpi_infl"]}
        self.assertEqual(len(set(lengths.values())), 1)
        self.assertGreater(lengths["year"], 0)

    def test_bundle_markers_are_in_configured_order(self):
        build = load_build_module()
        positions = {
            rel_path: self.new_html.find(f"/* === {rel_path} === */")
            for rel_path in build.APP_JS_FILES + build.WORKER_JS_FILES
        }
        self.assertTrue(all(position >= 0 for position in positions.values()))

        app_positions = [positions[rel_path] for rel_path in build.APP_JS_FILES]
        worker_positions = [positions[rel_path] for rel_path in build.WORKER_JS_FILES]
        self.assertEqual(app_positions, sorted(app_positions))
        self.assertEqual(worker_positions, sorted(worker_positions))

    @unittest.skipIf(shutil.which("node") is None, "node is required for worker equivalence test")
    def test_generated_worker_matches_original_with_seeded_random(self):
        script = textwrap.dedent(
            f"""
            const fs = require('fs');
            const vm = require('vm');
            const oldHtml = fs.readFileSync({str(ORIGINAL_FIXTURE)!r}, 'utf8');
            const newHtml = fs.readFileSync({str(OUT)!r}, 'utf8');
            const market = JSON.parse(fs.readFileSync({str(ROOT / 'src' / 'data' / 'market-data.json')!r}, 'utf8'));

            function extractOldWorker(html) {{
              const match = html.match(/const workerSrc = `\\n([\\s\\S]*?)\\n      `;/);
              if (!match) throw new Error('old worker source not found');
              return match[1].split('\\n').map(line => line.replace(/^      /, '')).join('\\n');
            }}

            function extractNewWorker(html) {{
              const match = html.match(/const SIM_WORKER_SOURCE = ("[\\s\\S]*?");\\n/);
              if (!match) throw new Error('new worker source not found');
              return JSON.parse(match[1]);
            }}

            function seededRandom(seed) {{
              let state = seed >>> 0;
              return function random() {{
                state = (1664525 * state + 1013904223) >>> 0;
                return state / 0x100000000;
              }};
            }}

            function makeMath(seed) {{
              const math = Object.create(Math);
              math.random = seededRandom(seed);
              return math;
            }}

            function runWorker(source, seed, config) {{
              let posted = null;
              const self = {{ postMessage(value) {{ posted = value; }} }};
              const context = vm.createContext({{
                self,
                Math: makeMath(seed),
                Number,
                Float64Array,
                Array,
                Object,
                console,
                isFinite
              }});
              vm.runInContext(source, context, {{ timeout: 30000 }});
              context.self.onmessage({{
                data: {{
                  type: 'runSimulation',
                  config,
                  histStock: market.real_stock,
                  histBond: market.real_bond
                }}
              }});
              if (!posted) throw new Error('worker did not post result');
              return posted;
            }}

            function round(value) {{
              return typeof value === 'number' ? Number(value.toFixed(6)) : value;
            }}

            function summarize(result) {{
              return {{
                type: result.type,
                bestRetAge: result.bestRetAge,
                bestRetSuccess: round(result.bestRetSuccess),
                successCurveAges: result.successCurve.ages,
                successCurveProbs: result.successCurve.probs.map(round),
                fanAges: result.fan.ages,
                fanP50First5: result.fan.p50.slice(0, 5).map(round),
                fanP50Last5: result.fan.p50.slice(-5).map(round),
                retireStats: {{
                  p5: round(result.retireStats.p5),
                  p50: round(result.retireStats.p50),
                  p95: round(result.retireStats.p95),
                  histBinsFirst3: result.retireStats.histBins.slice(0, 3).map(round),
                  histCountsFirst3: result.retireStats.histCounts.slice(0, 3)
                }},
                finalStats: {{
                  p5: round(result.finalStats.p5),
                  p50: round(result.finalStats.p50),
                  p95: round(result.finalStats.p95),
                  histBinsFirst3: result.finalStats.histBins.slice(0, 3).map(round),
                  histCountsFirst3: result.finalStats.histCounts.slice(0, 3)
                }},
                failureStats: {{
                  p5: round(result.failureStats.p5),
                  p50: round(result.failureStats.p50),
                  p95: round(result.failureStats.p95),
                  histBins: result.failureStats.histBins.map(round),
                  histCounts: result.failureStats.histCounts
                }},
                baseSpend: round(result.baseSpend)
              }};
            }}

            const config = {{
              currentAge: 30,
              currentSavings: 150000,
              income: 180000,
              savingsRate: 0.20,
              incomeGrowth: 0.015,
              replaceRate: 0.70,
              maxAge: 95,
              sims: 1000,
              targetSuccess: 0.95,
              maxRetAgeCandidate: 65,
              eqPre: 0.85,
              eqPost: 0.6,
              expPre: 0.165,
              expPost: 0.06,
              healthShocks: 3,
              ltcYears: 3,
              medInflation: 0.02
            }};

            const oldResult = summarize(runWorker(extractOldWorker(oldHtml), 123456789, config));
            const newResult = summarize(runWorker(extractNewWorker(newHtml), 123456789, config));
            if (JSON.stringify(oldResult) !== JSON.stringify(newResult)) {{
              console.error(JSON.stringify({{ oldResult, newResult }}, null, 2));
              process.exit(1);
            }}
            """
        )

        with tempfile.NamedTemporaryFile("w", suffix=".cjs", delete=False) as handle:
            handle.write(script)
            script_path = Path(handle.name)
        try:
            subprocess.run(["node", str(script_path)], cwd=ROOT, check=True, capture_output=True, text=True)
        finally:
            script_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
