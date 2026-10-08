// Screenshot harness for Track.
//
//   node tools/shoot.js                       every page, 390 / 768 / 1280, light + dark, seeded
//   node tools/shoot.js --widths 390 --theme dark --pages today,review
//   node tools/shoot.js --gate                seed with yesterday left open (shows the gate)
//   node tools/shoot.js --focus               seed with a task in focus (shows the timer)
//   node tools/shoot.js --checkin             also shoot the four check-in steps
//   node tools/shoot.js --empty               no seed data (empty states)
//
// Needs tools/serve.js running on 127.0.0.1:4178 (or --port). Puppeteer is the
// global install; Edge is the fallback browser if the bundled one is missing.
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/Admin1/AppData/Roaming/npm/node_modules/puppeteer');
const { buildSeed } = require('./seed.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'screenshots');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const args = process.argv.slice(2);
const opt = { widths: [390, 768, 1280], themes: ['light', 'dark'], pages: ['today', 'tasks', 'content', 'exercise', 'review', 'settings'],
              port: process.env.PORT || 4178, gate: false, focus: false, checkin: false, empty: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i], v = args[i + 1];
  if (a === '--widths') { opt.widths = v.split(',').map(Number).filter(Boolean); i++; }
  else if (a === '--theme') { opt.themes = v.split(','); i++; }
  else if (a === '--pages') { opt.pages = v.split(','); i++; }
  else if (a === '--port') { opt.port = v; i++; }
  else if (a === '--gate') opt.gate = true;
  else if (a === '--focus') opt.focus = true;
  else if (a === '--checkin') opt.checkin = true;
  else if (a === '--empty') opt.empty = true;
}

const URL = 'http://127.0.0.1:' + opt.port + '/';
const HEIGHTS = { 1280: 860, 768: 1024, 390: 844 };
const problems = { errors: [], requests: [], overflow: [] };
const seed = opt.empty ? {} : buildSeed({ gate: opt.gate, focus: opt.focus });

async function launch() {
  try { return await puppeteer.launch(); }
  catch (e) {
    console.log('Bundled browser unavailable, using Edge.');
    return puppeteer.launch({ executablePath: EDGE });
  }
}

async function checkOverflow(page, label) {
  const o = await page.evaluate(() => {
    const ok = document.documentElement.scrollWidth <= window.innerWidth;
    const culprits = ok ? [] : Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(el).position !== 'fixed')
      .slice(0, 6)
      .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''));
    return { ok, culprits, sw: document.documentElement.scrollWidth, iw: window.innerWidth };
  });
  if (!o.ok) {
    problems.overflow.push(label + ': scrollWidth ' + o.sw + ' > ' + o.iw + ' (' + o.culprits.join(', ') + ')');
    console.log('  OVERFLOW ' + label + ': ' + o.culprits.join(', '));
  }
}

async function shoot(browser, theme, width) {
  const page = await browser.newPage();
  const label = theme + '/' + width;
  page.on('pageerror', (err) => problems.errors.push(label + ': ' + err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') problems.errors.push(label + ' console: ' + msg.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().indexOf('supabase') === -1) problems.requests.push(r.status() + ' ' + r.url()); });

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width, height: HEIGHTS[width] || 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((seed, theme) => {
    try {
      localStorage.clear();
      Object.keys(seed).forEach((k) => localStorage.setItem(k, JSON.stringify(seed[k])));
      localStorage.setItem('track_theme', theme);
      sessionStorage.setItem('track_unlocked', 'true');
    } catch (e) {}
  }, seed, theme);

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => typeof appReady !== 'undefined' && appReady, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 300));

  const dir = path.join(OUT, theme, String(width));
  fs.mkdirSync(dir, { recursive: true });

  for (const name of opt.pages) {
    await page.evaluate((n) => showSection(n), name);
    await new Promise((r) => setTimeout(r, 350));
    await checkOverflow(page, label + ' ' + name);
    await page.screenshot({ path: path.join(dir, name + '.png'), fullPage: true });
  }

  if (opt.checkin) {
    await page.evaluate(() => showSection('today'));
    await page.evaluate(() => openCheckin(dayKey()));
    for (let step = 1; step <= 4; step++) {
      await new Promise((r) => setTimeout(r, 350));
      await page.screenshot({ path: path.join(dir, 'checkin-' + step + '.png') });
      await page.evaluate((s) => {
        if (s === 1) { const b = document.querySelector('[data-reason]'); if (b) b.click(); }
        if (s === 2) { const b = document.querySelector('[data-screen="45"]'); if (b) b.click(); }
        if (s === 3) { const b = document.querySelector('[data-better="yes"]'); if (b) b.click(); }
        if (s < 4) { const n = document.querySelector('[data-next]'); if (n) n.click(); }
      }, step);
    }
    await page.evaluate(() => closeSheet());
  }

  console.log('[' + label + '] wrote ' + opt.pages.length + ' page shots');
  await page.close();
}

(async () => {
  const browser = await launch();
  try {
    for (const theme of opt.themes) for (const w of opt.widths) await shoot(browser, theme, w);
  } finally {
    await browser.close();
  }
  const bad = Object.entries(problems).filter(([, v]) => v.length);
  if (bad.length) {
    for (const [k, v] of bad) console.log(k.toUpperCase() + ':\n  ' + v.join('\n  '));
    process.exit(1);
  }
  console.log('No page errors, failed requests or overflow.');
})().catch((err) => { console.error(err); process.exit(1); });
