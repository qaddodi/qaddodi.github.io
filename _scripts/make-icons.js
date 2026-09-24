// Regenerates the app icons in assets/icons from assets/icons/icon.svg (the lobule mark).
// Run from the repo root:
//   npm i --no-save playwright && npx playwright install chromium && node _scripts/make-icons.js
const { chromium } = require('playwright');
const fs = require('fs');
const svg = fs.readFileSync('assets/icons/icon.svg', 'utf8');
// maskable icons need the mark inside the central 80% safe zone and a full-bleed background
const page = (size, maskable) => `<!doctype html><style>html,body{margin:0;width:${size}px;height:${size}px;background:${maskable ? '#17141c' : 'transparent'}}
div{width:${size}px;height:${size}px;display:grid;place-items:center}svg{width:${maskable ? size * .72 : size}px;height:${maskable ? size * .72 : size}px}</style><div>${svg}</div>`;
(async () => {
  const b = await chromium.launch();
  for (const [name, size, maskable] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(page(size, maskable));
    await p.screenshot({ path: 'assets/icons/' + name, omitBackground: !maskable });
    await p.close();
  }
  await b.close();
})();
