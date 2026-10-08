/* ==========================================================
   9. TASKS
   ========================================================== */
// Todoist-shaped: a big title, a count line, date group headers, plain rows,
// and a "+ Add task" row at the bottom that types inline.

let tasksView = "today";      // today | upcoming | inbox
let tasksShowDone = false;
let tasksAdding = false;

const TASK_FIELDS = [
  { key: "title", label: "Task",  type: "text", required: true, autofocus: true, placeholder: "What needs doing" },
  { key: "due",   label: "Due",   type: "date", half: true },
  { key: "area",  label: "Area",  type: "select", options: TASK_AREAS, half: true },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Links, details, who to ask" }
];

// "Send proposal to Themba fri" -> title "Send proposal to Themba", due next
// Friday. A trailing word only.
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
    inbox: open.filter(function (x) { return !x.due; }),
    today: open.filter(function (x) { return x.due && x.due <= t; }),
    upcoming: open.filter(function (x) { return x.due && x.due > t; })
  };
}

function taskSort(a, b) {
  const ad = a.due || "9999-99-99", bd = b.due || "9999-99-99";
  if (ad !== bd) return ad < bd ? -1 : 1;
  return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
}

// "Oct 8 · Today · Thursday", the Todoist date line.
function dateGroupLabel(key) {
  const d = parseKey(key);
  const rel = relativeDayLabel(key);
  const parts = [d.toLocaleDateString("en-US", { month: "short", day: "numeric" })];
  if (rel === "Today" || rel === "Tomorrow") parts.push(rel);
  parts.push(d.toLocaleDateString("en-US", { weekday: "long" }));
  return parts.join(" · ");
}

