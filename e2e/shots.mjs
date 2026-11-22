// Screenshot capture for the Devpost submission (docs/ screenshots).
// Usage: node e2e/shots.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/hatch/workspace/neon-bay-video/package.json');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const EXE = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });

// Desktop: filled state
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
await page.locator('[data-sample="artikel"]').click();
await page.locator('#name').fill('Erwin');
await page.locator('#rate').fill('Rp150.000 per artikel');
await page.locator('#timeline').fill('1 minggu');
await page.locator('#portfolio').fill('https://example.com/portfolio');
await page.locator('#generate').click();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(ROOT, 'docs/screenshot-desktop.png') });

// Mobile: hero + form
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mctx.newPage();
await mpage.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
await mpage.screenshot({ path: path.join(ROOT, 'docs/screenshot-mobile.png') });

await browser.close();
server.close();
console.log('screenshots saved to docs/');
