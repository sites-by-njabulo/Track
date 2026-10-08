/* ==========================================================
   12. TODAY
   ========================================================== */
// The screen that replaces the notebook. Top to bottom: close yesterday if it
// is still open, the goal, the one thing in focus, the three for today, the
// numbers, what content needs next, who to follow up.

let focusTimer = null;

function renderToday() {
  const t = dayKey();
  const day = dayGet(t);
  const s = S();
  const gate = gateDayKey();
  const focus = activeFocus();
  const goal = goalProgress();
  const verse = verseOfDay();
  const top = topTasksFor(t);
  const streak = checkinStreak();
  const hour = new Date().getHours();
  const evening = hour >= 20 || hour < DAY_START_HOUR;
  const next = nextContentAction();
  const blog = blogCandidate();
  const follow = followUpsDue();
  const videos = videosPostedOn(t);
  const blogs = blogsThisWeek();
  const dmTarget = num(s.target_dms), commTarget = num(s.target_comm);

  const streakEl = document.getElementById("sidebar-streak");
  if (streakEl) streakEl.textContent = streak ? plural(streak, "day") + " streak" : "Day one";

  const exSt = exerciseStatus(t);
  const hits = [num(day.dms_sent) >= dmTarget, videos >= num(s.target_videos), num(day.comm_minutes) >= commTarget,
                !!day.god_first, exerciseDoneOn(t), blogs >= num(s.target_blogs)].filter(Boolean).length;

  const actions =
    '<a class="icon-btn" href="' + CALENDAR_URL + '" target="_blank" rel="noopener" aria-label="Open Google Calendar" title="Google Calendar">' + ICONS.calendar + "</a>" +
    '<button class="icon-btn" id="today-hold" aria-label="Put a purchase on hold" title="Put a purchase on hold">' + ICONS.hand + "</button>" +
    (day.checkin_done
      ? '<span class="pill tone-good closed-pill">' + ICONS.check + " Closed</span>"
      : '<button class="btn ' + (evening ? "btn-primary" : "btn-ghost") + '" id="today-close">' + ICONS.moon + "<span>Close the day</span></button>");

  const html =
    pageHeader("Today",
      '<span class="sub-long">' + escapeHtml(formatLongDate(t)) + '</span><span class="sub-short">' + escapeHtml(formatWeekday(t) + " " + formatShortDate(t)) + "</span>" +
      (streak ? '<span class="sub-extra"><span class="dot-sep"></span>' + plural(streak, "day") + " closed in a row</span>" : ""), actions) +
    '<div class="col">' +

    (gate
      ? '<section class="gate">' +
          '<div><p class="micro-label">Yesterday is still open</p>' +
          "<h2>" + escapeHtml(formatWeekday(gate)) + " was never closed.</h2>" +
          "<p>Thirty seconds. Then today starts decided instead of guessed.</p></div>" +
          '<button class="btn btn-invert" id="gate-close">Close ' + escapeHtml(formatWeekday(gate)) + "</button>" +
        "</section>"
      : "") +

    // Goal strip
    '<section class="goal-strip">' +
      '<div class="goal-cell"><span class="goal-num">' + (goal.daysLeft === null ? "" : Math.max(0, goal.daysLeft)) + "</span>" +
        '<span class="goal-lbl">' + (goal.daysLeft !== null && goal.daysLeft < 0 ? "days past the deadline" : "days left") + "</span></div>" +
      '<div class="goal-cell goal-money"><span class="goal-num">' + formatUSD(goal.won) + "</span>" +
        '<span class="goal-lbl">of ' + formatUSD(goal.target) + " won</span>" +
        '<span class="goal-track"><span class="goal-fill' + (goal.ratio >= 1 ? " hit" : "") + '" style="width:' + Math.min(100, Math.round(goal.ratio * 100)) + '%"></span></span></div>' +
      '<div class="goal-verse"><p>' + escapeHtml(verse.text) + "</p><cite>" + escapeHtml(verse.reference) + "</cite></div>" +
    "</section>" +

    // Now
    (focus
      ? '<section class="now active">' +
          '<p class="micro-label">Now</p>' +
          '<h2 class="now-title">' + (focus.task ? escapeHtml(focus.task.title) : "This task was deleted") + "</h2>" +
          '<div class="now-timer" id="focus-elapsed">00:00</div>' +
          '<p class="now-sub">Started ' + escapeHtml(formatTime(focus.row.focus_started_at)) + ". One thing. Finish it or park it, nothing in between.</p>" +
          '<div class="now-actions">' +
            '<button class="btn btn-primary" id="focus-finish">' + ICONS.check + "<span>Finished</span></button>" +
            '<button class="btn btn-ghost" id="focus-park">' + ICONS.flag + "<span>Park</span></button>" +
          "</div>" +
        "</section>"
      : '<section class="now idle">' +
          '<p class="micro-label">Now</p>' +
          '<h2 class="now-title">Nothing in focus</h2>' +
          '<p class="now-sub">' + (top.filter(function (x) { return !x.done; }).length
            ? "Press play on one of your three. The rest fade until it is done."
            : (top.length ? "All three done. Pick one more from Tasks if there is daylight left." : "Pick your three first. Then press play on one.")) + "</p>" +
        "</section>") +

    // Top 3
    '<section class="panel top-panel' + (focus ? " dimmed" : "") + '">' +
      '<div class="panel-head"><h2>Top 3</h2><span class="panel-meta">' +
        (top.length ? top.filter(function (x) { return x.done; }).length + " of " + top.length + " done" : "none picked") + "</span></div>" +
      (top.length ? '<ul class="task-list top-list">' + top.map(function (x, i) { return topRow(x, i, focus); }).join("") + "</ul>" : "") +
      (gate
        ? '<p class="locked-note">' + ICONS.lock + " Locked until yesterday is closed.</p>"
        : (top.length < TOP_LIMIT
            ? '<button class="add-row" id="top-pick">' + ICONS.plus + "<span>" + (top.length ? "Pick another" : "Pick today's three") + "</span></button>"
            : "")) +
    "</section>" +

    // Numbers
    '<section class="panel">' +
      '<div class="panel-head"><h2>Today\'s numbers</h2><span class="panel-meta">' + hits + " of 6</span></div>" +
      '<ul class="track-list">' +
        trackRow("message", "DMs sent", "target " + dmTarget, num(day.dms_sent) >= dmTarget,
          stepper("dm", num(day.dms_sent), dmTarget, [1, 5], "")) +
        '<li class="track-math">' + escapeHtml(dmMathLine(30)) + "</li>" +
        trackRow("video", "Videos posted", "target " + num(s.target_videos) + ", counted from Content", videos >= num(s.target_videos),
          '<span class="step-val">' + videos + "<small>/" + num(s.target_videos) + "</small></span>" +
          '<button class="btn btn-ghost btn-sm" id="log-post">Log a post</button>') +
        trackRow("mic", "Communication practice", "target " + minutesLabel(commTarget), num(day.comm_minutes) >= commTarget,
          stepper("comm", num(day.comm_minutes), commTarget, [15, 30], " min")) +
        toggleRow("god_first", "book", "Time with God before the phone", !!day.god_first) +
        (exSt
          ? trackRow("exercise", "Exercise", exSt.done + " of " + exSt.total + " done", exSt.all,
              '<span class="step-val">' + exSt.done + "<small>/" + exSt.total + "</small></span>" +
              '<button class="btn btn-ghost btn-sm" data-goto="exercise">Open</button>')
          : toggleRow("exercise", "exercise", "Exercise", !!day.exercise)) +
        trackRow("book", "Blog posts this week", "target " + num(s.target_blogs) + " a week", blogs >= num(s.target_blogs),
          '<span class="step-val">' + blogs + "<small>/" + num(s.target_blogs) + "</small></span>" +
          (blog ? '<button class="btn btn-ghost btn-sm" id="blog-done" title="' + escapeHtml(blog.title) + '">Published one</button>' : "")) +
      "</ul>" +
    "</section>" +

    // Content next
    '<section class="panel next-card">' +
      '<div class="panel-head"><h2>Content</h2><span class="panel-meta">' +
        (weekTargetTotal() ? postedThisWeek() + " of " + weekTargetTotal() + " posted this week" : plural(contentInProgress().length, "video") + " in progress") + "</span></div>" +
      (next
        ? '<div class="next-line"><span class="next-verb">' + escapeHtml(next.verb) + '</span><span class="next-what">' + escapeHtml(next.title) +
            (next.format ? ' <span class="next-week">' + escapeHtml(next.format.label) + ", " + next.format.posted + " of " + next.format.target + " this week</span>" : "") + "</span>" +
          (next.item
            ? '<button class="btn btn-ghost btn-sm" id="content-advance" data-id="' + next.item.id + '">Done</button>'
            : '<button class="btn btn-ghost btn-sm" data-goto="content">Open</button>') + "</div>"
        : '<p class="panel-empty-text">' + (weekTargetTotal() ? "Every format is at its weekly target. Post anything you like." : "Set a weekly mix in Settings and this tells you what to make.") + "</p>") +
    "</section>" +

    // Follow-ups
    (follow.length
      ? '<section class="panel"><div class="panel-head"><h2>Follow up</h2><span class="panel-meta">' + follow.length + " due</span></div>" +
          '<ul class="mini-list">' + follow.map(function (l) {
            const d = daysFromToday(l.follow_up_date);
            return '<li class="follow-row" data-lead="' + l.id + '"><div><strong>' + escapeHtml(l.name) + "</strong>" +
              (l.business ? '<span class="cell-sub">' + escapeHtml(l.business) + "</span>" : "") + "</div>" +
              '<span class="' + (d < 0 ? "cell-overdue" : "cell-due") + '">' + escapeHtml(relativeDayLabel(l.follow_up_date)) + "</span></li>";
          }).join("") + "</ul></section>"
      : "") +

    "</div>";

  document.getElementById("page-today").innerHTML = html;
  wireToday(focus);
}