function renderTasks() {
  const b = tasksBuckets();
  const t = dayKey();
  const done = db.tasks.filter(function (x) { return x.done; })
    .sort(function (a, c) { return (c.done_date || "") + (c.updated_at || "") < (a.done_date || "") + (a.updated_at || "") ? -1 : 1; });

  let body = "";
  let count = 0;
  if (tasksView === "inbox") {
    const rows = b.inbox.slice().sort(function (a, c) { return (c.created_at || "") < (a.created_at || "") ? -1 : 1; });
    count = rows.length;
    body = rows.length ? taskList(rows, t) : "";
  } else if (tasksView === "today") {
    const overdue = b.today.filter(function (x) { return x.due < t; }).sort(taskSort);
    const due = b.today.filter(function (x) { return x.due === t; }).sort(taskSort);
    count = overdue.length + due.length;
    body = (overdue.length ? '<p class="group-label">Overdue</p>' + taskList(overdue, t) : "") +
           '<p class="group-label">' + escapeHtml(dateGroupLabel(t)) + "</p>" +
           (due.length ? taskList(due, t) : "");
  } else {
    const rows = b.upcoming.slice().sort(taskSort);
    count = rows.length;
    let last = null;
    rows.forEach(function (x) {
      if (x.due !== last) {
        if (last !== null) body += "</ul>";
        body += '<p class="group-label">' + escapeHtml(dateGroupLabel(x.due)) + "</p>" + '<ul class="task-list">';
        last = x.due;
      }
      body += taskRow(x, t);
    });
    if (last !== null) body += "</ul>";
  }

  const addRow = tasksAdding
    ? '<div class="add-inline">' +
        '<input type="text" id="task-input" placeholder="Task name. End with a day: fri, tomorrow, next week" aria-label="New task" autocomplete="off">' +
        '<div class="add-inline-foot">' +
          '<span class="add-inline-hint">' + (tasksView === "today" ? "Due today" : tasksView === "upcoming" ? "Due tomorrow unless you say otherwise" : "No date, lands in the Inbox") + "</span>" +
          '<span class="add-inline-actions"><button class="btn btn-ghost btn-sm" id="task-cancel">Cancel</button>' +
          '<button class="btn btn-primary btn-sm" id="task-add-btn">Add task</button></span>' +
        "</div>" +
      "</div>"
    : '<button class="add-row add-task-row" id="task-add-open">' + ICONS.plus + "<span>Add task</span></button>";

  const html =
    pageHeader("Tasks", '<span class="sub-check">' + ICONS.check + "</span>" + plural(count, "task"),
      '<div class="segmented-wrap">' + segmented("tasks-view", [
        { value: "today", label: "Today", count: b.today.length },
        { value: "upcoming", label: "Upcoming", count: b.upcoming.length },
        { value: "inbox", label: "Inbox", count: b.inbox.length }
      ], tasksView) + "</div>") +
    '<div class="col">' +
      body + addRow +
      (count === 0 && !tasksAdding
        ? '<p class="panel-empty-text">' +
            (tasksView === "today" ? "Nothing due today."
             : tasksView === "upcoming" ? "Nothing scheduled. End a task with tomorrow, a weekday, or next week."
             : "Inbox is empty. Anything without a date lands here.") + "</p>"
        : "") +
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

// Shared with Today, so a task looks the same everywhere.
function taskRow(x, t) {
  const overdue = x.due && x.due < t && !x.done;
  const showDate = x.due && (currentSectionName !== "tasks" || tasksView !== "upcoming" || x.done);
  return '<li class="task-row' + (x.done ? " done" : "") + '" data-id="' + x.id + '">' +
    '<button class="todo-check" data-toggle aria-label="' + (x.done ? "Mark as not done" : "Mark as done") + '">' + (x.done ? ICONS.check : "") + "</button>" +
    '<div class="task-body" data-edit tabindex="0">' +
      '<span class="task-title">' + escapeHtml(x.title) + "</span>" +
      (showDate ? '<span class="task-meta"><span class="' + (overdue ? "cell-overdue" : "task-due") + '">' + ICONS.calendar + escapeHtml(relativeDayLabel(x.due)) + "</span></span>" : "") +
    "</div>" +
    '<span class="task-right">' +
      '<button class="icon-btn task-delete" data-delete aria-label="Delete task">' + ICONS.trash + "</button>" +
      '<span class="task-area">' + escapeHtml(x.area ? lookup(TASK_AREAS, x.area).label : "Inbox") + "</span>" +
    "</span>" +
  "</li>";
}

function addTaskFromInput(input) {
  const parsed = parseQuickAdd(input.value);
  if (!parsed.title) return;
  const fields = { title: parsed.title, due: parsed.due };
  if (!parsed.due && tasksView === "today") fields.due = dayKey();
  if (!parsed.due && tasksView === "upcoming") fields.due = shiftKey(dayKey(), 1);
  create("tasks", fields);
  tasksAdding = true;
  renderTasks();
  const fresh = document.getElementById("task-input");
  if (fresh) fresh.focus();
}

function setTaskDone(id, done) {
  update("tasks", id, { done: done, done_date: done ? dayKey() : null });
}

function openTaskForm(id, preset) {
  const x = id ? byId("tasks", id) : null;
  openForm({
    title: x ? "Edit task" : "Add task",
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

  const open = page.querySelector("#task-add-open");
  if (open) open.addEventListener("click", function () {
    tasksAdding = true;
    renderTasks();
    const fresh = document.getElementById("task-input");
    if (fresh) fresh.focus();
  });
  const input = page.querySelector("#task-input");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); addTaskFromInput(input); }
      if (e.key === "Escape") { tasksAdding = false; renderTasks(); }
    });
    page.querySelector("#task-add-btn").addEventListener("click", function () { addTaskFromInput(input); });
    page.querySelector("#task-cancel").addEventListener("click", function () { tasksAdding = false; renderTasks(); });
  }

  page.querySelectorAll("#tasks-view button").forEach(function (b) {
    b.addEventListener("click", function () { tasksView = b.dataset.value; tasksAdding = false; renderTasks(); });
  });

  const toggleDone = page.querySelector("#tasks-toggle-done");
  if (toggleDone) toggleDone.addEventListener("click", function () { tasksShowDone = !tasksShowDone; renderTasks(); });

  wireTaskRows(page, renderTasks);
}

// Shared by the Tasks page and the to-do list on Today.
function wireTaskRows(root, rerender) {
  root.querySelectorAll(".task-row[data-id]").forEach(function (li) {
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
    const editEl = li.querySelector("[data-edit]");
    if (editEl) {
      editEl.addEventListener("click", function () { openTaskForm(id); });
      editEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTaskForm(id); }
      });
    }
  });
}
