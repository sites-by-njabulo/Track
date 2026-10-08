/* ==========================================================
   5. MONEY + DATE HELPERS
   ========================================================== */

// PostgREST can hand `numeric` back as a string. Coerce once, here.
function num(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
}

// Whole dollars, sign outside the symbol ("-$500", not "$-500").
function formatUSD(v) {
  const n = Math.round(num(v));
  const sign = n < 0 ? "-" : "";
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return sign + "$" + digits;
}

function formatPercent(ratio, decimals) {
  if (ratio === null || ratio === undefined) return "none yet";
  return (ratio * 100).toFixed(decimals || 0) + "%";
}

// Local-time date key. Never toISOString(): that is UTC, and in UTC+2 it
// reports "yesterday" for anything before 02:00.
function formatDateKey(d) {
  return d.getFullYear() + "-" +
         String(d.getMonth() + 1).padStart(2, "0") + "-" +
         String(d.getDate()).padStart(2, "0");
}

// The app's clock. Before DAY_START_HOUR it is still "yesterday": closing the
// day at 00:30 writes to the day that is actually being closed.
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
// n day keys ending today, oldest first.
function windowKeys(n) {
  const out = [];
  const t = dayKey();
  for (let i = n - 1; i >= 0; i--) out.push(shiftKey(t, -i));
  return out;
}
// Monday to Sunday of the week containing today, shifted by whole weeks.
function weekStart(key) {
  const dow = (parseKey(key).getDay() + 6) % 7; // Monday = 0
  return shiftKey(key, -dow);
}
function weekKeys(offset) {
  const start = shiftKey(weekStart(dayKey()), 7 * (offset || 0));
  const out = [];
  for (let i = 0; i < 7; i++) out.push(shiftKey(start, i));
  return out;
}
function daysBetween(aKey, bKey) {
  return Math.round((parseKey(bKey) - parseKey(aKey)) / 86400000);
}
// Whole days from today (app day) to a "YYYY-MM-DD". Negative = past.
function daysFromToday(dateStr) {
  if (!dateStr) return null;
  return daysBetween(dayKey(), dateStr);
}
function firstOfMonth(key) { return key.slice(0, 7) + "-01"; }
function lastOfMonth(key) {
  const p = key.split("-");
  return formatDateKey(new Date(+p[0], +p[1], 0));
}
// Date columns are "YYYY-MM-DD" strings; ISO strings compare correctly with
// < and >. Never new Date() them for grouping.
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
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function minutesLabel(m) {
  m = Math.round(num(m));
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60), r = m % 60;
  return r ? h + "h " + r + "m" : h + "h";
}
function elapsedLabel(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? h + ":" + mm + ":" + ss : mm + ":" + ss;
}
function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }


/* ==========================================================
   6. DERIVED METRICS
   ========================================================== */
// Pure functions over db.*. Nothing stores its own number.

/* ---------- Pipeline ---------- */

function statsRange(lo, hi) {
  const dms = db.days.filter(function (d) { return inRange(d.date, lo, hi); })
    .reduce(function (s, d) { return s + num(d.dms_sent); }, 0);
  const replies = db.leads.filter(function (l) { return inRange(l.replied_date, lo, hi); }).length;
  const calls = db.leads.filter(function (l) { return inRange(l.call_date, lo, hi); }).length;
  const wonRows = db.leads.filter(function (l) { return l.stage === "won" && inRange(l.won_date, lo, hi); });
  const won = wonRows.length;
  const money = wonRows.reduce(function (s, l) { return s + num(l.value); }, 0);
  return {
    lo: lo, hi: hi, dms: dms, replies: replies, calls: calls, won: won, money: money,
    replyRate: dms ? replies / dms : null,
    dmsPerReply: replies ? Math.round(dms / replies) : null,
    dmsPerWon: won ? Math.round(dms / won) : null
  };
}
function statsFor(n) {
  const keys = windowKeys(n);
  return statsRange(keys[0], keys[keys.length - 1]);
}

// The sentence that answers "are DMs worth it" with numbers. Shown under the
// DM counter all day and again inside the night check-in.
function dmMathLine(n) {
  const s = statsFor(n || 30);
  const span = "Last " + n + " days: ";
  if (!s.dms) return "No DMs logged in the last " + n + " days. The numbers start when you do.";
  if (!s.replies) return span + plural(s.dms, "DM") + ", no replies yet. That is too few to judge from. Keep sending.";
  if (!s.won) return span + "1 reply per " + s.dmsPerReply + " DMs, " + plural(s.calls, "call") + " booked, no client yet.";
  return span + "1 reply per " + s.dmsPerReply + " DMs, 1 client per " + s.dmsPerWon + " DMs, " + formatUSD(s.money) + " won.";
}

function followUpsDue() {
  const t = dayKey();
  return db.leads
    .filter(function (l) { return l.follow_up_date && OPEN_STAGES.indexOf(l.stage) !== -1 && l.follow_up_date <= t; })
    .sort(function (a, b) { return a.follow_up_date < b.follow_up_date ? -1 : 1; });
}

/* ---------- Goal ---------- */

function goalWindow() {
  const s = S();
  const t = dayKey();
  return { start: s.goal_start || firstOfMonth(t), end: s.goal_end || lastOfMonth(t), target: num(s.goal_amount) };
}
function goalProgress() {
  const w = goalWindow();
  const won = db.leads
    .filter(function (l) { return l.stage === "won" && inRange(l.won_date, w.start, w.end); })
    .reduce(function (s, l) { return s + num(l.value); }, 0);
  return {
    start: w.start, end: w.end, target: w.target, won: won,
    remaining: Math.max(0, w.target - won),
    ratio: w.target > 0 ? won / w.target : 0,
    daysLeft: daysFromToday(w.end)
  };
}
// Mean value of deals won in the last 90 days, else the Settings fallback.
function avgDealValue() {
  const keys = windowKeys(90);
  const rows = db.leads.filter(function (l) { return l.stage === "won" && inRange(l.won_date, keys[0], keys[89]) && num(l.value) > 0; });
  if (!rows.length) return num(S().default_deal_value) || 1500;
  return rows.reduce(function (s, l) { return s + num(l.value); }, 0) / rows.length;
}
function clientsNeeded(amount) {
  const avg = avgDealValue();
  if (!avg) return null;
  return Math.max(1, Math.ceil(num(amount) / avg));
}

