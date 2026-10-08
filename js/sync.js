/* ==========================================================
   2. TABLE REGISTRY
   ========================================================== */
// The only place a table's client-side shape is declared. defaults() is spread
// underneath every row we read, local or remote, so a row written by an older
// build never renders `undefined` after a column is added.
//
// KEEP THIS IN SYNC WITH supabase/schema.sql. An upsert sends every key on the
// local row object, so a field that exists here but not in Postgres makes
// PostgREST reject the ENTIRE batch with PGRST204 and silently break every
// write to that table. Changed something here? Change schema.sql and re-run it.
//
// Stored vs derived, the rule of this app: anything he taps is stored on the
// day row; anything that is a fact about another record is derived at render.
// Videos posted today come from content.posted_date, blogs from
// content.blog_date, parks from days.focus_log, Top 3 from tasks.top_date,
// money from leads.won_date. Nothing stores its own total.
const TABLES = {
  tasks: () => ({
    title: "", notes: "", due: null, area: "", done: false, done_date: null, top_date: null
  }),
  leads: () => ({
    name: "", business: "", platform: "instagram", service: "web", stage: "replied",
    value: 0, notes: "", follow_up_date: null,
    replied_date: null, call_date: null, proposal_date: null, won_date: null, lost_date: null
  }),
  content: () => ({
    title: "", format: "other", stage: "scripted", link: "", posted_date: null, blog_date: null, notes: ""
  }),
  days: () => ({
    date: null, dms_sent: 0, comm_minutes: 0, god_first: false, exercise: false,
    screen_minutes: null, checkin_done: false, checkin_at: null, dm_skip_reason: null,
    better: null, journal: "", focus_task_id: null, focus_started_at: null, focus_log: []
  }),
  holds: () => ({ item: "", price: 0, hold_until: null, status: "holding", notes: "" }),
  exercises: () => ({ name: "", target: 0, unit: "reps", sort: 0, active: true }),
  exercise_logs: () => ({ date: null, exercise_id: null, amount: 0 }),
  settings: () => Object.assign({}, SETTINGS_DEFAULTS, { weekly_mix: Object.assign({}, SETTINGS_DEFAULTS.weekly_mix) })
};
const TABLE_NAMES = Object.keys(TABLES);

const LS_PREFIX = "track_";
const OUTBOX_KEY = "track_outbox";
const DEAD_KEY = "track_outbox_dead";


/* ==========================================================
   3. SYNC ENGINE
   ========================================================== */
// db.tasks, db.leads, ... are plain arrays. Every render function reads them
// synchronously and knows nothing about Supabase.

const db = {};
let outbox = readJson(OUTBOX_KEY, {});   // { "tasks:<uuid>": { table, row } }
let deadLetters = readJson(DEAD_KEY, {}); // rows Postgres will never accept
let flushTimer = null;
let flushing = false;
let retryTimer = null;
let didFirstPull = false;
let sbChannel = null;
let initialSync = Promise.resolve();

// serverNow - deviceNow, relearned on every pull. Every timestamp this app
// writes goes through nowIso(), because updated_at IS the conflict resolver.
let clockOffsetMs = 0;
function nowIso() { return new Date(Date.now() + clockOffsetMs).toISOString(); }

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn("Corrupt " + key + " in localStorage, starting fresh.", e);
    return fallback;
  }
}

// crypto.randomUUID is undefined outside a secure context (file://).
function newId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

