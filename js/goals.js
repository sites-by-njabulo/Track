/* ==========================================================
   10c. GOALS
   ========================================================== */
// What he is working toward, and what has come in. A money goal's progress
// is the sum of its entries ("Themba, $1,500"), never a typed total.

const GOAL_FIELDS = [
  { key: "title",    label: "Goal",     type: "text", required: true, autofocus: true, placeholder: "$5,000 in client work" },
  { key: "deadline", label: "By when",  type: "date", half: true },
  { key: "amount",   label: "Amount, if it is money", type: "money", placeholder: "5000", half: true },
  { key: "done",     label: "Done",     type: "checkbox", checkboxLabel: "Reached. Hide it." }
];

const ENTRY_FIELDS = [
  { key: "amount", label: "Amount", type: "money", required: true, autofocus: true, placeholder: "1500", hint: "USD", half: true },
  { key: "date",   label: "Date",   type: "date", half: true },
  { key: "note",   label: "From",   type: "text", placeholder: "Themba, plumbing site" }
];

function renderGoals() {
  const goals = activeGoals();
  const reached = db.goals.filter(function (g) { return g.done; });
  const primary = primaryGoal();

  const sub = primary && num(primary.amount) > 0
    ? '<span class="sub-check">' + ICONS.check + "</span>" + formatUSD(goalCurrent(primary)) + " of " + formatUSD(primary.amount) + ", " + Math.round(goalRatio(primary) * 100) + "%"
    : plural(goals.length, "goal");

  const html =
    pageHeader("Goals", sub, '<button class="btn btn-ghost btn-sm" id="goals-add">' + ICONS.plus + "<span>Add goal</span></button>") +
    '<div class="col">' +
    (goals.length
      ? goals.map(goalSection).join("")
      : '<p class="panel-empty-text">What are you working toward, and by when? Add a goal so the countdown on Today has something to count.</p>') +
    (reached.length
      ? '<div class="todo-done-block"><p class="group-label">Reached</p><ul class="goal-list">' + reached.map(function (g) {
          return '<li class="goal-row settled" data-edit-goal="' + g.id + '" tabindex="0"><div class="goal-row-top"><span class="goal-title">' + escapeHtml(g.title) + "</span>" +
            (num(g.amount) ? '<span class="goal-when">' + formatUSD(goalCurrent(g)) + "</span>" : "") + "</div></li>";
        }).join("") + "</ul></div>"
      : "") +
    "</div>";

  document.getElementById("page-goals").innerHTML = html;
  wireGoals();
}

function goalSection(g) {
  const d = g.deadline ? daysFromToday(g.deadline) : null;
  const hasAmount = num(g.amount) > 0;
  const cur = goalCurrent(g);
  const entries = goalEntries(g.id);
  return '<section class="panel goal-section">' +
    '<div class="panel-head"><h2 data-edit-goal="' + g.id + '" tabindex="0" class="goal-edit">' + escapeHtml(g.title) + "</h2>" +
      '<span class="panel-meta' + (d !== null && d < 0 ? " cell-overdue" : "") + '">' +
        (d === null ? "" : d < 0 ? Math.abs(d) + " days past" : d === 0 ? "Today" : plural(d, "day") + " left" + (g.deadline ? ", " + formatShortDate(g.deadline) : "")) + "</span></div>" +
    (hasAmount
      ? '<div class="goal-big"><span class="goal-num">' + formatUSD(cur) + '</span><span class="goal-lbl">of ' + formatUSD(g.amount) +
          (cur < num(g.amount) ? ", " + formatUSD(num(g.amount) - cur) + " to go" : ", reached") + "</span>" +
          '<span class="goal-pct">' + Math.round(goalRatio(g) * 100) + "%</span></div>" +
        '<span class="goal-track"><span class="goal-fill' + (goalRatio(g) >= 1 ? " hit" : "") + '" style="width:' + Math.round(goalRatio(g) * 100) + '%"></span></span>' +
        (entries.length
          ? '<ul class="entry-list">' + entries.map(function (e) {
              return '<li class="entry-row" data-entry="' + e.id + '" tabindex="0"><span class="entry-note">' + escapeHtml(e.note || "Income") +
                '<span class="cell-sub">' + escapeHtml(formatShortDate(e.date)) + "</span></span>" +
                '<strong class="num">' + formatUSD(e.amount) + "</strong></li>";
            }).join("") + "</ul>"
          : '<p class="panel-empty-text">Nothing logged yet. The first client goes here.</p>') +
        '<button class="add-row" data-add-entry="' + g.id + '">' + ICONS.plus + "<span>Log what came in</span></button>"
      : '<p class="panel-empty-text">Not a money goal. Tap the title to edit it, or tick it done when it is reached.</p>') +
  "</section>";
}

function openGoalForm(id) {
  const g = id ? byId("goals", id) : null;
  openForm({
    title: g ? "Edit goal" : "Add goal",
    fields: GOAL_FIELDS,
    values: g || { deadline: lastOfMonth(dayKey()) },
    saveLabel: g ? "Save" : "Add goal",
    onSave: function (values) {
      if (g) update("goals", id, values);
      else create("goals", Object.assign(values, { sort: db.goals.length }));
      renderSection(currentSectionName);
    },
    onDelete: g ? function () {
      confirmDelete("this goal and everything logged against it", function () {
        goalEntries(id).forEach(function (e) { remove("goal_entries", e.id); });
        remove("goals", id);
        renderSection(currentSectionName);
      });
    } : null
  });
}

function openEntryForm(goalId, entryId, after) {
  if (typeof entryId === "function") { after = entryId; entryId = null; }
  const e = entryId ? byId("goal_entries", entryId) : null;
  const g = byId("goals", goalId);
  openForm({
    title: e ? "Edit" : "Log what came in" + (g ? " for " + g.title : ""),
    fields: ENTRY_FIELDS,
    values: e || { date: dayKey() },
    saveLabel: e ? "Save" : "Log it",
    onSave: function (values) {
      if (e) update("goal_entries", entryId, values);
      else {
        create("goal_entries", Object.assign(values, { goal_id: goalId }));
        toast(formatUSD(values.amount) + " logged. " + (g && num(g.amount) ? Math.round(goalRatio(g) * 100) + "% of " + g.title + "." : ""));
      }
      if (after) after(); else renderSection(currentSectionName);
    },
    onDelete: e ? function () {
      confirmDelete("this entry", function () { remove("goal_entries", entryId); renderSection(currentSectionName); });
    } : null
  });
}

function wireGoals() {
  const page = document.getElementById("page-goals");
  page.querySelector("#goals-add").addEventListener("click", function () { openGoalForm(null); });
  page.querySelectorAll("[data-edit-goal]").forEach(function (el) {
    el.addEventListener("click", function () { openGoalForm(el.dataset.editGoal); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGoalForm(el.dataset.editGoal); }
    });
  });
  page.querySelectorAll("[data-add-entry]").forEach(function (b) {
    b.addEventListener("click", function () { openEntryForm(b.dataset.addEntry); });
  });
  page.querySelectorAll("[data-entry]").forEach(function (li) {
    const e = byId("goal_entries", li.dataset.entry);
    if (!e) return;
    li.addEventListener("click", function () { openEntryForm(e.goal_id, li.dataset.entry); });
    li.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openEntryForm(e.goal_id, li.dataset.entry); }
    });
  });
}
