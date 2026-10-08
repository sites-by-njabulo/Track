/* ==========================================================
   9. TASKS
   ========================================================== */
// Todoist-shaped: one quick-add box, three views, star to Top 3. Module state
// is prefixed with the section name because every file shares one scope.

let tasksView = "today";      // inbox | today | upcoming
let tasksShowDone = false;

const TASK_FIELDS = [
  { key: "title", label: "Task",  type: "text", required: true, autofocus: true, placeholder: "What needs doing" },
  { key: "due",   label: "Due",   type: "date", half: true },
  { key: "area",  label: "Area",  type: "select", options: TASK_AREAS, half: true },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Links, details, who to ask" }
];

// "Send proposal to Themba fri" -> title "Send proposal to Themba", due next
// Friday. A trailing word only, so a task about "tomorrow's call" is safe.
function parseQuickAdd(text) {
  const rel = { today: 0, tod: 0, tomorrow: 1, tmrw: 1, tom: 1 };
  const dows = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
                 sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  let title = text.trim();
  let due = null;
  const m = title.match(/\s+(today|tod|tomorrow|tmrw|tom|next week|sun|mon|tue|wed|thu|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i);
  if (m) {
    const w = m[1].toLowerCase();
    const t = dayKey();
    if (rel[w] !== undefined) due = shiftKey(t, rel[w]);
    else if (w === "next week") due = shiftKey(weekStart(t), 7);
    else due = shiftKey(t, (dows[w] - parseKey(t).getDay() + 7) % 7);
    title = title.slice(0, m.index).trim();
  }
  return { title: title, due: due };
}

function tasksBuckets() {
  const t = dayKey();
  const open = openTasks();
  return {
    inbox: open.filter(function (x) { return !x.due && x.top_date !== t; }),
    today: open.filter(function (x) { return (x.due && x.due <= t) || x.top_date === t; }),
    upcoming: open.filter(function (x) { return x.due && x.due > t; })
  };
}

function taskSort(a, b) {
  const ad = a.due || "9999-99-99", bd = b.due || "9999-99-99";
  if (ad !== bd) return ad < bd ? -1 : 1;
  return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
}

function renderTasks() {
  const b = tasksBuckets();
  const t = dayKey();
  const done = db.tasks.filter(function (x) { return x.done; })
    .sort(function (a, c) { return (c.done_date || "") + (c.updated_at || "") < (a.done_date || "") + (a.updated_at || "") ? -1 : 1; });

  let body;
  if (tasksView === "inbox") {
    const rows = b.inbox.slice().sort(function (a, c) { return (c.created_at || "") < (a.created_at || "") ? -1 : 1; });
    body = rows.length ? taskList(rows, t)
      : emptyState("inbox", "Inbox is empty", "Anything you type above without a date lands here. Give it a day when you know one.");
  } else if (tasksView === "today") {
    const overdue = b.today.filter(function (x) { return x.due && x.due < t; }).sort(taskSort);
    const due = b.today.filter(function (x) { return !(x.due && x.due < t); }).sort(function (a, c) {
      const at = a.top_date === t ? 0 : 1, ct = c.top_date === t ? 0 : 1;
      return at !== ct ? at - ct : taskSort(a, c);
    });
    body = (overdue.length ? '<p class="group-label">Overdue</p>' + taskList(overdue, t) : "") +
           (due.length ? (overdue.length ? '<p class="group-label">Today</p>' : "") + taskList(due, t) : "") +
           (!overdue.length && !due.length
             ? emptyState("tasks", "Nothing due today", "Add a task with the word today at the end, or star something from the Inbox to make it a Top 3.")
             : "");
  } else {
    const rows = b.upcoming.slice().sort(taskSort);
    if (!rows.length) {
      body = emptyState("calendar", "Nothing scheduled", "Type a task and end it with tomorrow, a weekday, or next week.");
    } else {
      let html = "", last = null;
      rows.forEach(function (x) {
        if (x.due !== last) {
          if (last !== null) html += "</ul>";
          html += '<p class="group-label">' + escapeHtml(relativeDayLabel(x.due)) +
                  '<span class="group-sub">' + escapeHtml(formatShortDate(x.due)) + "</span></p>" + '<ul class="task-list">';
          last = x.due;
        }
        html += taskRow(x, t);
      });
      body = html + "</ul>";
    }
  }

  const html =
    pageHeader("Tasks", "Type it, give it a day, star three.") +
    '<div class="col">' +
      '<div class="todo-add">' +
        '<input type="text" id="task-input" placeholder="Add a task. End with today, tomorrow or a weekday." aria-label="New task" autocomplete="off">' +
        '<button class="btn btn-primary" id="task-add-btn" aria-label="Add task"><span class="btn-icon">' + ICONS.plus + "</span></button>" +
      "</div>" +
      '<div class="toolbar"><div class="segmented-wrap">' +
        segmented("tasks-view", [
          { value: "today", label: "Today", count: b.today.length },
          { value: "upcoming", label: "Upcoming", count: b.upcoming.length },
          { value: "inbox", label: "Inbox", count: b.inbox.length }
        ], tasksView) +
      "</div></div>" +
      body +
      (done.length
        ? '<div class="todo-done-block">' +
            '<button class="link-btn" id="tasks-toggle-done">' + (tasksShowDone ? "Hide" : "Show") + " " + plural(done.length, "completed task") + "</button>" +
            (tasksShowDone ? '<ul class="task-list task-list-done">' + done.slice(0, 50).map(function (x) { return taskRow(x, t); }).join("") + "</ul>" : "") +
          "</div>"
        : "") +
    "</div>";

  document.getElementById("page-tasks").innerHTML = html;
  wireTasks();
}

function taskList(rows, t) {
  return '<ul class="task-list">' + rows.map(function (x) { return taskRow(x, t); }).join("") + "</ul>";
}

function taskRow(x, t) {
  const top = x.top_date === t;
  const overdue = x.due && x.due < t && !x.done;
  const meta = [];
  if (x.due) meta.push('<span class="' + (overdue ? "cell-overdue" : "task-due") + '">' + escapeHtml(relativeDayLabel(x.due)) + "</span>");
  if (x.area) meta.push('<span class="task-area">' + escapeHtml(lookup(TASK_AREAS, x.area).label) + "</span>");
  return '<li class="task-row' + (x.done ? " done" : "") + (top ? " top" : "") + '" data-id="' + x.id + '">' +
    '<button class="todo-check" data-toggle aria-label="' + (x.done ? "Mark as not done" : "Mark as done") + '">' + (x.done ? ICONS.check : "") + "</button>" +
    '<div class="task-body" data-edit tabindex="0">' +
      '<span class="task-title">' + escapeHtml(x.title) + "</span>" +
      (meta.length ? '<span class="task-meta">' + meta.join('<span class="dot-sep"></span>') + "</span>" : "") +
    "</div>" +
    (x.done ? "" :
      '<button class="icon-btn task-star' + (top ? " on" : "") + '" data-star aria-label="' + (top ? "Remove from Top 3" : "Make a Top 3 for today") + '">' +
        (top ? ICONS.starFill : ICONS.star) + "</button>") +
    '<button class="icon-btn task-delete" data-delete aria-label="Delete task">' + ICONS.trash + "</button>" +
  "</li>";
}

function addTaskFromInput(input) {
  const parsed = parseQuickAdd(input.value);
  if (!parsed.title) return;
  const fields = { title: parsed.title, due: parsed.due };
  if (tasksView === "today" && !parsed.due) fields.due = dayKey();
  create("tasks", fields);
  input.value = "";
  renderTasks();
  const fresh = document.getElementById("task-input");
  if (fresh) fresh.focus();
}

// Star = Top 3 for the given day. The 4th star is refused, and so is starring
// while yesterday is still open: the gate is the point.
function toggleTop(id, key) {
  const x = byId("tasks", id);
  if (!x) return false;
  if (x.top_date === key) { update("tasks", id, { top_date: null }); return true; }
  if (typeof gateDayKey === "function" && gateDayKey() && key === dayKey()) {
    toast("Close yesterday first. Then pick today's three.");
    return false;
  }
  if (topTasksFor(key).length >= TOP_LIMIT) {
    toast("Top 3 is full. Unstar one first.");
    return false;
  }
  update("tasks", id, { top_date: key });
  return true;
}

function setTaskDone(id, done) {
  const fields = { done: done, done_date: done ? dayKey() : null };
  update("tasks", id, fields);
  // Finishing the task that is in focus ends the block cleanly.
  if (done && typeof activeFocus === "function") {
    const f = activeFocus();
    if (f && f.row.focus_task_id === id && typeof endFocus === "function") endFocus("finished", null, true);
  }
}

function openTaskForm(id, preset) {
  const x = id ? byId("tasks", id) : null;
  openForm({
    title: x ? "Edit task" : "New task",
    fields: TASK_FIELDS,
    values: x || preset || {},
    saveLabel: x ? "Save" : "Add task",
    onSave: function (values) {
      if (x) update("tasks", id, values);
      else create("tasks", values);
      renderSection(currentSectionName);
    },
    onDelete: x ? function () {
      confirmDelete("this task", function () { remove("tasks", id); renderSection(currentSectionName); });
    } : null
  });
}

function wireTasks() {
  const page = document.getElementById("page-tasks");
  const input = page.querySelector("#task-input");

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); addTaskFromInput(input); }
  });
  page.querySelector("#task-add-btn").addEventListener("click", function () { addTaskFromInput(input); });

  page.querySelectorAll("#tasks-view button").forEach(function (b) {
    b.addEventListener("click", function () { tasksView = b.dataset.value; renderTasks(); });
  });

  const toggleDone = page.querySelector("#tasks-toggle-done");
  if (toggleDone) toggleDone.addEventListener("click", function () { tasksShowDone = !tasksShowDone; renderTasks(); });

  wireTaskRows(page, renderTasks);
}

// Shared by the Tasks page and the Top 3 list on Today.
function wireTaskRows(root, rerender) {
  root.querySelectorAll(".task-row").forEach(function (li) {
    const id = li.dataset.id;
    const toggle = li.querySelector("[data-toggle]");
    if (toggle) toggle.addEventListener("click", function () {
      const x = byId("tasks", id);
      setTaskDone(id, !x.done);
      rerender();
    });
    const del = li.querySelector("[data-delete]");
    if (del) del.addEventListener("click", function () {
      confirmDelete("this task", function () { remove("tasks", id); rerender(); });
    });
    const star = li.querySelector("[data-star]");
    if (star) star.addEventListener("click", function () {
      if (toggleTop(id, dayKey())) rerender();
    });
    const editEl = li.querySelector("[data-edit]");
    if (editEl) {
      editEl.addEventListener("click", function () { openTaskForm(id); });
      editEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTaskForm(id); }
      });
    }
  });
}
