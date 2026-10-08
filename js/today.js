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
  const goals = activeGoals();
  const goal = primaryGoal();
  const plan = planToday();
  const cplan = contentPlanFor(weekdayIndex(t));
  const next = nextContentAction();
  const nextDay = nextContentDay();
  const hour = new Date().getHours();
  const evening = hour >= 20 || hour < DAY_START_HOUR;

  const streakEl = document.getElementById("sidebar-streak");
  if (streakEl) streakEl.textContent = streak ? plural(streak, "day") + " streak" : "Day one";

  const done = checks.filter(function (c) { return c.done; }).length;
  const total = checks.length + tasks.length;

  const deadline = goal && goal.deadline ? goal.deadline : lastOfMonth(t);
  const daysLeft = Math.max(0, daysFromToday(deadline));

  const actions =
    '<a class="icon-btn" href="' + CALENDAR_URL + '" target="_blank" rel="noopener" aria-label="Open Google Calendar" title="Google Calendar">' + ICONS.calendar + "</a>" +
    '<button class="icon-btn" id="today-hold" aria-label="Put a purchase on hold" title="Put a purchase on hold">' + ICONS.hand + "</button>" +
    (day.checkin_done
      ? '<span class="pill tone-good closed-pill">' + ICONS.check + " Closed</span>"
      : '<button class="btn ' + (evening ? "btn-primary" : "btn-ghost") + '" id="today-close">' + ICONS.moon + "<span>Close the day</span></button>");

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
        ? '<div class="goal-cell goal-money"><span class="goal-num">' + formatUSD(goal.current) + "</span>" +
            '<span class="goal-lbl">of ' + formatUSD(goal.amount) + "</span>" +
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

    // Content
    '<section class="panel">' +
      '<div class="panel-head"><h2>Content</h2><span class="panel-meta">' +
        (weekTargetTotal() ? postedThisWeek() + " of " + weekTargetTotal() + " posted this week" : "") + "</span></div>" +
      contentTodayHtml(cplan, next, nextDay) +
    "</section>" +

    // Goals
    '<section class="panel">' +
      '<div class="panel-head"><h2>Goals</h2>' + (goals.length ? '<span class="panel-meta">' + plural(goals.length, "goal") + "</span>" : "") + "</div>" +
      (goals.length
        ? '<ul class="goal-list">' + goals.map(goalRow).join("") + "</ul>"
        : '<p class="panel-empty-text">What are you working toward, and by when? Put it here so the countdown has something to count.</p>') +
      '<button class="add-row" id="today-add-goal">' + ICONS.plus + "<span>Add goal</span></button>" +
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

function checkRow(c, plan) {
  let label = c.label;
  let extra = "";
  let fixed = false;
  if (c.key === "exercise") {
    if (plan.rest) { label = "Rest day"; fixed = true; }
    else if (plan.label) label = "Exercise: " + plan.label;
    if (!plan.rest && plan.video_url) {
      extra = '<a class="doc-link" href="' + escapeHtml(plan.video_url) + '" target="_blank" rel="noopener">Guide video ' + ICONS.external + "</a>";
    }
  }
  if (c.key === "blog_done") extra = '<span class="task-due">' + blogsThisWeek() + " of " + S().target_blogs + " this week</span>";
  return '<li class="task-row check-row' + (c.done ? " done" : "") + '" data-check="' + c.key + '"' + (fixed ? ' data-fixed="1"' : "") + ">" +
    '<button class="todo-check" data-toggle aria-label="' + (c.done ? "Mark as not done" : "Mark as done") + '"' + (fixed ? " disabled" : "") + ">" + (c.done ? ICONS.check : "") + "</button>" +
    '<div class="task-body"><span class="task-title">' + escapeHtml(label) + "</span>" +
      (extra ? '<span class="task-meta">' + extra + "</span>" : "") + "</div>" +
  "</li>";
}