// Deterministic uuid from a natural key. The days table is keyed by date and
// settings is a singleton: both devices must mint the SAME id for the same
// day, otherwise two offline taps create two contradictory rows. Four FNV-1a
// passes with different seeds -> 16 bytes shaped as a v5 uuid.
function stableId(seed) {
  const hex = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map(function (base) {
    let h = base >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-5" + hex.slice(13, 16) +
         "-8" + hex.slice(17, 20) + "-" + hex.slice(20, 32);
}
function dayId(key) { return stableId("day:" + key); }
function exLogId(key, exerciseId) { return stableId("ex:" + key + ":" + exerciseId); }
const SETTINGS_ID = stableId("settings");

// Boot: localStorage first, synchronously. db[t] holds LIVE rows only.
TABLE_NAMES.forEach(function (t) {
  db[t] = readJson(LS_PREFIX + t, []).map(function (r) {
    return Object.assign(TABLES[t](), r);
  });
});

function persist(t) {
  localStorage.setItem(LS_PREFIX + t, JSON.stringify(db[t]));
}

function byId(t, id) {
  return db[t].find(function (r) { return r.id === id; }) || null;
}


/* ---------- Writes: optimistic local first, network never blocks the UI ---- */

function create(table, fields, id) {
  const stamp = nowIso();
  const row = Object.assign(TABLES[table](), fields, {
    id: id || newId(),
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null
  });
  db[table].push(row);
  persist(table);
  queue(table, row);
  return row;
}

function update(table, id, fields) {
  const row = byId(table, id);
  if (!row) return null;
  Object.assign(row, fields);
  // Stamped BEFORE the request goes out so the realtime echo is recognisable.
  row.updated_at = nowIso();
  persist(table);
  queue(table, row);
  return row;
}

function remove(table, id) {
  const i = db[table].findIndex(function (r) { return r.id === id; });
  if (i === -1) return;
  const stamp = nowIso();
  // Soft delete: the row leaves memory now, a tombstone goes up.
  const tomb = Object.assign({}, db[table][i], { deleted_at: stamp, updated_at: stamp });
  db[table].splice(i, 1);  // splice, never reassign: render code closes over db[t]
  persist(table);
  queue(table, tomb);
}


/* ---------- Day rows and settings: natural keys ---------- */

// Read-only view of a day. Never creates a row, so rendering last week does
// not litter the table with empty days (and does not trip the yesterday gate).
function dayGet(key) {
  return byId("days", dayId(key)) || Object.assign(TABLES.days(), { date: key });
}

// Get-or-create, for writes only.
function dayRow(key) {
  return byId("days", dayId(key)) || create("days", { date: key }, dayId(key));
}

// The one write path for a day's counters and check-in fields.
function bumpDay(key, fields) {
  const r = dayRow(key);
  return update("days", r.id, typeof fields === "function" ? fields(r) : fields);
}

function S() {
  return byId("settings", SETTINGS_ID) || TABLES.settings();
}

function saveSettings(fields) {
  const row = byId("settings", SETTINGS_ID);
  if (row) return update("settings", SETTINGS_ID, fields);
  return create("settings", fields, SETTINGS_ID);
}


/* ---------- Outbox ---------- */
// A keyed map of desired row state, not an op log. Five offline edits to one
// task queue one entry. Replay is an idempotent upsert.
function queue(table, row) {
  outbox[table + ":" + row.id] = { table: table, row: Object.assign({}, row) };
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flushOutbox, 400);
}

async function flushOutbox() {
  if (!sb || flushing) return;
  const keys = Object.keys(outbox);
  if (!keys.length) { setSyncStatus("synced", 0); return; }
  flushing = true;

  const groups = {};
  keys.forEach(function (k) {
    const entry = outbox[k];
    if (!groups[entry.table]) groups[entry.table] = [];
    groups[entry.table].push([k, entry]);
  });

  let allOk = true;

  for (const table of Object.keys(groups)) {
    const batch = groups[table];
    const rows = batch.map(function (pair) { return pair[1].row; });
    let result;
    try {
      result = await sb.from(table).upsert(rows);
    } catch (e) {
      result = { error: { code: "NETWORK", message: String(e) } };
    }

    if (result.error) {
      allOk = false;
      const code = result.error.code || "";
      // 22xxx / 23xxx are permanent (bad data). Dead-letter them so they stop
      // blocking everything queued behind them. Anything else retries.
      if (/^2[23]/.test(code)) {
        batch.forEach(function (pair) {
          deadLetters[pair[0]] = { entry: pair[1], error: result.error.message };
          delete outbox[pair[0]];
        });
        localStorage.setItem(DEAD_KEY, JSON.stringify(deadLetters));
        console.error("Row permanently rejected by Postgres, moved to " + DEAD_KEY + ":", result.error);
      } else {
        console.warn("Sync push failed for " + table + "; rows stay queued.", result.error);
      }
      continue;
    }

    // Clear by object identity: a re-edit mid-flight replaced the entry and
    // that newer version must survive.
    batch.forEach(function (pair) {
      if (outbox[pair[0]] === pair[1]) delete outbox[pair[0]];
    });
  }

  localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  flushing = false;

  const pending = Object.keys(outbox).length;
  setSyncStatus(allOk ? "synced" : "offline", pending);
  clearTimeout(retryTimer);
  if (!allOk) retryTimer = setTimeout(flushOutbox, 15000);
}


/* ---------- The one merge rule, shared by pull, realtime and import ---------- */
// Newer wins by the row's own updated_at, compared as parsed Dates.
function applyRemote(table, remote) {
  const i = db[table].findIndex(function (r) { return r.id === remote.id; });
  const local = i === -1 ? null : db[table][i];

  if (local && new Date(remote.updated_at).getTime() <= new Date(local.updated_at).getTime()) {
    return false;
  }

  if (remote.deleted_at) {
    if (i === -1) return false;
    db[table].splice(i, 1);
    return true;
  }

  const merged = Object.assign(TABLES[table](), remote);
  if (i === -1) db[table].push(merged);
  else db[table][i] = merged;
  return true;
}

async function pullAll() {
  if (!sb) { setSyncStatus("local", 0); return; }
  setSyncStatus("syncing", Object.keys(outbox).length);
  try {
    const stamp = await sb.rpc("server_now");
    if (!stamp.error && stamp.data) {
      clockOffsetMs = new Date(stamp.data).getTime() - Date.now();
    }

    const results = await Promise.all(TABLE_NAMES.map(function (t) {
      return sb.from(t).select("*");
    }));

    let anyChanged = false;
    results.forEach(function (res, n) {
      if (res.error) throw res.error;
      const table = TABLE_NAMES[n];
      let changed = false;
      res.data.forEach(function (r) { if (applyRemote(table, r)) changed = true; });
      if (changed) { persist(table); anyChanged = true; }
    });
    if (anyChanged) scheduleRemoteRender();

    setSyncStatus("synced", Object.keys(outbox).length);
  } catch (e) {
    console.warn("Supabase pull failed; running on the localStorage copy.", e);
    setSyncStatus("offline", Object.keys(outbox).length);
  }
  flushOutbox();
}


/* ---------- Realtime ---------- */
// A liveness optimisation, never a correctness mechanism. Backed up by the
// pullAll() triggers below.
function subscribeToChanges() {
  if (!sb) return;
  let ch = sb.channel("track_changes");

  TABLE_NAMES.forEach(function (table) {
    ch = ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: table },
      function (payload) {
        if (payload.eventType === "DELETE") {
          const i = db[table].findIndex(function (r) { return r.id === payload.old.id; });
          if (i !== -1) { db[table].splice(i, 1); persist(table); scheduleRemoteRender(); }
          return;
        }
        if (applyRemote(table, payload.new)) { persist(table); scheduleRemoteRender(); }
      }
    );
  });

  ch.subscribe(function (status) {
    if (status === "SUBSCRIBED") {
      setSyncStatus("synced", Object.keys(outbox).length);
      if (didFirstPull) pullAll();
      didFirstPull = true;
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      setSyncStatus("offline", Object.keys(outbox).length);
    }
  });
  sbChannel = ch;
}

