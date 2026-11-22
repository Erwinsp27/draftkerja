// DraftKerja Playwright E2E: proves the app loads and the core flow works
// with no console/page errors. Serves the app over localhost (no network).
// Usage: node e2e/check.mjs
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

const failures = [];
function check(cond, label) {
  console.log((cond ? 'PASS  ' : 'FAIL  ') + label);
  if (!cond) failures.push(label);
}

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
check(await page.locator('h1').innerText() === 'DraftKerja', 'app loads with DraftKerja heading');
check(await page.locator('#brief').isVisible(), 'brief textarea visible');

// Sample brief flow
await page.locator('[data-sample="logo"]').click();
const briefVal = await page.locator('#brief').inputValue();
check(briefVal.includes('Kopi Senja'), 'sample brief fills the textarea');

await page.locator('#name').fill('Erwin');
await page.locator('#rate').fill('Rp500.000');
await page.locator('#timeline').fill('5 hari');
await page.locator('#generate').click();
await page.waitForTimeout(300);

const draft = await page.locator('#draft').inputValue();
check(draft.includes('Erwin'), 'draft contains the name');
check(draft.includes('Rp500.000'), 'draft contains the rate');
check(draft.includes('5 hari'), 'draft contains the timeline');
check(/1\. /.test(draft) && /2\. /.test(draft) && /3\. /.test(draft), 'draft contains a 3-step plan');
check(await page.locator('#a-type').innerText() === 'Desain', 'analysis detects Desain job type');
check((await page.locator('#a-budget').innerText()).includes('Rp500.000'), 'analysis shows detected budget');
const score = Number(await page.locator('#score').innerText());
check(score >= 70, `completeness score is ${score} (>= 70 with name/rate/timeline filled)`);

// Save to library
await page.locator('#save').click();
await page.waitForTimeout(200);
check((await page.locator('#library li').count()) === 1, 'draft saved to library (1 item)');

// English draft
await page.locator('#language').selectOption('en');
await page.locator('#generate').click();
await page.waitForTimeout(300);
const draftEn = await page.locator('#draft').inputValue();
check(draftEn.includes('What I will deliver'), 'English draft renders with English labels');

// Polish without a key must not call the network / must warn
await page.locator('#polish').click();
await page.waitForTimeout(300);
const status = await page.locator('#status').innerText();
check(/kunci API/i.test(status), 'polish without key shows a key warning, no network call');

await page.screenshot({ path: path.join(ROOT, 'e2e/shot-filled.png'), fullPage: true });
await page.locator('#brief').fill('');
await page.locator('#generate').click();
await page.waitForTimeout(200);
check(/Tempel brief/i.test(await page.locator('#status').innerText()), 'empty brief shows a friendly warning');

check(errors.length === 0, errors.length === 0 ? 'no console/page errors' : 'errors: ' + errors.join(' | '));

await browser.close();
server.close();

if (failures.length) {
  console.error(`\n${failures.length} CHECK(S) FAILED`);
  process.exit(1);
}
console.log('\nALL E2E CHECKS PASSED');
