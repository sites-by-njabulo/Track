// Headless functional tests. Seeds the app, drives it through page.evaluate
// and asserts on db.* and derived numbers.
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
  // Network failures and the manifest's CORS refusal on file:// are expected
  // in the harness, not app bugs.
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
    // ---------- 1. Pure helpers, no seed dependence ----------
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
      out.weekday0 = new RealDate(2026, 9, 5).getDay(); // Monday 5 Oct 2026
      out.win = windowKeys(7);
      out.parsed = [parseQuickAdd('Send proposal to Themba fri'), parseQuickAdd('Call mom tomorrow'), parseQuickAdd('Book dentist'), parseQuickAdd('Plan next week')];
      out.fmt = [formatUSD(5000), formatUSD(-500), formatUSD('1234.6')];
      out.lastOf = lastOfMonth('2026-02-10');
      out.stable = dayId('2026-10-08') === dayId('2026-10-08') && dayId('2026-10-08') !== dayId('2026-10-09');
      // eslint-disable-next-line no-global-assign
      Date = RealDate;
      return out;
    });
    check('04:59 counts as yesterday', r1.before5 === '2026-10-07', r1.before5);
    check('05:01 counts as today', r1.after5 === '2026-10-08', r1.after5);
    check('week starts Monday 5 Oct', r1.week[0] === '2026-10-05' && r1.week.length === 7, r1.week);
    check('windowKeys(7) ends today', r1.win.length === 7 && r1.win[6] === '2026-10-08', r1.win);
    check('"fri" parses to Friday 9 Oct', r1.parsed[0].title === 'Send proposal to Themba' && r1.parsed[0].due === '2026-10-09', r1.parsed[0]);
    check('"tomorrow" parses', r1.parsed[1].due === '2026-10-09' && r1.parsed[1].title === 'Call mom', r1.parsed[1]);
    check('no date word = inbox', r1.parsed[2].due === null && r1.parsed[2].title === 'Book dentist', r1.parsed[2]);
    check('"next week" = next Monday', r1.parsed[3].due === '2026-10-12', r1.parsed[3]);
    check('formatUSD', r1.fmt.join('|') === '$5,000|-$500|$1,235', r1.fmt);
    check('lastOfMonth Feb', r1.lastOf === '2026-02-28', r1.lastOf);
    check('dayId is stable', r1.stable);

    // ---------- 2. Stats on seed ----------
    console.log('stats');
    const seed = buildSeed({});
    const expectedDms = seed.track_days.reduce((s, d) => s + d.dms_sent, 0);
    const r2 = await page.evaluate(() => ({ s: statsFor(30), goal: goalProgress(), avg: avgDealValue(), streak: checkinStreak(), gate: gateDayKey(), videos: videosPostedOn(dayKey()), blogs: blogsThisWeek(), next: nextContentAction(), mix: weekMixStatus(), ex: exerciseStatus(dayKey()), exDone: exerciseDoneOn(dayKey()) }));
    check('DMs sum over 30 days', r2.s.dms === expectedDms, [r2.s.dms, expectedDms]);
    check('replies = 6 leads replied in window', r2.s.replies === 6, r2.s.replies);
    check('won = 1, $1,200', r2.s.won === 1 && r2.s.money === 1200, r2.s);
    check('dmsPerWon = dms / 1', r2.s.dmsPerWon === expectedDms, r2.s.dmsPerWon);
    check('avg deal value from won lead', r2.avg === 1200, r2.avg);
    check('streak = 29 (today open does not break it)', r2.streak === 29, r2.streak);
    check('no gate when yesterday closed', r2.gate === null, r2.gate);
    check('videos posted today = 1', r2.videos === 1, r2.videos);
    check('weekly mix has 4 formats totalling 14', r2.mix.length === 4 && r2.mix.reduce((n, f) => n + f.target, 0) === 14, r2.mix);
    check('next action is the format furthest behind', r2.next && r2.next.format && r2.next.format.value === 'teach' && r2.next.verb === 'Film', r2.next && [r2.next.format.value, r2.next.verb, r2.next.title]);
    check('exercise status 2 of 4, not done', r2.ex && r2.ex.total === 4 && r2.ex.done === 2 && r2.exDone === false, r2.ex);
    check('goal counts only this month', r2.goal.won === 0 && r2.goal.target === 5000, r2.goal);

    // ---------- 3. Writes ----------
    console.log('writes');
    const r3 = await page.evaluate(() => {
      const t = dayKey();
      const out = {};
      const before = num(dayGet(t).dms_sent);
      bumpDay(t, (r) => ({ dms_sent: num(r.dms_sent) + 5 }));
      out.dmAfter = num(dayGet(t).dms_sent) - before;
      out.persisted = JSON.parse(localStorage.getItem('track_days')).find((d) => d.date === t).dms_sent === before + 5;
      out.outboxHasDay = Object.keys(JSON.parse(localStorage.getItem('track_outbox'))).some((k) => k.indexOf('days:') === 0);

      // Top 3 limit: seed has 3 for today
      const inbox = db.tasks.find((x) => !x.due && !x.done);
      out.fourthStarRefused = toggleTop(inbox.id, t) === false && inbox.top_date !== t;
      // unstar one, then it fits
      const starred = topTasksFor(t).find((x) => !x.done);
      toggleTop(starred.id, t);
      out.unstarred = starred.top_date === null;
      out.thenFits = toggleTop(inbox.id, t) === true && inbox.top_date === t;

      // Content stamping
      const scripted = db.content.find((c) => c.stage === 'scripted' && c.format === 'teach');
      advanceContent(scripted.id);
      out.filmed = scripted.stage === 'filmed' && scripted.posted_date === null;
      setContentStage(scripted.id, 'posted');
      out.postedStamp = scripted.posted_date === t && videosPostedOn(t) === 2;
      setContentStage(scripted.id, 'filmed');
      out.unposted = scripted.posted_date === null && videosPostedOn(t) === 1;

      // Lead stamping
      const v = stampStage({ stage: 'won', name: 'X' }, null);
      out.wonStamp = v.won_date === t && v.replied_date === t;
      const lead = db.leads.find((l) => l.stage === 'call');
      const v2 = stampStage({ stage: 'proposal' }, lead);
      out.proposalStamp = v2.proposal_date === t && v2.call_date === undefined;

      // Focus: park then finish
      const task = topTasksFor(t).find((x) => !x.done);
      startFocus(task.id);
      out.focusSet = !!activeFocus() && activeFocus().task.id === task.id;
      endFocus('parked', 'pulled', true);
      out.parked = parksOn(t) === 1 && !activeFocus() && !byId('tasks', task.id).done;
      startFocus(task.id);
      endFocus('finished', null, true);
      out.finished = byId('tasks', task.id).done === true && dayGet(t).focus_log.length === 2;

      // Exercise: bump to target flips done, log row is stable-keyed
      const run = db.exercises.find((e) => e.name === 'Run');
      bumpExercise(t, run.id, 10);
      out.exerciseBump = exerciseAmount(t, run.id) === 20 && exerciseHit(t, run);
      bumpExercise(t, run.id, 10);
      out.exerciseLogSingle = db.exercise_logs.filter((l) => l.date === t && l.exercise_id === run.id).length === 1;
      const plank = db.exercises.find((e) => e.name === 'Plank');
      bumpExercise(t, plank.id, 5);
      out.exerciseAllDone = exerciseDoneOn(t) === true && exerciseStatus(t).done === 4;

      // Hold maths
      out.clients = clientsNeeded(1200);

      // Export / import round trip
      const snap = exportAll();
      out.importNothingNewer = importAll(JSON.parse(JSON.stringify(snap))) === 0;
      const older = JSON.parse(JSON.stringify(snap));
      older.tables.tasks[0].title = 'STALE';
      older.tables.tasks[0].updated_at = '2000-01-01T00:00:00.000Z';
      importAll(older);
      out.staleIgnored = db.tasks[0].title !== 'STALE';
      return out;
    });
    Object.keys(r3).forEach((k) => check(k, r3[k] === true || (k === 'clients' && r3[k] === 1) || (k === 'dmAfter' && r3[k] === 5), r3[k]));
    check('no page errors in seeded session', errors.length === 0, errors);
    await page.close();

    // ---------- 4. Gate + check-in ----------
    console.log('gate + check-in');
    ({ page, errors } = await openApp(browser, buildSeed({ gate: true })));
    const r4 = await page.evaluate(() => {
      const t = dayKey();
      const y = shiftKey(t, -1);
      const out = {};
      out.gate = gateDayKey() === y;
      out.gateCardShown = !!document.querySelector('#gate-close');
      out.streakBefore = checkinStreak();
      const inbox = db.tasks.find((x) => !x.due && !x.done);
      out.starBlocked = toggleTop(inbox.id, t) === false;
      // Close yesterday through the real flow
      openCheckin(y);
      out.sheetOpen = document.getElementById('sheet').classList.contains('open');
      out.reasonRequired = !!document.querySelector('[data-reason]'); // yesterday had 30? seed: i=1 -> 30 dms, so no reason needed
      checkin.draft.screen = 45;
      checkin.draft.better = true;
      checkin.draft.journal = 'Test line';
      checkin.draft.top = [inbox.id];
      checkinNext(); // step 1 -> 2
      checkinNext(); // 2 -> 3
      checkinNext(); // 3 -> 4
      checkinNext(); // 4 -> finish
      const yd = dayGet(y);
      out.closed = yd.checkin_done === true && yd.screen_minutes === 45 && yd.better === true && yd.journal === 'Test line';
      out.gateCleared = gateDayKey() === null;
      out.topForToday = byId('tasks', inbox.id).top_date === t;
      out.streakAfter = checkinStreak();
      out.doneScreen = !!document.querySelector('[data-done]');
      closeSheet();
      out.gateCardGone = !document.querySelector('#gate-close');
      out.starNowAllowed = topTasksFor(t).length < 3 ? toggleTop(db.tasks.find((x) => x.due > t).id, t) === true : true;
      return out;
    });
    check('gate returns yesterday', r4.gate);
    check('gate card rendered', r4.gateCardShown);
    check('starring blocked while gated', r4.starBlocked);
    check('check-in sheet opens', r4.sheetOpen);
    check('yesterday closed with answers', r4.closed);
    check('gate cleared after closing', r4.gateCleared);
    check('picked task is top for today', r4.topForToday);
    check('streak went from 0 to 29', r4.streakBefore === 0 && r4.streakAfter === 29, [r4.streakBefore, r4.streakAfter]);
    check('done screen shown', r4.doneScreen);
    check('gate card gone after close', r4.gateCardGone);
    check('starring allowed after close', r4.starNowAllowed);
    check('no page errors in gate session', errors.length === 0, errors);
    await page.close();

    // ---------- 5. Fresh install: no gate, empty states, file:// ----------
    console.log('fresh + file://');
    ({ page, errors } = await openApp(browser, {}));
    const r5 = await page.evaluate(() => ({ gate: gateDayKey(), streak: checkinStreak(), tasks: db.tasks.length, settings: S().target_dms, pin: pinIsDefault(), mixTotal: weekTargetTotal(), next: nextContentAction(), ex: exerciseStatus(dayKey()) }));
    check('fresh install has no gate', r5.gate === null);
    check('fresh install defaults', r5.streak === 0 && r5.tasks === 0 && r5.settings === 30 && r5.pin === true, r5);
    check('fresh install: mix defaults to 14, next action is Script', r5.mixTotal === 14 && r5.next && r5.next.verb === 'Script' && r5.next.item === null, r5.next);
    check('fresh install: no exercises means toggle mode', r5.ex === null);
    const r5b = await page.evaluate(() => { showSection('exercise'); showSection('content'); showSection('tasks'); return { ok: true, pages: ['exercise','content','tasks'].map((p) => document.getElementById('page-' + p).innerHTML.length > 100) }; });
    check('empty pages render', r5b.pages.every(Boolean), r5b.pages);
    check('no page errors on fresh install', errors.length === 0, errors);
    await page.close();

    ({ page, errors } = await openApp(browser, {}, FILE_URL));
    const r6 = await page.evaluate(() => ({ ready: appReady, section: currentSectionName, id: newId().length }));
    check('file:// boots to Today', r6.ready && r6.section === 'today' && r6.id === 36, r6);
    check('no page errors on file://', errors.length === 0, errors);
    await page.close();
  } finally {
    await browser.close();
  }
  console.log('\n' + passes + ' passed, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