/* ---------- Days ---------- */

// Consecutive closed days. Today not being closed yet does not break it;
// it only ends once yesterday was missed.
function checkinStreak() {
  let k = dayKey();
  if (!dayGet(k).checkin_done) k = shiftKey(k, -1);
  let n = 0;
  while (dayGet(k).checkin_done && n < 3650) { n++; k = shiftKey(k, -1); }
  return n;
}

function parksOn(key) {
  return (dayGet(key).focus_log || []).filter(function (e) { return e.outcome === "parked"; }).length;
}

// Any day row holding a focus, not just today's: a block started at 23:50 is
// still running at 05:10 and must not be stranded by the rollover.
function activeFocus() {
  const row = db.days.find(function (d) { return d.focus_task_id; });
  if (!row) return null;
  const task = byId("tasks", row.focus_task_id);
  if (!task) return { row: row, task: null };
  return { row: row, task: task };
}

// Yesterday, only if it still needs closing. Null on a first-ever open (no
// day before today exists) so a new install is never nagged.
function gateDayKey() {
  const today = dayKey();
  const hasPrior = db.days.some(function (d) { return d.date && d.date < today; });
  if (!hasPrior) return null;
  const y = shiftKey(today, -1);
  if (dayGet(y).checkin_done) return null;
  return y;
}

/* ---------- Tasks ---------- */

function topTasksFor(key) {
  return db.tasks.filter(function (t) { return t.top_date === key; })
    .sort(function (a, b) { return (a.done === b.done) ? 0 : (a.done ? 1 : -1); });
}
function openTasks() {
  return db.tasks.filter(function (t) { return !t.done; });
}

/* ---------- Content ---------- */

function videosPostedOn(key) {
  return db.content.filter(function (c) { return c.posted_date === key; }).length;
}
function countContent(field, lo, hi) {
  return db.content.filter(function (c) { return inRange(c[field], lo, hi); }).length;
}
function blogsThisWeek() {
  const w = weekKeys(0);
  return countContent("blog_date", w[0], w[6]);
}
function contentQueue() {
  return db.content.filter(function (c) { return QUEUE_STAGES.indexOf(c.stage) !== -1; });
}
function contentQueueCount() { return contentQueue().length; }

const STAGE_RANK = { edited: 0, filmed: 1, scripted: 2, idea: 3 };

// Closest to done first, focus formats before the rest, oldest first.
function nextContentAction() {
  const focus = S().focus_formats || [];
  const list = db.content.filter(function (c) { return c.stage !== "posted"; }).sort(function (a, b) {
    const r = (STAGE_RANK[a.stage] || 0) - (STAGE_RANK[b.stage] || 0);
    if (r) return r;
    const fa = focus.indexOf(a.format) !== -1 ? 0 : 1;
    const fb = focus.indexOf(b.format) !== -1 ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
  });
  if (!list.length) return null;
  return { item: list[0], verb: NEXT_VERB[list[0].stage] || "Post", nextStage: NEXT_STAGE[list[0].stage] || "posted" };
}

// A video whose script exists but has not become a blog post yet. Posted ones
// first: the video is finished, the blog is the natural next move.
function blogCandidate() {
  const list = db.content.filter(function (c) { return c.stage !== "idea" && !c.blog_date; }).sort(function (a, b) {
    const pa = a.stage === "posted" ? 0 : 1, pb = b.stage === "posted" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
  });
  return list[0] || null;
}

// Posted count per format over the last n days.
function formatMix(n) {
  const keys = windowKeys(n);
  const lo = keys[0], hi = keys[keys.length - 1];
  return CONTENT_FORMATS.map(function (f) {
    return { value: f.value, label: f.label,
      count: db.content.filter(function (c) { return c.format === f.value && inRange(c.posted_date, lo, hi); }).length };
  });
}

/* ---------- Verse ---------- */

function verseOfDay() {
  return VERSES[(appNow().getDate() - 1) % VERSES.length];
}

/* ---------- Review helpers ---------- */

function dayStats(key) {
  const d = dayGet(key);
  return {
    key: key,
    dms: num(d.dms_sent),
    replies: db.leads.filter(function (l) { return l.replied_date === key; }).length,
    videos: videosPostedOn(key),
    blogs: db.content.filter(function (c) { return c.blog_date === key; }).length,
    comm: num(d.comm_minutes),
    screen: d.screen_minutes,
    parks: parksOn(key),
    closed: !!d.checkin_done,
    god: !!d.god_first,
    exercise: !!d.exercise
  };
}

// How many of the last n days he logged under target, split by the reason he
// gave. The "didn't feel like it" count sitting next to the reply rate is the
// whole argument of the Review page.
function skipReasonBreakdown(n) {
  const keys = windowKeys(n);
  const counts = {};
  SKIP_REASONS.forEach(function (r) { counts[r.value] = 0; });
  let closed = 0;
  keys.forEach(function (k) {
    const d = dayGet(k);
    if (!d.checkin_done) return;
    closed++;
    if (d.dm_skip_reason && counts[d.dm_skip_reason] !== undefined) counts[d.dm_skip_reason]++;
  });
  return { closed: closed, counts: counts };
}