function topRow(x, i, focus) {
  const isFocus = focus && focus.row.focus_task_id === x.id;
  return '<li class="task-row top-row' + (x.done ? " done" : "") + (isFocus ? " in-focus" : "") + '" data-id="' + x.id + '">' +
    '<button class="todo-check" data-toggle aria-label="' + (x.done ? "Mark as not done" : "Mark as done") + '">' + (x.done ? ICONS.check : "") + "</button>" +
    '<div class="task-body" data-edit tabindex="0"><span class="task-title">' + escapeHtml(x.title) + "</span>" +
      (isFocus ? '<span class="task-meta">In focus</span>' : "") + "</div>" +
    (x.done || isFocus ? "" : '<button class="icon-btn play-btn" data-start aria-label="Start this task">' + ICONS.play + "</button>") +
  "</li>";
}

function trackRow(icon, label, sub, hit, control) {
  return '<li class="track-row' + (hit ? " hit" : "") + '">' +
    '<span class="track-icon">' + ICONS[icon] + "</span>" +
    '<div class="track-body"><strong>' + escapeHtml(label) + (hit ? '<span class="hit-mark">' + ICONS.check + "</span>" : "") + "</strong>" +
      '<span class="track-sub">' + escapeHtml(sub) + "</span></div>" +
    '<div class="track-control">' + control + "</div>" +
  "</li>";
}