// Lazy client. The URL and key live in localStorage (entered on the Settings
// page), never in source, so the deployed repo holds no secrets. Re-callable:
// Settings calls it again after saving new values.
function supabaseConfigured() {
  const url = localStorage.getItem(KEYS.sbUrl) || "";
  const key = localStorage.getItem(KEYS.sbKey) || "";
  return /^https:\/\/.+/.test(url) && key.length > 20;
}

function connectSupabase() {
  if (sbChannel && sb) {
    try { sb.removeChannel(sbChannel); } catch (e) {}
    sbChannel = null;
  }
  didFirstPull = false;
  if (window.supabase && supabaseConfigured()) {
    sb = window.supabase.createClient(
      localStorage.getItem(KEYS.sbUrl),
      localStorage.getItem(KEYS.sbKey),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  } else {
    sb = null;
  }
  initialSync = pullAll();
  if (sb) subscribeToChanges();
  return initialSync;
}

// Apply remote data instantly, defer only the repaint, so a change from the
// phone never yanks the caret out of a field the laptop is typing in.
let remoteRenderPending = false;

function isTypingInTextField() {
  const el = document.activeElement;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function scheduleRemoteRender() {
  if (remoteRenderPending) return;
  remoteRenderPending = true;
  const run = function () {
    if (isTypingInTextField()) {
      document.addEventListener("focusout", run, { once: true });
      return;
    }
    remoteRenderPending = false;
    if (typeof renderSection === "function" && typeof appReady !== "undefined" && appReady) {
      renderSection(currentSectionName);
    }
  };
  requestAnimationFrame(run);
}

window.addEventListener("online", pullAll);
window.addEventListener("offline", function () {
  setSyncStatus("offline", Object.keys(outbox).length);
});
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) pullAll();
});


/* ---------- Export / import (Settings) ---------- */

function exportAll() {
  const out = { app: "track", exported_at: nowIso(), tables: {} };
  TABLE_NAMES.forEach(function (t) { out.tables[t] = db[t]; });
  return out;
}

// Merge, never replace: imported rows win only if newer, and every accepted
// row is queued so the other device gets it too.
function importAll(data) {
  if (!data || !data.tables) throw new Error("Not a Track export file.");
  let count = 0;
  TABLE_NAMES.forEach(function (t) {
    const rows = data.tables[t] || [];
    let changed = false;
    rows.forEach(function (r) {
      if (!r || !r.id) return;
      if (applyRemote(t, r)) { changed = true; count++; queue(t, Object.assign(TABLES[t](), r)); }
    });
    if (changed) persist(t);
  });
  return count;
}


/* ==========================================================
   4. SYNC STATUS INDICATOR
   ========================================================== */
let syncState = { mode: "local", pending: 0 };

function setSyncStatus(mode, pending) {
  syncState = { mode: mode, pending: pending || 0 };
  renderSyncStatus();
}

function syncLabel() {
  if (syncState.mode === "local") return { label: "Local only", tone: "muted" };
  if (syncState.mode === "offline") {
    return { label: syncState.pending ? syncState.pending + " waiting to sync" : "Offline", tone: "warn" };
  }
  if (syncState.mode === "syncing") return { label: "Syncing", tone: "muted" };
  return { label: syncState.pending ? syncState.pending + " waiting to sync" : "Synced",
           tone: syncState.pending ? "warn" : "good" };
}

function renderSyncStatus() {
  const s = syncLabel();
  document.querySelectorAll("[data-sync-status]").forEach(function (el) {
    el.className = el.className.replace(/tone-\w+/g, "").trim() + " tone-" + s.tone;
    el.innerHTML = '<span class="sync-dot"></span><span>' + s.label + "</span>";
  });
}

// Fired at script load, awaited (capped) by the bootstrap in js/boot.js.
connectSupabase();
