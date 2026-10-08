/* ==========================================================
   10. CONTENT
   ========================================================== */
// Two things. Which weekdays are content days (and what happens on them),
// and the weekly mix: how many of each format to post, each with its one
// next step. He has the scripts. This is the answer to "which one", so the
// question never sends him to Instagram.

const CONTENT_FIELDS = [
  { key: "title",  label: "Title",  type: "text", required: true, autofocus: true, placeholder: "The hook, or a working title" },
  { key: "format", label: "Format", type: "select", options: CONTENT_FORMATS, half: true },
  { key: "stage",  label: "Stage",  type: "select", options: CONTENT_STAGES, half: true },
  { key: "link",   label: "Script link", type: "url", placeholder: "Google Doc, Notes, anything" },
  { key: "notes",  label: "Notes",  type: "textarea", placeholder: "Angle, proof to include" }
];

const CONTENT_PLAN_FIELDS = CONTENT_ACTS.map(function (a) {
  return { key: a.key, label: a.label, type: "checkbox", checkboxLabel: a.label + " on this day", half: true };
}).concat([{ key: "notes", label: "Notes", type: "textarea", placeholder: "How many, which ones, anything to remember" }]);

function renderContent() {
  const t = dayKey();
  const todayIdx = weekdayIndex(t);
  const mix = weekMixStatus();
  const total = weekTargetTotal();
  const posted = postedThisWeek();
  const blog = blogCandidate();
  const blogs = blogsThisWeek();
  const w = weekKeys(0);
  const pipeline = contentInProgress().sort(byStageThenAge);

  const sub = total
    ? '<span class="sub-check">' + ICONS.check + "</span>" + posted + " of " + total + " posted this week, " + escapeHtml(formatShortDate(w[0]) + " to " + formatShortDate(w[6]))
    : "Set a weekly mix in Settings and this page tells you what to make.";

  const actions = '<button class="btn btn-ghost btn-sm" id="log-post-btn">' + ICONS.plus + "<span>Log a post</span></button>";

  const html =
    pageHeader("Content", sub, actions) +
    '<div class="col">' +

    // Content days
    '<section class="panel">' +
      '<div class="panel-head"><h2>Content days</h2><span class="panel-meta">tap a day to change it</span></div>' +
      '<ul class="plan-list compact">' + WEEKDAYS.map(function (name, i) {
        const p = contentPlanFor(i);
        const acts = planActs(p);
        const isToday = i === todayIdx;
        return '<li class="plan-row' + (isToday ? " today" : "") + (acts.length ? "" : " rest") + '" data-cday="' + i + '" tabindex="0">' +
          '<span class="plan-day">' + name.slice(0, 3) + (isToday ? '<span class="plan-today">Today</span>' : "") + "</span>" +
          '<span class="plan-label">' + (acts.length
            ? acts.map(function (a2) { return '<span class="act-chip">' + a2.label + "</span>"; }).join("")
            : "Off") +
            (p.notes ? '<span class="plan-notes">' + escapeHtml(p.notes) + "</span>" : "") + "</span>" +
          '<span class="icon-btn plan-link quiet" aria-hidden="true">' + ICONS.chevronRight + "</span>" +
        "</li>";
      }).join("") + "</ul>" +
      '<p class="panel-note">' + [
        ["Scripting", "do_script"], ["Filming", "do_film"], ["Editing", "do_edit"], ["Posting", "do_post"]
      ].map(function (pair) {
        const days = daysWith(pair[1]);
        return pair[0] + ": " + (days.length ? days.join(", ") : "none");
      }).join(". ") + ".</p>" +
    "</section>" +

    // This week's mix
    '<section class="panel">' +
      '<div class="panel-head"><h2>This week</h2><span class="panel-meta">' + (total ? total + " to post" : "") + "</span></div>" +
      (mix.length
        ? '<ul class="mix-list">' + mix.map(function (f) {
            const dots = [];
            for (let i = 0; i < f.target; i++) dots.push('<span class="mix-dot' + (i < f.posted ? " on" : "") + '"></span>');
            const n = f.next;
            return '<li class="mix-row' + (f.hit ? " hit" : "") + '">' +
              '<div class="mix-top">' +
                '<span class="mix-name">' + escapeHtml(f.label) + "</span>" +
                '<span class="mix-dots">' + dots.join("") + "</span>" +
                '<span class="mix-count">' + f.posted + " of " + f.target + "</span>" +
              "</div>" +
              '<div class="mix-next">' +
                (f.hit
                  ? '<span class="next-what quiet">Done for the week.</span>'
                  : '<span class="next-verb">' + escapeHtml(n.verb) + "</span>" +
                    (n.item
                      ? '<span class="next-what" data-open="' + n.item.id + '" tabindex="0">' + escapeHtml(n.item.title) + "</span>" +
                        '<button class="btn btn-ghost btn-sm" data-advance="' + n.item.id + '">' + (n.nextStage === "posted" ? "Posted" : "Done") + "</button>"
                      : '<span class="next-what quiet">Nothing scripted for this one.</span>')) +
              "</div>" +
            "</li>";
          }).join("") + "</ul>"
        : '<p class="panel-empty-text">No weekly mix yet. <button class="link-btn" data-goto="settings">Set it in Settings</button>.</p>') +
      '<div class="blog-row"><span>' + ICONS.book + "</span><div><strong>Blog posts this week: " + blogs + " of " + S().target_blogs + "</strong>" +
        '<span class="cell-sub">' + (blog ? "Next script to turn into a post: " + escapeHtml(blog.title) : "Every script has a post.") + "</span></div>" +
        (blog ? '<button class="btn btn-ghost btn-sm" data-blog="' + blog.id + '">Published</button>' : "") +
      "</div>" +
    "</section>" +

    // The scripts, quietly
    '<details class="pipe-details">' +
      "<summary>" + ICONS.chevronRight + "Scripts in the pipeline, " + pipeline.length + "</summary>" +
      (pipeline.length
        ? '<ul class="content-list">' + pipeline.map(contentRow).join("") + "</ul>"
        : '<p class="panel-empty-text">Nothing scripted yet.</p>') +
      '<button class="add-row" id="add-content-btn">' + ICONS.plus + "<span>Add a script</span></button>" +
    "</details>" +

    "</div>";

  document.getElementById("page-content").innerHTML = html;
  wireContent();
}

