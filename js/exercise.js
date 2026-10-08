/* ==========================================================
   10b. EXERCISE
   ========================================================== */
// The week, Monday to Sunday. Each day is a workout ("Upper", "Legs",
// "Cardio") or a rest day, and can carry a link to the video he follows
// while training. Tap a day to set it. Ticking it off happens on Today.

const PLAN_FIELDS = [
  { key: "label",     label: "Workout", type: "text", autofocus: true, placeholder: "Upper, Legs, Cardio, Push" },
  { key: "rest",      label: "Rest",    type: "checkbox", checkboxLabel: "Rest day" },
  { key: "video_url", label: "Guide video", type: "url", placeholder: "https://youtube.com/..." , hint: "The video you follow while training. Opens from Today." },
  { key: "notes",     label: "Notes",   type: "textarea", placeholder: "Sets, weights, anything to remember" }
];

function renderExercise() {
  const t = dayKey();
  const todayIdx = weekdayIndex(t);
  const plan = planToday();
  const day = dayGet(t);

  const sub = plan.rest
    ? "Rest day today."
    : plan.label
      ? (day.exercise ? '<span class="sub-check">' + ICONS.check + "</span>" : "") + escapeHtml(plan.label) + " today" + (day.exercise ? ", done" : "")
      : "Tap a day to set the workout and the video you follow.";

  const html =
    pageHeader("Exercise", sub) +
    '<div class="col">' +
    '<ul class="plan-list">' + WEEKDAYS.map(function (name, i) {
      const p = planFor(i);
      const isToday = i === todayIdx;
      const text = p.rest ? "Rest" : (p.label || "Not set");
      return '<li class="plan-row' + (isToday ? " today" : "") + (p.rest ? " rest" : "") + (!p.rest && !p.label ? " unset" : "") + '" data-weekday="' + i + '" tabindex="0">' +
        '<span class="plan-day">' + name + (isToday ? '<span class="plan-today">Today</span>' : "") + "</span>" +
        '<span class="plan-label">' + escapeHtml(text) + "</span>" +
        (p.video_url && !p.rest
          ? '<a class="icon-btn plan-link" href="' + escapeHtml(p.video_url) + '" target="_blank" rel="noopener" aria-label="Open guide video" title="Guide video" data-stop>' + ICONS.play + "</a>"
          : '<span class="icon-btn plan-link quiet" aria-hidden="true">' + ICONS.chevronRight + "</span>") +
      "</li>";
    }).join("") + "</ul>" +
    "</div>";

  document.getElementById("page-exercise").innerHTML = html;
  wireExercise();
}

function openPlanForm(weekday) {
  const p = planFor(weekday);
  openForm({
    title: WEEKDAYS[weekday],
    fields: PLAN_FIELDS,
    values: p,
    saveLabel: "Save",
    onSave: function (values) {
      savePlan(weekday, values);
      renderSection(currentSectionName);
    }
  });
}

function wireExercise() {
  const page = document.getElementById("page-exercise");
  page.querySelectorAll("[data-weekday]").forEach(function (li) {
    li.addEventListener("click", function (e) {
      if (e.target.closest("[data-stop]")) return;
      openPlanForm(Number(li.dataset.weekday));
    });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPlanForm(Number(li.dataset.weekday)); }
    });
  });
}
