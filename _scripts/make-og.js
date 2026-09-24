// Regenerates og.png (the link-preview image) from the glyphs in _includes/glyphs.
// Run from the repo root after adding a project:
//   npm i --no-save playwright && npx playwright install chromium && node _scripts/make-og.js
// Keep `order` in sync with _data/projects.yml.
const { chromium } = require('playwright');
const fs = require('fs');
const f = (n) => fs.readFileSync('assets/fonts/' + n).toString('base64');
const order = ['hcc','portal-htn','backtrack','panel','cirrhosis','pressure','liver-sim','abstract','auris'];
const glyphs = order.map(g => `<svg viewBox="0 0 32 32">${fs.readFileSync('_includes/glyphs/' + g + '.svg','utf8')}</svg>`).join('');
const html = `<!doctype html><style>
@font-face{font-family:P;src:url(data:font/woff2;base64,${f('playfair-display-var.woff2')}) format('woff2');font-weight:400 600}
@font-face{font-family:S;src:url(data:font/woff2;base64,${f('source-serif-4-var.woff2')}) format('woff2');font-weight:400 600}
@font-face{font-family:I;src:url(data:font/woff2;base64,${f('inter-tight-var.woff2')}) format('woff2');font-weight:400 700}
html,body{margin:0;width:1200px;height:630px}
body{background:radial-gradient(ellipse at 28% 0%, rgba(123,168,164,.10), transparent 55%),#141815;color:#f6f2e9;padding:64px 72px 0;box-sizing:border-box;font-family:S}
.k{font-family:I;font-weight:600;font-size:17px;letter-spacing:.16em;text-transform:uppercase;color:#d2705c;margin:0 0 22px}
h1{font-family:P;font-weight:400;font-size:92px;line-height:.98;letter-spacing:-.03em;margin:0;max-width:980px}
.by{margin:26px 0 0;font-size:28px;color:#9aa79f}.by b{color:#f6f2e9;font-weight:500}
.g{position:absolute;left:72px;right:72px;bottom:48px;display:flex;justify-content:space-between;padding-top:30px;border-top:1px solid #2b322e}
.g svg{width:74px;height:74px;fill:none;stroke:#7ba8a4;stroke-width:.9;stroke-linecap:round;stroke-linejoin:round;overflow:visible}
</style><body><p class="k">Hepatology · Calculators · Cases · Simulators</p>
<h1>Tools for the bedside, the classroom, and the bench.</h1>
<p class="by"><b>Mohammad Almeqdadi, MD</b> · free, no sign-in</p>
<div class="g">${glyphs}</div></body>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html); await p.waitForTimeout(500);
  await p.screenshot({ path: 'og.png' });
  await b.close();
})();
