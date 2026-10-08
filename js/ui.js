/* ==========================================================
   7. SHELL + NAV ROUTER
   ========================================================== */
// index.html contains one empty <section class="page" data-page="X"> per view.
// JS fills innerHTML.

const SECTIONS = [
  { name: "today",    label: "Today",    icon: "today" },
  { name: "tasks",    label: "Tasks",    icon: "tasks" },
  { name: "pipeline", label: "Pipeline", icon: "pipeline" },
  { name: "content",  label: "Content",  icon: "content" },
  { name: "exercise", label: "Exercise", icon: "exercise" },
  { name: "review",   label: "Review",   icon: "review" },
  { name: "settings", label: "Settings", icon: "settings" }
];

// The four that earn a spot in the mobile bottom bar, plus "More".
const MOBILE_PRIMARY = ["today", "tasks", "pipeline", "content"];

let currentSectionName = "today";

function showSection(name) {
  currentSectionName = name;
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.toggle("active", p.dataset.page === name);
  });
  document.querySelectorAll(".nav-item").forEach(function (b) {
    b.classList.toggle("active", b.dataset.section === name);
  });
  closeMoreSheet();
  renderSection(name);
  const main = document.getElementById("main-content");
  if (main) main.scrollTop = 0;
  window.scrollTo(0, 0);
}

function renderSection(name) {
  updateNavBadges();
  switch (name) {
    case "today":    renderToday();    break;
    case "tasks":    renderTasks();    break;
    case "pipeline": renderPipeline(); break;
    case "content":  renderContent();  break;
    case "exercise": renderExercise(); break;
    case "review":   renderReview();   break;
    case "settings": renderSettings(); break;
  }
}

// One badge only: follow-ups due on Pipeline. A badge on every item is
// wallpaper; a badge on one item is a prompt.
function updateNavBadges() {
  const due = typeof followUpsDue === "function" ? followUpsDue().length : 0;
  document.querySelectorAll('[data-badge="pipeline"]').forEach(function (el) {
    el.textContent = due;
    el.classList.toggle("hidden", due === 0);
  });
  const counts = navCounts();
  document.querySelectorAll("[data-count]").forEach(function (el) {
    const n = counts[el.dataset.count] || 0;
    el.textContent = n ? n : "";
  });
}

// Counts beside the nav items, Todoist-style: a quiet number, except the
// one that is actually late (follow-ups), which is red.
function navCounts() {
  if (typeof dayKey !== "function") return {};
  const t = dayKey();
  const open = db.tasks.filter(function (x) { return !x.done; });
  const ex = typeof exerciseStatus === "function" ? exerciseStatus(t) : null;
  return {
    today: topTasksFor(t).filter(function (x) { return !x.done; }).length,
    tasks: open.filter(function (x) { return (x.due && x.due <= t) || x.top_date === t; }).length,
    content: typeof weekTargetTotal === "function" && weekTargetTotal() ? Math.max(0, weekTargetTotal() - postedThisWeek()) : 0,
    exercise: ex ? ex.total - ex.done : 0
  };
}

function navItem(s, extraClass) {
  return '<button class="nav-item ' + (extraClass || "") + '" data-section="' + s.name + '" aria-label="' + s.label + '">' +
           '<span class="nav-icon">' + ICONS[s.icon] + "</span>" +
           '<span class="nav-label">' + s.label + "</span>" +
           (s.name === "pipeline"
             ? '<span class="nav-badge hidden" data-badge="pipeline"></span>'
             : '<span class="nav-count" data-count="' + s.name + '"></span>') +
         "</button>";
}

function buildNav() {
  document.getElementById("sidebar-nav").innerHTML = SECTIONS.map(function (s) { return navItem(s); }).join("");

  const primary = SECTIONS.filter(function (s) { return MOBILE_PRIMARY.indexOf(s.name) !== -1; });
  document.getElementById("mobile-nav").innerHTML =
    primary.map(function (s) { return navItem(s); }).join("") +
    '<button class="nav-item" id="more-btn" aria-label="More sections">' +
      '<span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg></span>' +
      '<span class="nav-label">More</span>' +
    "</button>";

  document.getElementById("more-sheet-list").innerHTML =
    SECTIONS.filter(function (s) { return MOBILE_PRIMARY.indexOf(s.name) === -1; })
      .map(function (s) { return navItem(s, "more-item"); }).join("");
}

