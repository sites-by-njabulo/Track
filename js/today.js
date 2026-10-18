/* ==========================================================
   12. TODAY
   ========================================================== */
// Four things: the countdown, the to-do list, content for today, goals.
// Nothing else. If yesterday was never closed, that comes first.

function renderToday() {
  const t = dayKey();
  const day = dayGet(t);
  const s = S();
  const gate = gateDayKey();
  const verse = verseOfDay();
  const streak = checkinStreak();
  const checks = checksFor(t);
  const tasks = tasksDueOn(t);
  const goal = primaryGoal();
  const plan = planToday();
  const hour = new Date().getHours();
  const evening = hour >= 20 || hour < DAY_START_HOUR;

  const streakEl = document.getElementById("sidebar-streak");
  if (streakEl) streakEl.textContent = streak ? plural(streak, "day") + " streak" : "Day one";

  const done = checks.filter(function (c) { return c.done; }).length;
  const total = checks.length + tasks.length;

  const deadline = goal && goal.deadline ? goal.deadline : lastOfMonth(t);
  const daysLeft = Math.max(0, daysFromToday(deadline));

  // On the phone the two icons sit under the Close button, not beside it.
  const actions =
    '<div class="topbar-stack">' +
      (day.checkin_done
        ? '<span class="pill tone-good closed-pill">' + ICONS.check + " Closed</span>"
        : '<button class="btn ' + (evening ? "btn-primary" : "btn-ghost") + '" id="today-close">' + ICONS.moon + "<span>Close the day</span></button>") +
      '<span class="topbar-icons">' +
        '<a class="icon-btn" href="' + CALENDAR_URL + '" target="_blank" rel="noopener" aria-label="Open Google Calendar" title="Google Calendar">' + ICONS.calendar + "</a>" +
        '<button class="icon-btn" id="today-hold" aria-label="Put a purchase on hold" title="Put a purchase on hold">' + ICONS.hand + "</button>" +
      "</span>" +
    "</div>";

  const html =
    pageHeader(greeting(gate, hour),
      '<span class="sub-long">' + escapeHtml(formatLongDate(t)) + '</span><span class="sub-short">' + escapeHtml(formatWeekday(t) + " " + formatShortDate(t)) + "</span>" +
      (streak ? '<span class="sub-extra"><span class="dot-sep"></span>' + plural(streak, "day") + " closed in a row</span>" : ""), actions) +
    '<div class="col">' +

    (gate
      ? '<section class="gate">' +
          '<div><p class="micro-label">Yesterday is still open</p>' +
          "<h2>" + escapeHtml(formatWeekday(gate)) + " was never closed.</h2>" +
          "<p>Thirty seconds, then today starts clean.</p></div>" +
          '<button class="btn btn-invert" id="gate-close">Close ' + escapeHtml(formatWeekday(gate)) + "</button>" +
        "</section>"
      : "") +

    // Countdown
    '<section class="goal-strip">' +
      '<div class="goal-cell"><span class="goal-num">' + daysLeft + "</span>" +
        '<span class="goal-lbl">' + (goal && goal.deadline ? "days left for " + escapeHtml(goal.title) : "days left in the month") + "</span></div>" +
      (goal && num(goal.amount) > 0
        ? '<div class="goal-cell goal-money"><span class="goal-num">' + formatUSD(goalCurrent(goal)) + "</span>" +
            '<span class="goal-lbl">of ' + formatUSD(goal.amount) + ", " + Math.round(goalRatio(goal) * 100) + "%</span>" +
            '<span class="goal-track"><span class="goal-fill' + (goalRatio(goal) >= 1 ? " hit" : "") + '" style="width:' + Math.round(goalRatio(goal) * 100) + '%"></span></span></div>'
        : "") +
      '<div class="goal-verse"><p>' + escapeHtml(verse.text) + "</p><cite>" + escapeHtml(verse.reference) + "</cite></div>" +
    "</section>" +

    // To-do list
    '<section class="panel">' +
      '<div class="panel-head"><h2>Today\'s to-do list</h2><span class="panel-meta">' + done + " of " + total + " done</span></div>" +
      '<ul class="task-list">' +
        checks.map(function (c) { return checkRow(c, plan); }).join("") +
        tasks.map(function (x) { return taskRow(x, t); }).join("") +
      "</ul>" +
      '<button class="add-row add-task-row" id="today-add-task">' + ICONS.plus + "<span>Add task</span></button>" +
    "</section>" +

    // Content: the whole week at a glance, so the plan is in front of him and
    // there is nothing to go looking for. (His words: he catches himself
    // hunting for viral formats when the week is already planned.)
    '<section class="panel">' +
      '<div class="panel-head"><h2>' + (planningNextWeek() ? "Content next week" : "Content this week") + '</h2><span class="panel-meta">' +
        CONTENT_LINKS.map(function (l) { return '<a class="doc-link" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener">' + escapeHtml(l.label) + " " + ICONS.external + "</a>"; }).join("") +
      "</span></div>" +
      contentWeekHtml(weekdayIndex(t)) +
    "</section>" +

    "</div>";

  document.getElementById("page-today").innerHTML = html;
  wireToday();
}

