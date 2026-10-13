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
  // Block the Supabase CDN so every run is deterministic and local-only.
  await page.setRequestInterception(true);
  page.on('request', (r) => { if (r.url().indexOf('supabase') !== -1) r.abort(); else r.continue(); });
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
      out.stable = dayId('2026-10-08') === dayId('2026-10-08') && weekPlanId('exercise_plan', 0) !== weekPlanId('comm_plan', 0);
      out.greet = [greeting(null, 6), greeting(null, 9), greeting(null, 14), greeting(null, 19), greeting(null, 23)];
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
    check('greeting carries the name and differs by time of day', r1.greet.every((g) => g.indexOf('Njabulo') !== -1) && new Set(r1.greet).size >= 4, r1.greet);

    console.log('derived on seed');
    const r2 = await page.evaluate(() => ({
      checks: checksFor(dayKey()), streak: checkinStreak(), gate: gateDayKey(), blogs: blogsThisWeek(),
      goal: primaryGoal(), cur: goalCurrent(primaryGoal()), ratio: goalRatio(primaryGoal()),
      plan: planToday(), comm: commPlanToday(), cplan: contentPlanFor(weekdayIndex(dayKey())),
      nextDay: nextContentDay(), skip: skipReasonBreakdown(30), due: tasksDueOn(dayKey()).length, sync: syncLabel().label, configured: supabaseConfigured()
    }));
    check('six daily checks', r2.checks.length === 6, r2.checks.map((c) => c.label));
    check('streak = 29', r2.streak === 29, r2.streak);
    check('no gate when yesterday closed', r2.gate === null);
    check('primary goal is the money goal', r2.goal && r2.goal.amount === 5000, r2.goal && r2.goal.title);
    check('goal progress sums entries: $1,700 = 34%', r2.cur === 1700 && Math.round(r2.ratio * 100) === 34, [r2.cur, r2.ratio]);
    check('today has exercise and communication plans', (r2.plan.label || r2.plan.rest) && (r2.comm.label || r2.comm.rest), [r2.plan, r2.comm]);
    check('content plan has a next day', r2.nextDay && r2.nextDay.daysAway >= 1, r2.nextDay);
    check('skip reasons counted', r2.skip.closed === 29 && r2.skip.skipped === 5, r2.skip);
    check('two tasks due today (one overdue)', r2.due === 2, r2.due);
    check('default project is configured; local-only here because the CDN is blocked', r2.configured === true && r2.sync === 'Local only', [r2.configured, r2.sync]);

    console.log('writes');
    const r3 = await page.evaluate(() => {
      const t = dayKey();
      const out = {};
      bumpDay(t, { dms_done: true });
      out.tick = dayGet(t).dms_done === true;
      out.persisted = JSON.parse(localStorage.getItem('track_days')).find((d) => d.date === t).dms_done === true;
      out.outboxHasDay = Object.keys(JSON.parse(localStorage.getItem('track_outbox'))).some((k) => k.indexOf('days:') === 0);
      saveWeekPlan('exercise_plan', 2, { label: 'Core', rest: false, link: 'https://x.y/z' });
      out.planSaved = planFor(2).label === 'Core' && db.exercise_plan.filter((p) => p.weekday === 2).length === 1;
      saveWeekPlan('comm_plan', 6, { label: 'Volume', rest: false });
      out.commSaved = weekPlanFor('comm_plan', 6).label === 'Volume';
      saveContentPlan(5, { do_film: true });
      out.cplanSaved = contentPlanFor(5).do_film === true && daysWith('do_film').indexOf('Sat') !== -1;
      const g = primaryGoal();
      const before = goalCurrent(g);
      const e = create('goal_entries', { goal_id: g.id, amount: 800, note: 'Test', date: t });
      out.entryAdds = goalCurrent(g) === before + 800 && Math.round(goalRatio(g) * 100) === 50;
      remove('goal_entries', e.id);
      out.entryRemoved = goalCurrent(g) === before;
      // rest day counts as done without a tick
      saveWeekPlan('comm_plan', weekdayIndex(t), { rest: true });
      out.restCountsDone = checksFor(t).find((c) => c.key === 'comm_done').done === true;
      saveWeekPlan('comm_plan', weekdayIndex(t), { rest: false });
      // Stand flow end to end
      openStand();
      out.standOpens = document.getElementById('stand').classList.contains('open') && !!document.querySelector('.breath');
      const standsBefore = db.stands.length;
      let sawAlly = false, sawPlan = false;
      for (let i = 0; i < 8; i++) {
        const fb = document.querySelector('[data-feeling="tired"]'); if (fb) fb.click();
        if (document.querySelector('[data-action="ally"]')) sawAlly = true;
        if (document.querySelector('.stand-choice-plan')) sawPlan = true;
        const ab = document.querySelector('[data-action="phone"]'); if (ab) ab.click();
        const nb = document.querySelector('[data-next]'); if (nb) nb.click();
      }
      out.standAllyAndPlanOffered = sawAlly && sawPlan;
      out.standDone = !!document.querySelector('.stand-done') && db.stands.length === standsBefore + 1 && db.stands[db.stands.length - 1].outcome === 'stood';
      closeStand();
      out.standClosed = !document.getElementById('stand').classList.contains('open');
      out.stakesDefault = standStakes().length === STAND_DEFAULT_STAKES.length;
      saveSettings({ stand_list: 'A\nB' });
      out.stakesCustom = standStakes().length === 2;
      saveSettings({ stand_list: '' });
      // slip path logs with the feeling and reframes
      openSlip();
      out.slipOpens = /not disqualified/i.test(document.getElementById('stand').textContent);
      document.querySelector('[data-feeling="lonely"]').click();
      document.querySelector('[data-confessed]').click();
      out.slipLogged = db.stands[db.stands.length - 1].outcome === 'slipped' && db.stands[db.stands.length - 1].feeling === 'lonely';
      out.allyUrl = standAllyUrl().indexOf('https://wa.me/27821234567?text=') === 0;
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
      out.greetReturns = /returns|back|see you/i.test(document.querySelector('.topbar-title').textContent);
      out.streakBefore = checkinStreak();
      openCheckin(y);
      out.sheetOpen = document.getElementById('sheet').classList.contains('open');
      out.reasonAsked = !!document.querySelector('[data-reason]') === !dayGet(y).dms_done;
      checkin.draft.reason = 'mood';
      checkin.draft.screen = 70;
      checkin.draft.better = true;
      checkin.draft.journal = 'Test line';
      checkinNext(); checkinNext(); checkinNext();
      const yd = dayGet(y);
      out.closed = yd.checkin_done === true && yd.screen_minutes === 70 && yd.better === true && yd.journal === 'Test line';
      out.gateCleared = gateDayKey() === null;
      out.streakAfter = checkinStreak();
      out.doneScreen = !!document.querySelector('[data-done]');
      closeSheet();
      out.gateCardGone = !document.querySelector('#gate-close');
      return out;
    });
    check('gate returns yesterday', r4.gate);
    check('gate card rendered', r4.gateCardShown);
    check('greeting says returns when gated with no streak', r4.greetReturns);
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
      const out = { gate: gateDayKey(), streak: checkinStreak(), checks: checksFor(dayKey()).length, goal: primaryGoal(), pin: pinIsDefault() };
      out.pages = ['today', 'tasks', 'content', 'exercise', 'communication', 'goals', 'stand', 'review', 'settings'].map((p) => { showSection(p); return document.getElementById('page-' + p).innerHTML.length > 100; });
      return out;
    });
    check('fresh install has no gate', r5.gate === null);
    check('fresh install defaults', r5.streak === 0 && r5.checks === 6 && r5.pin === true, r5);
    check('fresh install seeds the $5,000 goal once', r5.goal && r5.goal.amount === 5000 && /5,000/.test(r5.goal.title), r5.goal);
    check('all nine pages render empty', r5.pages.every(Boolean), r5.pages);
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
