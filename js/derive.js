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
// "1 hour", "2 hours", "45 min", "1h 15m": for the to-do list wording.
function hoursLabel(m) {
  m = Math.round(num(m));
  if (m > 0 && m % 60 === 0) return plural(m / 60, "hour");
  return minutesLabel(m);
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
  const w = weekdayIndex(key);
  const exRest = weekPlanFor("exercise_plan", w).rest;
  const commRest = weekPlanFor("comm_plan", w).rest;
  return DAILY_CHECKS.map(function (c) {
    // A rest day counts as done without a tick.
    const done = (c.key === "exercise" && exRest) || (c.key === "comm_done" && commRest) ? true : !!d[c.key];
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
    if (num(a.sort) !== num(b.sort)) return num(a.sort) - num(b.sort);
    const ad = a.deadline || "9999-99-99", bd = b.deadline || "9999-99-99";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
  });
}
function goalEntries(goalId) {
  return db.goal_entries.filter(function (e) { return e.goal_id === goalId; })
    .sort(function (a, b) { return (a.date || "") < (b.date || "") ? 1 : (a.date === b.date ? ((a.created_at || "") < (b.created_at || "") ? 1 : -1) : -1); });
}
// What has come in toward a goal: the sum of its entries. Never stored.
function goalCurrent(g) {
  return goalEntries(g.id).reduce(function (s, e) { return s + num(e.amount); }, 0);
}
function goalRatio(g) {
  return num(g.amount) > 0 ? Math.min(1, goalCurrent(g) / num(g.amount)) : 0;
}
// The goal the countdown on Today reads: the money goal with a deadline if
// there is one, else the nearest deadline, else the first.
function primaryGoal() {
  const g = activeGoals();
  return g.find(function (x) { return num(x.amount) > 0 && x.deadline; }) || g.find(function (x) { return x.deadline; }) || g[0] || null;
}

/* ---------- Weekly plans (exercise, communication) ---------- */

function weekPlanFor(table, weekday) {
  return byId(table, weekPlanId(table, weekday)) || Object.assign(TABLES[table](), { weekday: weekday });
}
function saveWeekPlan(table, weekday, fields) {
  const row = byId(table, weekPlanId(table, weekday));
  if (row) return update(table, row.id, fields);
  return create(table, Object.assign({ weekday: weekday }, fields), weekPlanId(table, weekday));
}
// A plan's link field holds one URL per line. Returns the non-empty ones.
function planLinks(p) {
  return String(p.link || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(function (s) { return /^https?:\/\//i.test(s); });
}
function linksHtml(p, word) {
  const links = planLinks(p);
  return links.map(function (url, i) {
    return '<a class="doc-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(links.length > 1 ? word + " " + (i + 1) : word) + " " + ICONS.external + "</a>";
  }).join(" ");
}
function planFor(weekday) { return weekPlanFor("exercise_plan", weekday); }
function planToday() { return planFor(weekdayIndex(dayKey())); }
function commPlanToday() { return weekPlanFor("comm_plan", weekdayIndex(dayKey())); }

/* ---------- Content days ---------- */

function contentPlanFor(weekday) { return weekPlanFor("content_plan", weekday); }
function saveContentPlan(weekday, fields) { return saveWeekPlan("content_plan", weekday, fields); }
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
