import hashlib
import html.parser
import importlib.util
import json
import re
import shutil
import subprocess
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
    subprocess.run(["python", "build.py"], cwd=ROOT, check=True, capture_output=True, text=True)


class AppHtmlParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip_depth = 0
        self.text = []
        self.inputs = []
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
                )
            )
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
        old_inputs = {item[0]: item for item in self.old.inputs}
        new_inputs = {item[0]: item for item in self.new.inputs}

        self.assertEqual(self.old.text, self.new.text)
        self.assertEqual(self.old.buttons, self.new.buttons)
        self.assertEqual(sorted(self.old.canvases), sorted(self.new.canvases))
        self.assertEqual(len(new_inputs), 16)
        self.assertEqual(new_inputs["currentAge"][2], "30")

        old_inputs["currentAge"] = new_inputs["currentAge"]
        self.assertEqual(old_inputs, new_inputs)

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
