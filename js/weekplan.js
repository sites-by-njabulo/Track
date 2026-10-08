/* ==========================================================
   10b. WEEKLY PLANS: Exercise and Communication
   ========================================================== */
// The week, Monday to Sunday. Each day is a focus ("Upper", "Speaking
// clearly") or a rest day, and can carry a link to the video or guide he
// follows. Tap a day to set it. Ticking it off happens on Today.
//
// One factory, two pages, so the two never drift apart.

function makeWeekPlanPage(cfg) {
  const fields = [
    { key: "label", label: cfg.labelTitle, type: "text", autofocus: true, placeholder: cfg.labelPlaceholder },
    { key: "rest",  label: "Rest", type: "checkbox", checkboxLabel: "Rest day, nothing to do" },
    { key: "link",  label: cfg.linkTitle, type: "url", placeholder: "https://", hint: cfg.linkHint },
    { key: "notes", label: "Notes", type: "textarea", placeholder: cfg.notesPlaceholder }
  ];

  function openDay(weekday) {
    openForm({
      title: WEEKDAYS[weekday],
      fields: fields,
      values: weekPlanFor(cfg.table, weekday),
      saveLabel: "Save",
      onSave: function (values) {
        saveWeekPlan(cfg.table, weekday, values);
        renderSection(currentSectionName);
      }
    });
  }

  function render() {
    const t = dayKey();
    const todayIdx = weekdayIndex(t);
    const today = weekPlanFor(cfg.table, todayIdx);
    const done = !!dayGet(t)[cfg.checkKey];

    const sub = today.rest
      ? "Rest day today."
      : today.label
        ? (done ? '<span class="sub-check">' + ICONS.check + "</span>" : "") + escapeHtml(today.label) + " today" + (done ? ", done" : "")
        : cfg.intro;

    const html =
      pageHeader(cfg.title, sub) +
      '<div class="col">' +
      '<ul class="plan-list">' + WEEKDAYS.map(function (name, i) {
        const p = weekPlanFor(cfg.table, i);
        const isToday = i === todayIdx;
        const text = p.rest ? "Rest" : (p.label || "Not set");
        return '<li class="plan-row' + (isToday ? " today" : "") + (p.rest ? " rest" : "") + (!p.rest && !p.label ? " unset" : "") + '" data-weekday="' + i + '" tabindex="0">' +
          '<span class="plan-day">' + name + (isToday ? '<span class="plan-today">Today</span>' : "") + "</span>" +
          '<span class="plan-label">' + escapeHtml(text) +
            (p.notes && !p.rest ? '<span class="plan-notes">' + escapeHtml(p.notes) + "</span>" : "") + "</span>" +
          (p.link && !p.rest
            ? '<a class="icon-btn plan-link" href="' + escapeHtml(p.link) + '" target="_blank" rel="noopener" aria-label="Open link" title="' + escapeHtml(cfg.linkTitle) + '" data-stop>' + ICONS.play + "</a>"
            : '<span class="icon-btn plan-link quiet" aria-hidden="true">' + ICONS.chevronRight + "</span>") +
        "</li>";
      }).join("") + "</ul>" +
      '<p class="panel-note">' + cfg.footnote + "</p>" +
      "</div>";

    const page = document.getElementById("page-" + cfg.name);
    page.innerHTML = html;
    page.querySelectorAll("[data-weekday]").forEach(function (li) {
      li.addEventListener("click", function (e) {
        if (e.target.closest("[data-stop]")) return;
        openDay(Number(li.dataset.weekday));
      });
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDay(Number(li.dataset.weekday)); }
      });
    });
  }

  return render;
}

const renderExercise = makeWeekPlanPage({
  name: "exercise",
  table: "exercise_plan",
  checkKey: "exercise",
  title: "Exercise",
  intro: "Tap a day to set the workout and the video you follow.",
  labelTitle: "Workout",
  labelPlaceholder: "Upper, Legs, Cardio, Push",
  linkTitle: "Guide video",
  linkHint: "The video you follow while training. Opens from Today.",
  notesPlaceholder: "Sets, weights, anything to remember",
  footnote: "The day's workout shows on Today with its video. Rest days count as done."
});

const renderCommunication = makeWeekPlanPage({
  name: "communication",
  table: "comm_plan",
  checkKey: "comm_done",
  title: "Communication",
  intro: "Tap a day to set what to practise.",
  labelTitle: "Focus",
  labelPlaceholder: "Speaking clearly, pacing, eye contact, no fillers",
  linkTitle: "Guide",
  linkHint: "A video or notes for this focus. Opens from Today.",
  notesPlaceholder: "How you will practise it",
  footnote: "The day's focus shows on Today next to the communication tick. Rest days count as done."
});
