/* ==========================================================
   5. MONEY + DATE HELPERS
   ========================================================== */

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
}

// Whole dollars, sign outside the symbol.
function formatUSD(v) {
  const n = Math.round(num(v));
  const sign = n < 0 ? "-" : "";
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + "$" + digits;
}

// Local-time date key. Never toISOString(): that is UTC.
function formatDateKey(d) {
  return d.getFullYear() + "-" +
         String(d.getMonth() + 1).padStart(2, "0") + "-" +
         String(d.getDate()).padStart(2, "0");
}

// The app's clock. Before DAY_START_HOUR it is still "yesterday".
function appNow() {
  const d = new Date();
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return d;
}
function dayKey() { return formatDateKey(appNow()); }

function parseKey(key) {
  const p = key.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
function shiftKey(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return formatDateKey(d);
}
function windowKeys(n) {
  const out = [];
  const t = dayKey();
  for (let i = n - 1; i >= 0; i--) out.push(shiftKey(t, -i));
  return out;
}
// Monday = 0 ... Sunday = 6, the order the Exercise plan and Review use.
function weekdayIndex(key) { return (parseKey(key).getDay() + 6) % 7; }
function weekStart(key) { return shiftKey(key, -weekdayIndex(key)); }
function weekKeys(offset) {
  const start = shiftKey(weekStart(dayKey()), 7 * (offset || 0));
  const out = [];
  for (let i = 0; i < 7; i++) out.push(shiftKey(start, i));
  return out;
}
function daysBetween(aKey, bKey) {
  return Math.round((parseKey(bKey) - parseKey(aKey)) / 86400000);
}
function daysFromToday(dateStr) {
  if (!dateStr) return null;
  return daysBetween(dayKey(), dateStr);
}
function lastOfMonth(key) {
  const p = key.split("-");
  return formatDateKey(new Date(+p[0], +p[1], 0));
}
function inRange(v, lo, hi) { return !!v && v >= lo && v <= hi; }

function relativeDayLabel(dateStr) {
  const d = daysFromToday(dateStr);
  if (d === null) return "";
  if (d < -1) return Math.abs(d) + " days overdue";
  if (d === -1) return "Yesterday";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d <= 6) return formatWeekday(dateStr);
  return formatShortDate(dateStr);
}
function formatShortDate(dateStr) {
  if (!dateStr) return "";
  return parseKey(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}
function formatLongDate(dateStr) {
  if (!dateStr) return "";
  return parseKey(dateStr).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
}
function formatWeekday(dateStr) {
  return parseKey(dateStr).toLocaleDateString("en-ZA", { weekday: "short" });
}
function minutesLabel(m) {
  m = Math.round(num(m));
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60), r = m % 60;
  return r ? h + "h " + r + "m" : h + "h";
}
function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }


/* ==========================================================
   6. DERIVED
   ========================================================== */
// Pure functions over db.*. Nothing stores its own total.

/* ---------- Daily checks ---------- */

function checksFor(key) {
  const d = dayGet(key);
  const s = S();
  const rest = planFor(weekdayIndex(key)).rest;
  return DAILY_CHECKS.map(function (c) {
    // A rest day counts as exercise done without a tick.
    const done = c.key === "exercise" && rest ? true : !!d[c.key];
    return { key: c.key, icon: c.icon, label: c.label(s), done: done };
  });
}
function checksDone(key) { return checksFor(key).filter(function (c) { return c.done; }).length; }

// Consecutive closed days. Today not being closed yet does not break it.
function checkinStreak() {
  let k = dayKey();
  if (!dayGet(k).checkin_done) k = shiftKey(k, -1);
  let n = 0;
  while (dayGet(k).checkin_done && n < 3650) { n++; k = shiftKey(k, -1); }
  return n;
}

// Yesterday, only if it still needs closing. Null on a first-ever open.
function gateDayKey() {
  const today = dayKey();
  const hasPrior = db.days.some(function (d) { return d.date && d.date < today; });
  if (!hasPrior) return null;
  const y = shiftKey(today, -1);
  if (dayGet(y).checkin_done) return null;
  return y;
}

function blogsThisWeek() {
  const w = weekKeys(0);
  return db.days.filter(function (d) { return d.blog_done && inRange(d.date, w[0], w[6]); }).length;
}