function stepper(key, value, target, steps, unit) {
  return '<div class="stepper">' +
    '<button class="step-btn" data-' + key + '="-' + steps[0] + '" aria-label="Minus ' + steps[0] + '">' + ICONS.minus + "</button>" +
    '<span class="step-val">' + value + "<small>/" + target + unit + "</small></span>" +
    steps.map(function (n) { return '<button class="step-btn" data-' + key + '="' + n + '">+' + n + "</button>"; }).join("") +
  "</div>";
}

function toggleRow(key, icon, label, on) {
  return '<li class="track-row toggle' + (on ? " hit" : "") + '" data-toggle-day="' + key + '" role="button" tabindex="0" aria-pressed="' + on + '">' +
    '<span class="track-icon">' + ICONS[icon] + "</span>" +
    '<div class="track-body"><strong>' + escapeHtml(label) + "</strong></div>" +
    '<span class="habit-check">' + (on ? ICONS.check : "") + "</span>" +
  "</li>";
}


/* ---------- Focus ---------- */

function startFocus(taskId) {
  const f = activeFocus();
  if (f) {
    if (f.row.focus_task_id === taskId) return;
    promptPark(function () { startFocus(taskId); });
    return;
  }
  bumpDay(dayKey(), { focus_task_id: taskId, focus_started_at: nowIso() });
  renderToday();
}

// Every block ends in the log, with how it ended. Parks are what Review counts.
function endFocus(outcome, reason, silent) {
  const f = activeFocus();
  if (!f) return;
  const entry = {
    task_id: f.row.focus_task_id,
    title: f.task ? f.task.title : "",
    started_at: f.row.focus_started_at,
    ended_at: nowIso(),
    outcome: outcome,
    reason: reason || null
  };
  update("days", f.row.id, {
    focus_log: (f.row.focus_log || []).concat([entry]),
    focus_task_id: null,
    focus_started_at: null
  });
  if (outcome === "finished" && f.task && !f.task.done) {
    update("tasks", f.task.id, { done: true, done_date: dayKey() });
  }
  stopFocusTimer();
  if (!silent) toast(outcome === "finished" ? "Finished. Next." : "Parked.");
}

