// Headless functional tests. Seeds the app, drives it through page.evaluate
// and asserts on db.* and derived values.
//
//   node tools/test.js            (needs tools/serve.js on 127.0.0.1:4178)
const path = require('path');
const puppeteer = require('C:/Users/Admin1/AppData/Roaming/npm/node_modules/puppeteer');
const { buildSeed } = require('./seed.js');

const URL = 'http://127.0.0.1:' + (process.env.PORT || 4178) + '/';
const FILE_URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let failures = 0, passes = 0;

function check(name, ok, detail) {
  if (ok) { passes++; console.log('  ok   ' + name); }
  else { failures++; console.log('  FAIL ' + name + (detail ? '  -> ' + JSON.stringify(detail) : '')); }
}

async function openApp(browser, seed, url) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.text().indexOf('net::') !== -1 || m.text().indexOf('manifest') !== -1) return;
    errors.push(m.text());
  });
  await page.evaluateOnNewDocument((seed) => {
    localStorage.clear();
    Object.keys(seed).forEach((k) => localStorage.setItem(k, JSON.stringify(seed[k])));
    sessionStorage.setItem('track_unlocked', 'true');
  }, seed);
  await page.goto(url || URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => typeof appReady !== 'undefined' && appReady, { timeout: 15000 });
  return { page, errors };
}