// Why DMs were skipped, over the last n closed days.
function skipReasonBreakdown(n) {
  const keys = windowKeys(n);
  const counts = {};
  SKIP_REASONS.forEach(function (r) { counts[r.value] = 0; });
  let closed = 0, skipped = 0;
  keys.forEach(function (k) {
    const d = dayGet(k);
    if (!d.checkin_done) return;
    closed++;
    if (!d.dms_done) skipped++;
    if (d.dm_skip_reason && counts[d.dm_skip_reason] !== undefined) counts[d.dm_skip_reason]++;
  });
  return { closed: closed, skipped: skipped, counts: counts };
}

/* ---------- Tasks ---------- */

function openTasks() {
  return db.tasks.filter(function (t) { return !t.done; });
}
function tasksDueOn(key) {
  return openTasks().filter(function (t) { return t.due && t.due <= key; })
    .sort(function (a, b) { return (a.due || "") < (b.due || "") ? -1 : (a.due === b.due ? ((a.created_at || "") < (b.created_at || "") ? -1 : 1) : 1); });
}

/* ---------- Goals ---------- */

function activeGoals() {
  return db.goals.filter(function (g) { return !g.done; }).sort(function (a, b) {
    const ad = a.deadline || "9999-99-99", bd = b.deadline || "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
  });
}
// The goal the countdown on Today reads: the money goal with a deadline if
// there is one, else the nearest deadline still open.
function primaryGoal() {
  const g = activeGoals();
  return g.find(function (x) { return num(x.amount) > 0 && x.deadline; }) || g.find(function (x) { return x.deadline; }) || g[0] || null;
}
function goalRatio(g) {
  return num(g.amount) > 0 ? Math.min(1, num(g.current) / num(g.amount)) : 0;
}

/* ---------- Exercise plan ---------- */

function planFor(weekday) {
  return byId("exercise_plan", planId(weekday)) || Object.assign(TABLES.exercise_plan(), { weekday: weekday });
}
function planToday() { return planFor(weekdayIndex(dayKey())); }
function savePlan(weekday, fields) {
  const row = byId("exercise_plan", planId(weekday));
  if (row) return update("exercise_plan", row.id, fields);
  return create("exercise_plan", Object.assign({ weekday: weekday }, fields), planId(weekday));
}

/* ---------- Content plan (which weekdays are content days) ---------- */

function contentPlanFor(weekday) {
  return byId("content_plan", contentPlanId(weekday)) || Object.assign(TABLES.content_plan(), { weekday: weekday });
}
function saveContentPlan(weekday, fields) {
  const row = byId("content_plan", contentPlanId(weekday));
  if (row) return update("content_plan", row.id, fields);
  return create("content_plan", Object.assign({ weekday: weekday }, fields), contentPlanId(weekday));
}
function planActs(p) { return CONTENT_ACTS.filter(function (a) { return !!p[a.key]; }); }
function contentPlanSet() { return db.content_plan.some(function (p) { return planActs(p).length; }); }
// Next weekday (after today) with content work, or null.
function nextContentDay() {
  const today = weekdayIndex(dayKey());
  for (let i = 1; i <= 7; i++) {
    const w = (today + i) % 7;
    const p = contentPlanFor(w);
    if (planActs(p).length) return { weekday: w, plan: p, acts: planActs(p), daysAway: i };
  }
  return null;
}
// Weekdays that carry a given activity, as short names.
function daysWith(actKey) {
  const out = [];
  for (let w = 0; w < 7; w++) if (contentPlanFor(w)[actKey]) out.push(WEEKDAYS[w].slice(0, 3));
  return out;
}