function promptPark(then) {
  openForm({
    title: "Park this task?",
    fields: [{ key: "reason", label: "What pulled you off it", type: "select", options: PARK_REASONS }],
    values: { reason: "pulled" },
    saveLabel: "Park it",
    onSave: function (v) {
      endFocus("parked", v.reason, true);
      if (then) then(); else renderToday();
    }
  });
}

function startFocusTimer() {
  stopFocusTimer();
  const tick = function () {
    const el = document.getElementById("focus-elapsed");
    const f = activeFocus();
    if (!el || !f) { stopFocusTimer(); return; }
    // One text node, never a re-render: a re-render every second would steal
    // focus from any field being typed in.
    el.textContent = elapsedLabel(Date.now() + clockOffsetMs - new Date(f.row.focus_started_at).getTime());
  };
  tick();
  focusTimer = setInterval(tick, 1000);
}
function stopFocusTimer() {
  if (focusTimer) { clearInterval(focusTimer); focusTimer = null; }
}


/* ---------- Wiring ---------- */

function wireToday(focus) {
  const page = document.getElementById("page-today");
  const t = dayKey();

  if (focus) startFocusTimer(); else stopFocusTimer();

  const gateBtn = page.querySelector("#gate-close");
  if (gateBtn) gateBtn.addEventListener("click", function () { openCheckin(gateDayKey()); });

  const closeBtn = page.querySelector("#today-close");
  if (closeBtn) closeBtn.addEventListener("click", function () {
    const g = gateDayKey();
    if (g) { toast("Close yesterday first."); return; }
    openCheckin(t);
  });

  page.querySelector("#today-hold").addEventListener("click", function () { openHoldForm(null); });

  const finish = page.querySelector("#focus-finish");
  if (finish) finish.addEventListener("click", function () { endFocus("finished"); renderToday(); });
  const park = page.querySelector("#focus-park");
  if (park) park.addEventListener("click", function () { promptPark(null); });

  const pick = page.querySelector("#top-pick");
  if (pick) pick.addEventListener("click", function () { openTopPicker(t, renderToday); });

  page.querySelectorAll(".top-row").forEach(function (li) {
    const id = li.dataset.id;
    li.querySelector("[data-toggle]").addEventListener("click", function () {
      const x = byId("tasks", id);
      setTaskDone(id, !x.done);
      renderToday();
    });
    const start = li.querySelector("[data-start]");
    if (start) start.addEventListener("click", function () { startFocus(id); });
    const body = li.querySelector("[data-edit]");
    body.addEventListener("click", function () { openTaskForm(id); });
    body.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTaskForm(id); }
    });
  });

  page.querySelectorAll("[data-dm]").forEach(function (b) {
    b.addEventListener("click", function () {
      const delta = Number(b.dataset.dm);
      bumpDay(t, function (r) { return { dms_sent: Math.max(0, num(r.dms_sent) + delta) }; });
      renderToday();
    });
  });
  page.querySelectorAll("[data-comm]").forEach(function (b) {
    b.addEventListener("click", function () {
      const delta = Number(b.dataset.comm);
      bumpDay(t, function (r) { return { comm_minutes: Math.max(0, num(r.comm_minutes) + delta) }; });
      renderToday();
    });
  });
  page.querySelectorAll("[data-toggle-day]").forEach(function (li) {
    const flip = function () {
      const key = li.dataset.toggleDay;
      bumpDay(t, function (r) { const o = {}; o[key] = !r[key]; return o; });
      renderToday();
    };
    li.addEventListener("click", flip);
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
    });
  });

  const logPost = page.querySelector("#log-post");
  if (logPost) logPost.addEventListener("click", logPostQuick);

  const blogBtn = page.querySelector("#blog-done");
  if (blogBtn) blogBtn.addEventListener("click", function () {
    const b = blogCandidate();
    if (!b) return;
    confirmDialog("Published the blog post for \"" + b.title + "\"?", "Yes, published", function () {
      markBlogPublished(b.id);
      renderToday();
    });
  });

  const adv = page.querySelector("#content-advance");
  if (adv) adv.addEventListener("click", function () { advanceContent(adv.dataset.id); renderToday(); });

  page.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { showSection(b.dataset.goto); });
  });
  page.querySelectorAll("[data-lead]").forEach(function (li) {
    li.addEventListener("click", function () { openLeadForm(li.dataset.lead); });
  });
}