function openMoreSheet() {
  document.getElementById("more-sheet").classList.add("open");
  document.getElementById("scrim").classList.add("visible");
}
function closeMoreSheet() {
  document.getElementById("more-sheet").classList.remove("open");
  syncScrim();
}
function anyOverlayOpen() {
  return ["modal", "sheet", "confirm", "more-sheet"].some(function (id) {
    return document.getElementById(id).classList.contains("open");
  });
}
function syncScrim() {
  document.getElementById("scrim").classList.toggle("visible", anyOverlayOpen());
}

function wireNav() {
  document.addEventListener("click", function (e) {
    if (e.target.closest("#more-btn")) {
      const sheet = document.getElementById("more-sheet");
      if (sheet.classList.contains("open")) closeMoreSheet();
      else openMoreSheet();
      return;
    }
    const btn = e.target.closest(".nav-item[data-section]");
    if (btn) showSection(btn.dataset.section);
  });
  const add = document.getElementById("sidebar-add-task");
  if (add) add.addEventListener("click", function () { openTaskForm(null, { due: dayKey() }); });
}


/* ---- Theme ----
   Per device, never synced. "system" follows prefers-color-scheme and is the
   default, so a new install matches the phone it opens on. The first paint is
   handled by the inline <head> script in index.html. */
function themeSetting() {
  try { return localStorage.getItem(KEYS.theme) || "system"; } catch (e) { return "system"; }
}
function resolveTheme(setting) {
  if (setting === "dark" || setting === "light") return setting;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(setting) {
  try { localStorage.setItem(KEYS.theme, setting); } catch (e) {}
  const t = resolveTheme(setting);
  if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "dark" ? "#08080a" : "#f4f4f6");
}
function wireTheme() {
  applyTheme(themeSetting());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (themeSetting() === "system") applyTheme("system");
  });
}


/* ==========================================================
   8. SHARED UI
   ========================================================== */

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function lookup(list, value) {
  return list.find(function (o) { return o.value === value; }) || { label: value, tone: "muted" };
}

function pill(list, value) {
  const o = lookup(list, value);
  return '<span class="pill tone-' + (o.tone || "muted") + '">' + escapeHtml(o.label) + "</span>";
}

// Every section opens with one of these so the app has a consistent spine.
// `actions` is raw HTML for the right-hand side.
function pageHeader(title, sub, actions) {
  return '<header class="topbar">' +
           '<div class="topbar-lead">' +
             '<h1 class="topbar-title">' + escapeHtml(title) + "</h1>" +
             (sub ? '<p class="topbar-sub">' + sub + "</p>" : "") +
           "</div>" +
           '<div class="topbar-actions">' + (actions || "") + "</div>" +
         "</header>";
}

function primaryAction(label, id) {
  return '<button class="btn btn-primary" id="' + id + '"><span class="btn-icon">' + ICONS.plus + "</span>" + escapeHtml(label) + "</button>";
}

function emptyState(icon, title, body) {
  return '<div class="empty-state">' +
           '<span class="empty-icon">' + ICONS[icon] + "</span>" +
           "<h3>" + escapeHtml(title) + "</h3>" +
           "<p>" + escapeHtml(body) + "</p>" +
         "</div>";
}

function statTile(label, value, meta, tone) {
  return '<div class="stat-tile' + (tone ? " tone-" + tone : "") + '">' +
           '<span class="stat-label">' + escapeHtml(label) + "</span>" +
           '<span class="stat-value">' + escapeHtml(value) + "</span>" +
           (meta ? '<span class="stat-meta">' + meta + "</span>" : "") +
         "</div>";
}

