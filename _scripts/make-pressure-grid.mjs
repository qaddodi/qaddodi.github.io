// Samples the Portal Pressure Simulator's own model for the homepage "try it" card.
// The card can't run the full engine, so it reads this table and interpolates.
//
//   git clone https://github.com/qaddodi/portal-pressure-simulator /tmp/pps
//   node _scripts/make-pressure-grid.mjs /tmp/pps
//
// Writes _data/pressure_grid.json: portal pressure, HVPG, and the portosystemic
// gradient across cirrhosis severity, with no TIPS and with an 8, 10, or 12 mm TIPS.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2] || "../portal-pressure-simulator");
const load = (p) => import(pathToFileURL(resolve(root, p)).href);
const { Engine } = await load("src/engine/engine.js");
const { computeMetrics } = await load("src/engine/metrics.js");
const { deepMerge } = await load("src/engine/scenario.js");
const { APP_VERSION: VERSION } = await load("src/version.js").catch(() => ({}));

const severity = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95];
const out = { source: `qaddodi/portal-pressure-simulator engine${VERSION ? " v" + VERSION : ""}, settled steady state`, severity };
for (const tips of [0, 8, 10, 12]) {
  const rows = severity.map((s) => {
    const e = new Engine();
    let p = deepMerge(e.params, { cirrhosis: s });
    if (tips) p = deepMerge(p, { tips: { on: true, d: tips } });
    e.setParams(p);
    e.settle();
    return computeMetrics(e);
  });
  const r1 = (v) => Math.round(v * 10) / 10;
  out[`tips_${tips}`] = { pv: rows.map((m) => r1(m.pv)), hvpg: rows.map((m) => r1(m.hvpg)), ppg: rows.map((m) => r1(m.ppg)) };
}
writeFileSync(new URL("../_data/pressure_grid.json", import.meta.url), JSON.stringify(out) + "\n");
console.log("wrote _data/pressure_grid.json");