// Picked once per day per time bucket, so it reads the same all morning.
function greeting(gate, hour) {
  const bucket = gate && checkinStreak() === 0 ? "returns"
    : hour < DAY_START_HOUR || hour >= 22 ? "late"
    : hour < 8 ? "early" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const list = GREETINGS[bucket];
  const d = parseKey(dayKey());
  return list[(d.getDate() + d.getMonth()) % list.length].replace("{n}", USER_NAME);
}

function contentWeekHtml(todayIdx) {
  const next = planningNextWeek();
  if (next) todayIdx = -1;
  if (!contentPlanSet()) {
    return '<p class="panel-empty-text">Set your scripting, filming, editing and posting days on the Content page and the week shows here.</p>';
  }
  return '<ul class="plan-list compact week-strip">' + WEEKDAYS.map(function (name, i) {
    const p = contentPlanFor(i);
    const acts = planActs(p);
    const isToday = i === todayIdx;
    return '<li class="plan-row' + (isToday ? " today" : "") + (acts.length ? "" : " rest") + '" data-goto="content" tabindex="0">' +
      '<span class="plan-day">' + name.slice(0, 3) + (isToday ? '<span class="plan-today">Today</span>' : "") + "</span>" +
      '<span class="plan-label">' + (acts.length
        ? acts.map(function (a) { return '<span class="act-chip">' + a.label + "</span>"; }).join("")
        : "Off") +
        (p.notes && isToday ? '<span class="plan-notes">' + escapeHtml(p.notes) + "</span>" : "") + "</span>" +
    "</li>";
  }).join("") + "</ul>" +
  '<p class="panel-note">' + (next ? "Sunday after four: next week is on the board. Change any day on the Content page." : "The week is already planned. Nothing to go looking for.") + "</p>";
}

function checkRow(c, plan) {
  let label = c.label;
  let extra = "";
  let fixed = false;
  if (c.key === "exercise") {
    if (plan.rest) { label = "Rest day"; fixed = true; }
    else if (plan.label) label = "Exercise: " + plan.label;
    if (!plan.rest && planLinks(plan).length) extra = linksHtml(plan, "Video");
  }
  if (c.key === "blog_done") extra = '<span class="task-due">' + blogsThisWeek() + " of " + S().target_blogs + " this week</span>";
  if (c.key === "comm_done") {
    const cp = commPlanToday();
    if (cp.rest) { label = "Communication practice: rest day"; fixed = true; }
    else if (cp.label) label = "Communication practice: " + cp.label;
    if (!cp.rest && planLinks(cp).length) extra = linksHtml(cp, "Guide");
  }
  return '<li class="task-row check-row' + (c.done ? " done" : "") + '" data-check="' + c.key + '"' + (fixed ? ' data-fixed="1"' : "") + ">" +
    '<button class="todo-check" data-toggle aria-label="' + (c.done ? "Mark as not done" : "Mark as done") + '"' + (fixed ? " disabled" : "") + ">" + (c.done ? ICONS.check : "") + "</button>" +
    '<div class="task-body"><span class="task-title">' + escapeHtml(label) + "</span>" +
      (extra ? '<span class="task-meta">' + extra + "</span>" : "") + "</div>" +
  "</li>";
}

function wireToday() {
  const page = document.getElementById("page-today");
  const t = dayKey();

  const gateBtn = page.querySelector("#gate-close");
  if (gateBtn) gateBtn.addEventListener("click", function () { openCheckin(gateDayKey()); });

  const closeBtn = page.querySelector("#today-close");
  if (closeBtn) closeBtn.addEventListener("click", function () {
    if (gateDayKey()) { toast("Close yesterday first."); return; }
    openCheckin(t);
  });

  page.querySelector("#today-hold").addEventListener("click", function () { openHoldForm(null); });
  page.querySelector("#today-add-task").addEventListener("click", function () { openTaskForm(null, { due: t }); });

  page.querySelectorAll(".check-row").forEach(function (li) {
    if (li.dataset.fixed) return;
    li.querySelector("[data-toggle]").addEventListener("click", function () {
      const key = li.dataset.check;
      bumpDay(t, function (r) { const o = {}; o[key] = !r[key]; return o; });
      renderToday();
    });
  });

  wireTaskRows(page, renderToday);

  page.querySelectorAll("[data-goto]").forEach(function (el) {
    el.addEventListener("click", function () { showSection(el.dataset.goto); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showSection(el.dataset.goto); }
    });
  });

}