function segmented(id, options, active) {
  return '<div class="segmented" id="' + id + '">' +
    options.map(function (o) {
      return '<button data-value="' + escapeHtml(o.value) + '"' + (o.value === active ? ' class="active"' : "") + ">" +
             escapeHtml(o.label) + (o.count !== undefined ? ' <span class="chip-count">' + o.count + "</span>" : "") + "</button>";
    }).join("") + "</div>";
}


/* ---------- Toast ---------- */
let toastTimer = null;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove("visible"); }, 2400);
}


/* ---------- Generic form modal ----------
   field = { key, label, type, options, required, placeholder, hint, half } */

let modalOnSave = null;
let modalOnDelete = null;

function fieldMarkup(f, value) {
  const id = "f_" + f.key;
  const v = value === null || value === undefined ? "" : value;
  let input;

  if (f.type === "select") {
    input = '<select id="' + id + '" name="' + f.key + '">' +
      f.options.map(function (o) {
        return '<option value="' + escapeHtml(o.value) + '"' +
               (o.value === v ? " selected" : "") + ">" + escapeHtml(o.label) + "</option>";
      }).join("") + "</select>";
  } else if (f.type === "textarea") {
    input = '<textarea id="' + id + '" name="' + f.key + '" rows="3" placeholder="' +
            escapeHtml(f.placeholder || "") + '">' + escapeHtml(v) + "</textarea>";
  } else if (f.type === "checkbox") {
    input = '<label class="checkbox-row"><input type="checkbox" id="' + id + '" name="' + f.key + '"' +
            (v ? " checked" : "") + '><span class="checkbox-box">' + ICONS.check + "</span>" +
            "<span>" + escapeHtml(f.checkboxLabel || f.label) + "</span></label>";
    return '<div class="field' + (f.half ? " field-half" : "") + '">' + input +
           (f.hint ? '<span class="field-hint">' + escapeHtml(f.hint) + "</span>" : "") + "</div>";
  } else {
    const extra = (f.type === "money" || f.type === "number")
      ? ' type="text" inputmode="' + (f.type === "money" ? "decimal" : "numeric") + '"'
      : ' type="' + (f.type || "text") + '"';
    input = "<input" + extra + ' id="' + id + '" name="' + f.key + '" value="' +
            escapeHtml(v) + '" placeholder="' + escapeHtml(f.placeholder || "") + '"' +
            (f.type === "url" ? ' inputmode="url" autocapitalize="off" spellcheck="false"' : "") +
            (f.autofocus ? " data-autofocus" : "") + ">";
  }

  return '<div class="field' + (f.half ? " field-half" : "") + '">' +
           '<label for="' + id + '">' + escapeHtml(f.label) +
           (f.required ? ' <span class="req">required</span>' : "") + "</label>" +
           input +
           (f.hint ? '<span class="field-hint">' + escapeHtml(f.hint) + "</span>" : "") +
         "</div>";
}

function openForm(opts) {
  const modal = document.getElementById("modal");
  const values = opts.values || {};

  document.getElementById("modal-title").textContent = opts.title;
  document.getElementById("modal-fields").innerHTML =
    opts.fields.map(function (f) { return fieldMarkup(f, values[f.key]); }).join("");

  document.getElementById("modal-save").textContent = opts.saveLabel || "Save";
  document.getElementById("modal-delete").classList.toggle("hidden", !opts.onDelete);

  modal.dataset.fields = JSON.stringify(opts.fields.map(function (f) {
    return { key: f.key, type: f.type, required: !!f.required, label: f.label };
  }));
  modalOnSave = opts.onSave;
  modalOnDelete = opts.onDelete || null;

  modal.classList.add("open");
  syncScrim();

  // Desktop only: on a phone autofocus yanks the keyboard over the form.
  if (window.matchMedia("(min-width: 769px)").matches) {
    const first = document.querySelector("#modal-fields [data-autofocus], #modal-fields input, #modal-fields select, #modal-fields textarea");
    if (first) first.focus();
  }
}