// The concrete thing to do for one activity today. Formats furthest behind
// their weekly target come first, so the gap gets filled, not the favourite.
function actionFor(act) {
  const mix = weekMixStatus();
  const order = mix.slice().sort(function (a, b) { return (b.target - b.posted) - (a.target - a.posted); });
  const formatRank = {};
  order.forEach(function (f, i) { formatRank[f.value] = f.hit ? 100 + i : i; });
  if (act.key === "do_script") {
    const gap = order.find(function (f) { return !f.hit && !f.next.item; });
    if (gap) return { verb: "Script", title: "a " + gap.label.toLowerCase() + " video", item: null, note: gap.posted + " of " + gap.target + " this week, nothing scripted" };
    const waiting = contentInProgress().length;
    return { verb: "Script", title: null, item: null, note: waiting ? "Nothing needs scripting. " + plural(waiting, "video") + " already scripted and waiting." : "Nothing needs scripting." };
  }
  const items = db.content.filter(function (c) { return c.stage === act.stage; }).sort(function (a, b) {
    const ra = formatRank[a.format] === undefined ? 50 : formatRank[a.format];
    const rb = formatRank[b.format] === undefined ? 50 : formatRank[b.format];
    if (ra !== rb) return ra - rb;
    return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
  });
  if (!items.length) return { verb: act.verb, title: null, item: null, note: "Nothing to " + act.verb.toLowerCase() + " right now." };
  return { verb: act.verb, title: items[0].title, item: items[0], note: items.length > 1 ? (items.length - 1) + " more after this one" : "" };
}
function todayContentActions() {
  return planActs(contentPlanFor(weekdayIndex(dayKey()))).map(actionFor);
}

/* ---------- Content ---------- */

const STAGE_RANK = { edited: 0, filmed: 1, scripted: 2 };

function weeklyMix() {
  const m = S().weekly_mix || {};
  return CONTENT_FORMATS
    .filter(function (f) { return num(m[f.value]) > 0; })
    .map(function (f) { return { value: f.value, label: f.label, target: Math.round(num(m[f.value])) }; });
}
function postedThisWeek(format) {
  const w = weekKeys(0);
  return db.content.filter(function (c) { return (!format || c.format === format) && inRange(c.posted_date, w[0], w[6]); }).length;
}
function rankStage(c) { return STAGE_RANK[c.stage] === undefined ? 9 : STAGE_RANK[c.stage]; }
function byStageThenAge(a, b) {
  const r = rankStage(a) - rankStage(b);
  if (r) return r;
  return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
}
function formatNext(format) {
  const items = db.content.filter(function (c) { return c.format === format && c.stage !== "posted"; }).sort(byStageThenAge);
  if (items[0]) return { item: items[0], verb: NEXT_VERB[items[0].stage] || "Post", nextStage: NEXT_STAGE[items[0].stage] || "posted" };
  return { item: null, verb: FIRST_VERB, nextStage: "scripted" };
}
function weekMixStatus() {
  return weeklyMix().map(function (f) {
    const posted = postedThisWeek(f.value);
    return { value: f.value, label: f.label, target: f.target, posted: posted, hit: posted >= f.target, next: formatNext(f.value) };
  });
}
function weekTargetTotal() { return weeklyMix().reduce(function (s, f) { return s + f.target; }, 0); }
function contentInProgress() { return db.content.filter(function (c) { return c.stage !== "posted"; }); }
// The one concrete video to work on: the format furthest behind its weekly
// target, its furthest-along unposted video. He has the scripts; this is the
// answer to "which one", so the question never sends him to Instagram.
function nextContentAction() {
  const mix = weekMixStatus();
  const behind = mix.filter(function (f) { return !f.hit; }).sort(function (a, b) {
    return (b.target - b.posted) - (a.target - a.posted);
  });
  if (behind.length) {
    const pick = behind[0];
    return { format: pick, item: pick.next.item, verb: pick.next.verb, nextStage: pick.next.nextStage,
             title: pick.next.item ? pick.next.item.title : "a " + pick.label.toLowerCase() + " video" };
  }
  const list = contentInProgress().sort(byStageThenAge);
  if (!list.length) return null;
  return { format: null, item: list[0], verb: NEXT_VERB[list[0].stage] || "Post", nextStage: NEXT_STAGE[list[0].stage] || "posted", title: list[0].title };
}
function blogCandidate() {
  const list = db.content.filter(function (c) { return !c.blog_date; }).sort(function (a, b) {
    const pa = a.stage === "posted" ? 0 : 1, pb = b.stage === "posted" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
  });
  return list[0] || null;
}

/* ---------- Verse ---------- */

function verseOfDay() {
  return VERSES[(appNow().getDate() - 1) % VERSES.length];
}

/* ---------- Review ---------- */

function dayStats(key) {
  const d = dayGet(key);
  return {
    key: key,
    checks: DAILY_CHECKS.map(function (c) { return !!d[c.key]; }),
    doneCount: checksDone(key),
    screen: d.screen_minutes,
    closed: !!d.checkin_done,
    better: d.better
  };
}
