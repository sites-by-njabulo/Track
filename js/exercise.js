/* ==========================================================
   10b. EXERCISE
   ========================================================== */
// The exercises he is supposed to do, each with a target, ticked off with a
// counter. Done for the day = every exercise at target. Feeds the Exercise
// row on Today and the check-in.

const EXERCISE_FIELDS = [
  { key: "name",   label: "Exercise", type: "text", required: true, autofocus: true, placeholder: "Push-ups" },
  { key: "target", label: "Target",   type: "number", required: true, placeholder: "100", half: true },
  { key: "unit",   label: "Counted in", type: "select", options: EXERCISE_UNITS, half: true },
  { key: "active", label: "Active",   type: "checkbox", checkboxLabel: "Part of the daily set" }
];

function renderExercise() {
  const t = dayKey();
  const ex = activeExercises();
  const st = exerciseStatus(t);
  const paused = db.exercises.filter(function (e) { return !e.active; });

  const sub = st
    ? '<span class="sub-check">' + ICONS.check + "</span>" + st.done + " of " + st.total + " done, " + escapeHtml(formatWeekday(t) + " " + formatShortDate(t))
    : "Add the exercises you are supposed to do. Each one gets a target and a counter.";

  const html =
    pageHeader("Exercise", sub) +
    '<div class="col">' +
    (ex.length
      ? '<ul class="task-list ex-list">' + ex.map(function (e) {
          const amount = exerciseAmount(t, e.id);
          const hit = exerciseHit(t, e);
          const unit = lookup(EXERCISE_UNITS, e.unit);
          const steps = unit.steps || [1, 5];
          const hist = windowKeys(7).map(function (k) { return { key: k, hit: exerciseHit(k, e) }; });
          return '<li class="task-row ex-row' + (hit ? " done" : "") + '" data-id="' + e.id + '">' +
            '<span class="todo-check ex-check" aria-hidden="true">' + (hit ? ICONS.check : "") + "</span>" +
            '<div class="task-body" data-edit tabindex="0">' +
              '<span class="task-title">' + escapeHtml(e.name) + "</span>" +
              '<span class="task-meta">' + amount + " of " + num(e.target) + " " + escapeHtml(unit.label) +
                '<span class="dot-sep"></span><span class="ex-dots" title="Last 7 days">' + hist.map(function (h) {
                  return '<span class="ex-dot' + (h.hit ? " on" : "") + (h.key === t ? " today" : "") + '"></span>';
                }).join("") + "</span>" +
              "</span>" +
            "</div>" +
            '<div class="stepper">' +
              '<button class="step-btn" data-ex="-' + steps[0] + '" aria-label="Minus ' + steps[0] + '">' + ICONS.minus + "</button>" +
              steps.map(function (n) { return '<button class="step-btn" data-ex="' + n + '">+' + n + "</button>"; }).join("") +
            "</div>" +
          "</li>";
        }).join("") + "</ul>"
      : "") +
    '<button class="add-row" id="add-exercise">' + ICONS.plus + "<span>Add exercise</span></button>" +
    (paused.length
      ? '<div class="todo-done-block"><p class="group-label">Paused</p><ul class="task-list">' + paused.map(function (e) {
          return '<li class="task-row done" data-id="' + e.id + '"><span class="todo-check ex-check" aria-hidden="true"></span>' +
            '<div class="task-body" data-edit tabindex="0"><span class="task-title">' + escapeHtml(e.name) + "</span></div></li>";
        }).join("") + "</ul></div>"
      : "") +
    "</div>";

  document.getElementById("page-exercise").innerHTML = html;
  wireExercise();
}

function openExerciseForm(id) {
  const e = id ? byId("exercises", id) : null;
  openForm({
    title: e ? "Edit exercise" : "Add exercise",
    fields: EXERCISE_FIELDS,
    values: e || { unit: "reps", active: true },
    saveLabel: e ? "Save" : "Add",
    onSave: function (values) {
      values.target = Math.max(0, num(values.target));
      if (e) update("exercises", id, values);
      else create("exercises", Object.assign(values, { sort: db.exercises.length }));
      renderSection(currentSectionName);
    },
    onDelete: e ? function () {
      confirmDelete(e.name, function () { remove("exercises", id); renderSection(currentSectionName); });
    } : null
  });
}

function wireExercise() {
  const page = document.getElementById("page-exercise");
  const t = dayKey();
  page.querySelector("#add-exercise").addEventListener("click", function () { openExerciseForm(null); });
  page.querySelectorAll(".task-row").forEach(function (li) {
    const id = li.dataset.id;
    li.querySelectorAll("[data-ex]").forEach(function (b) {
      b.addEventListener("click", function () {
        bumpExercise(t, id, Number(b.dataset.ex));
        renderExercise();
      });
    });
    const body = li.querySelector("[data-edit]");
    body.addEventListener("click", function () { openExerciseForm(id); });
    body.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openExerciseForm(id); }
    });
  });
}