function closeForm() {
  document.getElementById("modal").classList.remove("open");
  modalOnSave = null;
  modalOnDelete = null;
  syncScrim();
}

function readForm() {
  const modal = document.getElementById("modal");
  const spec = JSON.parse(modal.dataset.fields || "[]");
  const out = {};
  const missing = [];

  spec.forEach(function (f) {
    const el = document.getElementById("f_" + f.key);
    if (!el) return;
    if (f.type === "checkbox") { out[f.key] = el.checked; return; }
    let v = el.value.trim();
    if (f.required && !v) missing.push(f.label);
    if (f.type === "money" || f.type === "number") {
      out[f.key] = v === "" ? (f.type === "number" ? null : 0) : num(v.replace(/[^\d.-]/g, ""));
    } else if (f.type === "date" || f.type === "time") {
      out[f.key] = v || null;   // "" is rejected by Postgres for a date column
    } else {
      out[f.key] = v;
    }
  });

  if (missing.length) {
    toast("Fill in " + missing.join(" and ") + " first");
    return null;
  }
  return out;
}

function wireModal() {
  document.getElementById("modal-save").addEventListener("click", function () {
    const values = readForm();
    if (!values) return;
    const fn = modalOnSave;
    closeForm();
    if (fn) fn(values);
  });
  document.getElementById("modal-cancel").addEventListener("click", closeForm);
  document.getElementById("modal-close").addEventListener("click", closeForm);
  document.getElementById("modal-delete").addEventListener("click", function () {
    const fn = modalOnDelete;
    if (!fn) return;
    closeForm();
    fn();
  });

  document.getElementById("scrim").addEventListener("click", function () {
    closeForm();
    closeMoreSheet();
    closeConfirm();
    // The check-in sheet is deliberately NOT closed by a scrim tap: a stray
    // tap mid check-in would throw away four answered steps.
  });

  document.getElementById("modal-fields").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      document.getElementById("modal-save").click();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.getElementById("confirm").classList.contains("open")) { closeConfirm(); return; }
    if (document.getElementById("modal").classList.contains("open")) { closeForm(); return; }
    closeMoreSheet();
    closeSheet();
  });
}


/* ---------- Confirm dialog ---------- */
let confirmAction = null;

function confirmDialog(text, yesLabel, onYes, danger) {
  document.getElementById("confirm-text").textContent = text;
  const yes = document.getElementById("confirm-yes");
  yes.textContent = yesLabel || "Yes";
  yes.className = "btn " + (danger ? "btn-danger" : "btn-primary");
  document.getElementById("confirm").classList.add("open");
  syncScrim();
  confirmAction = onYes;
}
function confirmDelete(what, onYes) {
  confirmDialog("Delete " + what + "? This can't be undone from here.", "Delete", onYes, true);
}
function closeConfirm() {
  document.getElementById("confirm").classList.remove("open");
  confirmAction = null;
  syncScrim();
}
function wireConfirm() {
  document.getElementById("confirm-yes").addEventListener("click", function () {
    const fn = confirmAction;
    closeConfirm();
    if (fn) fn();
  });
  document.getElementById("confirm-no").addEventListener("click", closeConfirm);
}


/* ---------- Sheet ----------
   A taller sibling of the modal for multi-step flows (the night check-in and
   the Top 3 picker). Caller owns the inner markup and wiring. */
let sheetOnClose = null;

function openSheet(html, onClose) {
  const s = document.getElementById("sheet");
  s.querySelector(".sheet-body").innerHTML = html;
  s.classList.add("open");
  sheetOnClose = onClose || null;
  syncScrim();
  s.scrollTop = 0;
}
function sheetBody() { return document.getElementById("sheet").querySelector(".sheet-body"); }
function closeSheet() {
  const s = document.getElementById("sheet");
  if (!s.classList.contains("open")) return;
  s.classList.remove("open");
  const fn = sheetOnClose;
  sheetOnClose = null;
  syncScrim();
  if (fn) fn();
}
function wireSheet() {
  document.getElementById("sheet-close").addEventListener("click", closeSheet);
}