function contentTodayHtml(cplan, next, nextDay) {
  const planned = contentPlanSet();
  const acts = planActs(cplan);
  if (planned && !acts.length) {
    return '<p class="content-today quiet">Nothing to do today.' +
      (nextDay ? " Next content day is " + WEEKDAYS[nextDay.weekday] + ": " + nextDay.acts.map(function (x) { return x.label.toLowerCase(); }).join(" and ") + "." : "") + "</p>";
  }
  if (!planned) {
    // No plan yet: fall back to the single furthest-behind action.
    return (next
      ? '<div class="next-line"><span class="next-verb">' + escapeHtml(next.verb) + '</span><span class="next-what">' + escapeHtml(next.title) + "</span>" +
        (next.item ? '<button class="btn btn-ghost btn-sm" data-advance-today="' + next.item.id + '">Done</button>' : "") + "</div>"
      : '<p class="content-today quiet">Nothing to do.</p>') +
      '<p class="panel-note">Set your scripting, filming, editing and posting days on the Content page and this shows only what today is for.</p>';
  }
  return '<p class="content-today-plan">' + acts.map(function (x) { return x.label; }).join(" and ") + " day</p>" +
    '<ul class="act-list">' + todayContentActions().map(function (ac) {
      return '<li class="next-line">' +
        '<span class="next-verb">' + escapeHtml(ac.verb) + "</span>" +
        '<span class="next-what' + (ac.title ? "" : " quiet") + '">' + escapeHtml(ac.title || ac.note) +
          (ac.title && ac.note ? ' <span class="next-week">' + escapeHtml(ac.note) + "</span>" : "") + "</span>" +
        (ac.item ? '<button class="btn btn-ghost btn-sm" data-advance-today="' + ac.item.id + '">Done</button>' : "") +
      "</li>";
    }).join("") + "</ul>";
}

function goalRow(g) {
  const d = g.deadline ? daysFromToday(g.deadline) : null;
  const hasAmount = num(g.amount) > 0;
  return '<li class="goal-row" data-goal="' + g.id + '" tabindex="0">' +
    '<div class="goal-row-top"><span class="goal-title">' + escapeHtml(g.title) + "</span>" +
      '<span class="goal-when' + (d !== null && d < 0 ? " cell-overdue" : "") + '">' +
        (d === null ? "" : d < 0 ? Math.abs(d) + " days past" : d === 0 ? "Today" : plural(d, "day") + " left") + "</span></div>" +
    (hasAmount
      ? '<div class="goal-row-figs"><span>' + formatUSD(g.current) + " of " + formatUSD(g.amount) + "</span><span>" + Math.round(goalRatio(g) * 100) + "%</span></div>" +
        '<span class="goal-track"><span class="goal-fill' + (goalRatio(g) >= 1 ? " hit" : "") + '" style="width:' + Math.round(goalRatio(g) * 100) + '%"></span></span>'
      : "") +
  "</li>";
}

const GOAL_FIELDS = [
  { key: "title",    label: "Goal",     type: "text", required: true, autofocus: true, placeholder: "$5,000 in client work" },
  { key: "deadline", label: "By when",  type: "date", half: true },
  { key: "amount",   label: "Amount, if it is money", type: "money", placeholder: "5000", half: true },
  { key: "current",  label: "Reached so far", type: "money", placeholder: "0", half: true },
  { key: "done",     label: "Done",     type: "checkbox", checkboxLabel: "Reached. Hide it." }
];

function openGoalForm(id) {
  const g = id ? byId("goals", id) : null;
  openForm({
    title: g ? "Edit goal" : "Add goal",
    fields: GOAL_FIELDS,
    values: g || { deadline: lastOfMonth(dayKey()) },
    saveLabel: g ? "Save" : "Add goal",
    onSave: function (values) {
      if (g) update("goals", id, values);
      else create("goals", values);
      renderSection(currentSectionName);
    },
    onDelete: g ? function () {
      confirmDelete("this goal", function () { remove("goals", id); renderSection(currentSectionName); });
    } : null
  });
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
  page.querySelector("#today-add-goal").addEventListener("click", function () { openGoalForm(null); });

  page.querySelectorAll(".check-row").forEach(function (li) {
    if (li.dataset.fixed) return;
    li.querySelector("[data-toggle]").addEventListener("click", function () {
      const key = li.dataset.check;
      bumpDay(t, function (r) { const o = {}; o[key] = !r[key]; return o; });
      renderToday();
    });
  });

  wireTaskRows(page, renderToday);

  page.querySelectorAll("[data-advance-today]").forEach(function (b) {
    b.addEventListener("click", function () { advanceContent(b.dataset.advanceToday); renderToday(); });
  });

  page.querySelectorAll("[data-goal]").forEach(function (li) {
    li.addEventListener("click", function () { openGoalForm(li.dataset.goal); });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGoalForm(li.dataset.goal); }
    });
  });
}
