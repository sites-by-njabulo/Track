/* ==========================================================
   10. CONTENT
   ========================================================== */
// Which weekdays are scripting, filming, editing and posting days, and the
// links to where the scripts actually live (Google Sheets and Docs). Nothing
// else. The scripts are managed there, not here.

const CONTENT_PLAN_FIELDS = CONTENT_ACTS.map(function (a) {
  return { key: a.key, label: a.label, type: "checkbox", checkboxLabel: a.label + " on this day", half: true };
}).concat([{ key: "notes", label: "Notes", type: "textarea", placeholder: "How many, which ones, anything to remember" }]);

function renderContent() {
  const t = dayKey();
  const todayIdx = weekdayIndex(t);
  const today = contentPlanFor(todayIdx);
  const acts = planActs(today);
  const nextDay = nextContentDay();

  const sub = !contentPlanSet()
    ? "Tap a day to set what happens on it."
    : acts.length
      ? acts.map(function (a) { return a.label; }).join(" and ") + " day today."
      : "Nothing today." + (nextDay ? " Next content day is " + WEEKDAYS[nextDay.weekday] + "." : "");

  const actions = '<div class="topbar-stack">' + CONTENT_LINKS.map(function (l) {
    return '<a class="btn btn-ghost btn-sm" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener">' + ICONS[l.icon] + "<span>" + escapeHtml(l.label) + "</span></a>";
  }).join("") + "</div>";

  const html =
    pageHeader("Content", sub, actions) +
    '<div class="col">' +
    '<ul class="plan-list">' + WEEKDAYS.map(function (name, i) {
      const p = contentPlanFor(i);
      const a = planActs(p);
      const isToday = i === todayIdx;
      return '<li class="plan-row' + (isToday ? " today" : "") + (a.length ? "" : " rest") + '" data-cday="' + i + '" tabindex="0">' +
        '<span class="plan-day">' + name + (isToday ? '<span class="plan-today">Today</span>' : "") + "</span>" +
        '<span class="plan-label">' + (a.length
          ? a.map(function (a2) { return '<span class="act-chip">' + a2.label + "</span>"; }).join("")
          : "Off") +
          (p.notes ? '<span class="plan-notes">' + escapeHtml(p.notes) + "</span>" : "") + "</span>" +
        '<span class="icon-btn plan-link quiet" aria-hidden="true">' + ICONS.chevronRight + "</span>" +
      "</li>";
    }).join("") + "</ul>" +
    '<p class="panel-note">' + [["Scripting", "do_script"], ["Filming", "do_film"], ["Editing", "do_edit"], ["Posting", "do_post"]].map(function (pair) {
      const days = daysWith(pair[1]);
      return pair[0] + ": " + (days.length ? days.join(", ") : "none");
    }).join(". ") + ". The scripts themselves live in the sheet and in Docs, linked above.</p>" +
    "</div>";

  document.getElementById("page-content").innerHTML = html;
  wireContent();
}

function openContentPlanForm(weekday) {
  openForm({
    title: WEEKDAYS[weekday],
    fields: CONTENT_PLAN_FIELDS,
    values: contentPlanFor(weekday),
    saveLabel: "Save",
    onSave: function (values) {
      saveContentPlan(weekday, values);
      renderSection(currentSectionName);
    }
  });
}

function wireContent() {
  const page = document.getElementById("page-content");
  page.querySelectorAll("[data-cday]").forEach(function (li) {
    li.addEventListener("click", function () { openContentPlanForm(Number(li.dataset.cday)); });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openContentPlanForm(Number(li.dataset.cday)); }
    });
  });
}