(async () => {
  const browser = await puppeteer.launch();
  try {
    console.log('helpers');
    let { page, errors } = await openApp(browser, buildSeed({}));
    const r1 = await page.evaluate(() => {
      const RealDate = Date;
      function fake(y, m, d, h, mi) {
        // eslint-disable-next-line no-global-assign
        Date = class extends RealDate {
          constructor(...a) { super(...(a.length ? a : [y, m, d, h, mi])); }
          static now() { return new RealDate(y, m, d, h, mi).getTime(); }
        };
      }
      const out = {};
      fake(2026, 9, 8, 4, 59); out.before5 = dayKey();
      fake(2026, 9, 8, 5, 1);  out.after5 = dayKey();
      fake(2026, 9, 8, 12, 0);
      out.week = weekKeys(0);
      out.wd = weekdayIndex('2026-10-08');
      out.parsed = [parseQuickAdd('Send proposal to Themba fri'), parseQuickAdd('Call mom tomorrow'), parseQuickAdd('Book dentist'), parseQuickAdd('Plan next week')];
      out.fmt = [formatUSD(5000), formatUSD(-500), formatUSD('1234.6')];
      out.stable = dayId('2026-10-08') === dayId('2026-10-08') && planId(0) !== planId(1);
      // eslint-disable-next-line no-global-assign
      Date = RealDate;
      return out;
    });
    check('04:59 counts as yesterday', r1.before5 === '2026-10-07', r1.before5);
    check('05:01 counts as today', r1.after5 === '2026-10-08', r1.after5);
    check('week starts Monday 5 Oct', r1.week[0] === '2026-10-05' && r1.week.length === 7, r1.week);
    check('Thursday is weekday index 3', r1.wd === 3, r1.wd);
    check('"fri" parses to Friday 9 Oct', r1.parsed[0].title === 'Send proposal to Themba' && r1.parsed[0].due === '2026-10-09', r1.parsed[0]);
    check('"tomorrow" parses', r1.parsed[1].due === '2026-10-09', r1.parsed[1]);
    check('no date word = inbox', r1.parsed[2].due === null, r1.parsed[2]);
    check('"next week" = next Monday', r1.parsed[3].due === '2026-10-12', r1.parsed[3]);
    check('formatUSD', r1.fmt.join('|') === '$5,000|-$500|$1,235', r1.fmt);
    check('stable ids', r1.stable);

    console.log('derived on seed');
    const r2 = await page.evaluate(() => ({
      checks: checksFor(dayKey()), streak: checkinStreak(), gate: gateDayKey(), blogs: blogsThisWeek(),
      next: nextContentAction(), mix: weekMixStatus(), goal: primaryGoal(), plan: planToday(), cplan: contentPlanFor(weekdayIndex(dayKey())),
      nextDay: nextContentDay(), skip: skipReasonBreakdown(30), due: tasksDueOn(dayKey()).length,
      greet: greeting(null, 9), greetLate: greeting(null, 23), greetBack: greeting('2026-10-07', 9)
    }));
    check('six daily checks, one done', r2.checks.length === 6 && r2.checks.filter((c) => c.done).length === 1, r2.checks);
    check('streak = 29', r2.streak === 29, r2.streak);
    check('no gate when yesterday closed', r2.gate === null);
    check('weekly mix totals 14', r2.mix.reduce((n, f) => n + f.target, 0) === 14);
    check('next action is Teach, Film', r2.next && r2.next.format.value === 'teach' && r2.next.verb === 'Film', r2.next && r2.next.title);
    check('primary goal is the $5,000 one', r2.goal && r2.goal.amount === 5000 && r2.goal.current === 1200, r2.goal);
    check('today has an exercise plan entry', r2.plan && (r2.plan.label || r2.plan.rest), r2.plan);
    check('content plan has a next day', r2.nextDay && r2.nextDay.daysAway >= 1, r2.nextDay);
    check('skip reasons counted', r2.skip.closed === 29 && r2.skip.skipped === 5, r2.skip);
    check('two tasks due today (one overdue)', r2.due === 2, r2.due);
    check('greeting has the name and changes by hour', r2.greet.indexOf('Njabulo') !== -1 && r2.greetLate !== r2.greet, [r2.greet, r2.greetLate, r2.greetBack]);

    console.log('writes');
    const r3 = await page.evaluate(() => {
      const t = dayKey();
      const out = {};
      bumpDay(t, { dms_done: true });
      out.tick = dayGet(t).dms_done === true && checksDone(t) === 2;
      out.persisted = JSON.parse(localStorage.getItem('track_days')).find((d) => d.date === t).dms_done === true;
      out.outboxHasDay = Object.keys(JSON.parse(localStorage.getItem('track_outbox'))).some((k) => k.indexOf('days:') === 0);
      const scripted = db.content.find((c) => c.stage === 'scripted' && c.format === 'teach');
      advanceContent(scripted.id);
      out.filmed = scripted.stage === 'filmed' && scripted.posted_date === null;
      setContentStage(scripted.id, 'posted');
      out.postedStamp = scripted.posted_date === t && postedThisWeek('teach') === 3;
      savePlan(2, { label: 'Core', rest: false, video_url: 'https://x.y/z' });
      out.planSaved = planFor(2).label === 'Core' && db.exercise_plan.filter((p) => p.weekday === 2).length === 1;
      saveContentPlan(5, { do_film: true });
      out.cplanSaved = contentPlanFor(5).do_film === true && daysWith('do_film').indexOf('Sat') !== -1;
      out.todayActs = Array.isArray(todayContentActions());
      const g = create('goals', { title: 'Test', amount: 100, current: 50, deadline: shiftKey(t, 3) });
      out.goalRatio = goalRatio(g) === 0.5;
      remove('goals', g.id);
      const snap = exportAll();
      out.importNothingNewer = importAll(JSON.parse(JSON.stringify(snap))) === 0;
      return out;
    });
    Object.keys(r3).forEach((k) => check(k, r3[k] === true, r3[k]));
    check('no page errors in seeded session', errors.length === 0, errors);
    await page.close();

    console.log('gate + check-in');
    ({ page, errors } = await openApp(browser, buildSeed({ gate: true })));
    const r4 = await page.evaluate(() => {
      const t = dayKey();
      const y = shiftKey(t, -1);
      const out = {};
      out.gate = gateDayKey() === y;
      out.gateCardShown = !!document.querySelector('#gate-close');
      out.streakBefore = checkinStreak();
      openCheckin(y);
      out.sheetOpen = document.getElementById('sheet').classList.contains('open');
      out.reasonAsked = !!document.querySelector('[data-reason]') === !dayGet(y).dms_done;
      checkin.draft.reason = 'mood';
      checkin.draft.screen = 45;
      checkin.draft.better = true;
      checkin.draft.journal = 'Test line';
      checkinNext(); checkinNext(); checkinNext();
      const yd = dayGet(y);
      out.closed = yd.checkin_done === true && yd.screen_minutes === 45 && yd.better === true && yd.journal === 'Test line';
      out.gateCleared = gateDayKey() === null;
      out.streakAfter = checkinStreak();
      out.doneScreen = !!document.querySelector('[data-done]');
      closeSheet();
      out.gateCardGone = !document.querySelector('#gate-close');
      return out;
    });
    check('gate returns yesterday', r4.gate);
    check('gate card rendered', r4.gateCardShown);
    check('check-in sheet opens', r4.sheetOpen);
    check('reason asked only when DMs skipped', r4.reasonAsked);
    check('yesterday closed with answers', r4.closed);
    check('gate cleared after closing', r4.gateCleared);
    check('streak went from 0 to 29', r4.streakBefore === 0 && r4.streakAfter === 29, [r4.streakBefore, r4.streakAfter]);
    check('done screen shown', r4.doneScreen);
    check('gate card gone after close', r4.gateCardGone);
    check('no page errors in gate session', errors.length === 0, errors);
    await page.close();

    console.log('fresh + file://');
    ({ page, errors } = await openApp(browser, {}));
    const r5 = await page.evaluate(() => {
      const out = { gate: gateDayKey(), streak: checkinStreak(), checks: checksFor(dayKey()).length, mixTotal: weekTargetTotal(), next: nextContentAction(), goal: primaryGoal(), pin: pinIsDefault() };
      out.pages = ['today', 'tasks', 'content', 'exercise', 'review', 'settings'].map((p) => { showSection(p); return document.getElementById('page-' + p).innerHTML.length > 100; });
      return out;
    });
    check('fresh install has no gate', r5.gate === null);
    check('fresh install defaults', r5.streak === 0 && r5.checks === 6 && r5.mixTotal === 14 && r5.goal === null && r5.pin === true, r5);
    check('fresh install next action is Script', r5.next && r5.next.verb === 'Script' && r5.next.item === null, r5.next);
    check('all six pages render empty', r5.pages.every(Boolean), r5.pages);
    check('no page errors on fresh install', errors.length === 0, errors);
    await page.close();

    ({ page, errors } = await openApp(browser, {}, FILE_URL));
    const r6 = await page.evaluate(() => ({ ready: appReady, section: currentSectionName }));
    check('file:// boots to Today', r6.ready && r6.section === 'today', r6);
    check('no page errors on file://', errors.length === 0, errors);
    await page.close();
  } finally {
    await browser.close();
  }
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
