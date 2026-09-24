// Regenerates the app icons in assets/icons from the self-hosted Playfair Display font.
// Run from the repo root:
//   npm i --no-save playwright && npx playwright install chromium && node _scripts/make-icons.js
const { chromium } = require('playwright');
const fs = require('fs');
const font = fs.readFileSync(process.cwd() + '/assets/fonts/playfair-display-var.woff2').toString('base64');
const page = (size, pad, radius) => `<!doctype html><style>
@font-face{font-family:P;src:url(data:font/woff2;base64,${font}) format('woff2');}
html,body{margin:0;width:${size}px;height:${size}px;background:transparent}
.b{width:${size}px;height:${size}px;border-radius:${radius}px;background:#141815;display:grid;place-items:center;
 background-image:radial-gradient(ellipse at 30% 0%, rgba(123,168,164,.16), transparent 60%)}
.m{font-family:P;font-size:${(size - 2 * pad) * 0.78}px;line-height:1;color:#d2705c;transform:translateY(-3%)}
</style><div class="b"><span class="m">M</span></div>`;
(async () => {
  const b = await chromium.launch();
  const jobs = [['icon-192.png',192,0,28],['icon-512.png',512,0,72],['icon-maskable-512.png',512,90,0],['apple-touch-icon.png',180,0,0]];
  for (const [name,size,pad,r] of jobs) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(page(size,pad,r)); await p.waitForTimeout(300);
    await p.screenshot({ path: 'assets/icons/' + name, omitBackground: true });
    await p.close();
  }
  await b.close();
})();
