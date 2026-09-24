// Regenerates og.png (the link-preview image) in the site's style.
// Run from the repo root (after python3 _scripts/make-art.py):
//   npm i --no-save playwright && npx playwright install chromium && node _scripts/make-og.js
const { chromium } = require('playwright');
const fs = require('fs');
const f = (n) => fs.readFileSync('assets/fonts/' + n).toString('base64');
const lobule = fs.readFileSync('_includes/art/lobule.svg', 'utf8');
const html = `<!doctype html><style>
@font-face{font-family:F;src:url(data:font/woff2;base64,${f('fraunces-var.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:FI;src:url(data:font/woff2;base64,${f('fraunces-italic-var.woff2')}) format('woff2');font-weight:100 900;font-style:italic}
@font-face{font-family:G;src:url(data:font/woff2;base64,${f('geist-var.woff2')}) format('woff2');font-weight:100 900}
@font-face{font-family:M;src:url(data:font/woff2;base64,${f('geist-mono-var.woff2')}) format('woff2');font-weight:100 900}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{position:relative;background:#f5f1ea;color:#18141c;font-family:G;
 background-image:radial-gradient(40% 55% at 78% 45%, rgba(58,107,223,.14), transparent 70%),radial-gradient(30% 40% at 95% 90%, rgba(204,61,82,.10), transparent 70%),radial-gradient(30% 40% at 60% 95%, rgba(30,154,119,.10), transparent 70%),radial-gradient(35% 40% at 5% 0%, rgba(217,138,27,.12), transparent 70%)}
.copy{position:absolute;left:72px;top:70px;width:640px}
.k{display:flex;align-items:center;gap:12px;font-family:M;font-size:17px;letter-spacing:.08em;text-transform:uppercase;color:#655e6b}
.k i{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:-6px}
h1{margin:26px 0 0;font-family:F;font-weight:380;font-size:112px;line-height:.9;letter-spacing:-.045em;font-variation-settings:"opsz" 144,"SOFT" 30}
h1 em{font-family:FI;font-style:italic;font-weight:340;font-variation-settings:"opsz" 144,"SOFT" 100;background:linear-gradient(100deg,#2449a8 5%,#a4243a 45%,#8a4f00 75%,#0e6b51 100%);-webkit-background-clip:text;color:transparent;padding-right:6px}
p{margin:30px 0 0;font-size:26px;line-height:1.4;color:#413b47}
p b{color:#18141c}
.lob{position:absolute;right:-40px;top:70px;width:560px}
.lob svg{width:100%;height:auto;overflow:visible}
.lob-edge{fill:none;stroke:#d0c7b9;stroke-width:1.4}.lob-far{stroke-dasharray:3 5}
.cord{stroke:#d8cfc2;stroke-width:5;stroke-linecap:round;stroke-dasharray:.1 9}
.blood{fill:none;stroke-width:2.6;stroke-linecap:round;stroke-dasharray:3 13}.b1{stroke:#3a6bdf}.b2{stroke:#8a54a0}.b3{stroke:#cc3d52}
.bile{fill:none;stroke:#1e9a77;stroke-width:1.8;stroke-linecap:round;stroke-dasharray:2 10}
.pv{fill:#3a6bdf}.ha{fill:#cc3d52}.bd{fill:#1e9a77}.cv{fill:#18141c}.cv-ring{fill:none;stroke:#d0c7b9;stroke-width:1.4;stroke-dasharray:3 3}
.callout{display:none}
</style><body>
<div class="copy"><div class="k"><span><i style="background:#3a6bdf"></i> <i style="background:#cc3d52"></i> <i style="background:#1e9a77"></i> <i style="background:#d98a1b"></i></span>&nbsp;&nbsp;Transplant hepatology</div>
<h1>Hepatology, <em>made interactive.</em></h1>
<p>Calculators, cases, and simulators from <b>Mohammad Almeqdadi, MD</b>. Free, no sign-in.</p></div>
<div class="lob">${lobule}</div></body>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html); await p.waitForTimeout(500);
  await p.screenshot({ path: 'og.png' });
  await b.close();
})();