function contentRow(c) {
  const verb = NEXT_VERB[c.stage];
  return '<li class="content-row" data-id="' + c.id + '">' +
    '<div class="content-body" data-open="' + c.id + '" tabindex="0">' +
      '<span class="content-title">' + escapeHtml(c.title) + "</span>" +
      '<span class="content-meta">' +
        '<span class="task-area">' + escapeHtml(lookup(CONTENT_FORMATS, c.format).label) + "</span>" +
        '<span class="dot-sep"></span>' + escapeHtml(lookup(CONTENT_STAGES, c.stage).label) +
        (c.blog_date ? '<span class="dot-sep"></span><span>Blog ' + escapeHtml(formatShortDate(c.blog_date)) + "</span>" : "") +
      "</span>" +
    "</div>" +
    (verb ? '<button class="btn btn-ghost btn-sm" data-advance="' + c.id + '">' + escapeHtml(verb) + "</button>" : "") +
  "</li>";
}

// The one write path for a stage change. Posted stamps posted_date with today.
function setContentStage(id, stage) {
  const c = byId("content", id);
  if (!c) return;
  const fields = { stage: stage };
  if (stage === "posted" && !c.posted_date) fields.posted_date = dayKey();
  if (stage !== "posted") fields.posted_date = null;
  update("content", id, fields);
}

function advanceContent(id) {
  const c = byId("content", id);
  if (!c || !NEXT_STAGE[c.stage]) return;
  const next = NEXT_STAGE[c.stage];
  setContentStage(id, next);
  toast(next === "posted" ? "Posted. Counted for the week." : "Marked " + lookup(CONTENT_STAGES, next).label.toLowerCase());
}

function markBlogPublished(id) {
  update("content", id, { blog_date: dayKey() });
  toast("Blog post counted for this week");
}

function openContentForm(id, preset) {
  const c = id ? byId("content", id) : null;
  openForm({
    title: c ? "Edit video" : "Add a script",
    fields: CONTENT_FIELDS,
    values: c || Object.assign({ stage: "scripted", format: (weeklyMix()[0] || {}).value || "other" }, preset || {}),
    saveLabel: c ? "Save" : "Add",
    onSave: function (values) {
      if (c) {
        const stage = values.stage;
        delete values.stage;
        update("content", id, values);
        if (stage !== c.stage) setContentStage(id, stage);
      } else {
        const stage = values.stage;
        const row = create("content", values);
        if (stage === "posted") setContentStage(row.id, "posted");
      }
      renderSection(currentSectionName);
    },
    onDelete: c ? function () {
      confirmDelete("this video", function () { remove("content", id); renderSection(currentSectionName); });
    } : null
  });
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

// A post that was never tracked still counts.
function logPostQuick() {
  openForm({
    title: "Log a post",
    fields: [
      { key: "title",  label: "What did you post", type: "text", required: true, autofocus: true },
      { key: "format", label: "Format", type: "select", options: CONTENT_FORMATS }
    ],
    values: { format: (weeklyMix()[0] || {}).value || "other" },
    saveLabel: "Count it",
    onSave: function (values) {
      create("content", { title: values.title, format: values.format, stage: "posted", posted_date: dayKey() });
      toast("Counted");
      renderSection(currentSectionName);
    }
  });
}

function wireContent() {
  const page = document.getElementById("page-content");
  page.querySelector("#add-content-btn").addEventListener("click", function () { openContentForm(null); });
  page.querySelector("#log-post-btn").addEventListener("click", logPostQuick);
  page.querySelectorAll("[data-cday]").forEach(function (li) {
    li.addEventListener("click", function () { openContentPlanForm(Number(li.dataset.cday)); });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openContentPlanForm(Number(li.dataset.cday)); }
    });
  });
  page.querySelectorAll("[data-advance]").forEach(function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); advanceContent(b.dataset.advance); renderContent(); });
  });
  page.querySelectorAll("[data-open]").forEach(function (el) {
    el.addEventListener("click", function () { openContentForm(el.dataset.open); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openContentForm(el.dataset.open); }
    });
  });
  page.querySelectorAll("[data-blog]").forEach(function (b) {
    b.addEventListener("click", function () { markBlogPublished(b.dataset.blog); renderContent(); });
  });
  page.querySelectorAll("[data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { showSection(b.dataset.goto); });
  });
}
