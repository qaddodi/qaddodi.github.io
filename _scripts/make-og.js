// Regenerates og.png (the link-preview image) in the site's style.
// Run from the repo root (after python3 _scripts/make-art.py):
//   npm i --no-save playwright && npx playwright install chromium && node _scripts/make-og.js
const { chromium } = require('playwright');
const fs = require('fs');
const f = (n) => fs.readFileSync('assets/fonts/' + n).toString('base64');
const lobule = fs.readFileSync('_includes/art/lobule.svg', 'utf8');
const html = `<!doctype html><style>
@font-face{font-family:F;src:url(data:font/woff2;base64,${f('fraunces-var.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:G;src:url(data:font/woff2;base64,${f('geist-var.woff2')}) format('woff2');font-weight:100 900}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{position:relative;background:#f5f1ea;color:#18141c;font-family:G}
.copy{position:absolute;left:72px;top:104px;width:640px}
h1{margin:0;font-family:F;font-weight:380;font-size:92px;line-height:.98;letter-spacing:-.04em;font-variation-settings:"opsz" 144,"SOFT" 30;text-wrap:balance}
p{margin:34px 0 0;font-size:28px;line-height:1.4;color:#413b47;max-width:600px}
.by{position:absolute;left:72px;bottom:64px;font-size:26px;font-weight:600;color:#18141c}
.lob{position:absolute;right:-60px;top:70px;width:560px}
.lob svg{width:100%;height:auto;overflow:visible}
.lob-edge{fill:none;stroke:#d0c7b9;stroke-width:1.4}.lob-far{stroke-dasharray:3 5}
.cord{stroke:#d8cfc2;stroke-width:5;stroke-linecap:round;stroke-dasharray:.1 9}
.blood{fill:none;stroke-width:2.6;stroke-linecap:round;stroke-dasharray:3 13}.b1{stroke:#3a6bdf}.b2{stroke:#8a54a0}.b3{stroke:#cc3d52}
.bile{fill:none;stroke:#1e9a77;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:2 10}
.pv{fill:#3a6bdf}.ha{fill:#cc3d52}.bd{fill:#1e9a77}.cv{fill:#18141c}.cv-ring{fill:none;stroke:#d0c7b9;stroke-width:1.4;stroke-dasharray:3 3}
.zone{fill:none}.callout{display:none}
</style><body>
<div class="copy"><h1>Liver tools from my clinic and teaching</h1>
<p>Calculators, teaching cases and simulators. Free, and they run in your browser.</p></div>
<div class="by">Mohammad Almeqdadi, MD</div>
<div class="lob">${lobule}</div></body>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html); await p.waitForTimeout(500);
  await p.screenshot({ path: 'og.png' });
  await b.close();
})();
