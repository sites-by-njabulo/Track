/* ==========================================================
   10. CONTENT
   ========================================================== */
// One list of videos with a stage. The next action is derived from the stage,
// so the page always answers "what do I do with content right now" without
// him opening Instagram to find out.

let contentFilter = "queue";   // queue | all | idea | scripted | filmed | edited | posted

const CONTENT_FIELDS = [
  { key: "title",  label: "Title",  type: "text", required: true, autofocus: true, placeholder: "The hook, or a working title" },
  { key: "format", label: "Format", type: "select", options: CONTENT_FORMATS, half: true },
  { key: "stage",  label: "Stage",  type: "select", options: CONTENT_STAGES, half: true },
  { key: "link",   label: "Script link", type: "url", placeholder: "Google Doc, Notes, anything" },
  { key: "notes",  label: "Notes",  type: "textarea", placeholder: "Angle, proof to include, where it goes" }
];

function contentVisible() {
  let rows = db.content.slice();
  if (contentFilter === "queue") rows = rows.filter(function (c) { return c.stage !== "posted"; });
  else if (contentFilter !== "all") rows = rows.filter(function (c) { return c.stage === contentFilter; });
  rows.sort(function (a, b) {
    if (contentFilter === "posted" || contentFilter === "all") {
      return (b.posted_date || b.updated_at || "") < (a.posted_date || a.updated_at || "") ? -1 : 1;
    }
    const r = (STAGE_RANK[a.stage] !== undefined ? STAGE_RANK[a.stage] : 9) - (STAGE_RANK[b.stage] !== undefined ? STAGE_RANK[b.stage] : 9);
    if (r) return r;
    return (a.created_at || "") < (b.created_at || "") ? -1 : 1;
  });
  return rows;
}

function renderContent() {
  const next = nextContentAction();
  const queue = contentQueueCount();
  const capped = queue > CONTENT_QUEUE_CAP;
  const ideas = db.content.filter(function (c) { return c.stage === "idea"; }).length;
  const focus = S().focus_formats || [];
  const mix = formatMix(30);
  const mixMax = Math.max(1, Math.max.apply(null, mix.map(function (m) { return m.count; })));
  const blog = blogCandidate();

  const sub = next
    ? plural(queue, "video") + " started and not posted. Next: " + escapeHtml(next.verb) + " <strong>" + escapeHtml(next.item.title) + "</strong>."
    : "Nothing in progress. Add an idea, or script one you already have.";

  const action = capped
    ? '<button class="btn btn-ghost" id="add-content-btn">Add anyway <span class="chip-count">' + queue + " waiting</span></button>"
    : primaryAction("Add idea", "add-content-btn");

  const chips = [{ value: "queue", label: "In progress", count: db.content.length - db.content.filter(function (c) { return c.stage === "posted"; }).length },
                 { value: "all", label: "All", count: db.content.length }]
    .concat(CONTENT_STAGES.map(function (s) {
      return { value: s.value, label: s.label, count: db.content.filter(function (c) { return c.stage === s.value; }).length };
    }));

  const rows = contentVisible();

  const html =
    pageHeader("Content", sub, action) +

    (capped
      ? '<div class="notice">' +
          '<span class="notice-icon">' + ICONS.alert + "</span>" +
          "<div><strong>Idea capture is closed.</strong> " + queue + " videos are started and not posted. Finish " +
          (queue - CONTENT_QUEUE_CAP) + " before you go looking for new ideas. You are not short of ideas, you are short of posts.</div>" +
        "</div>"
      : "") +

    '<div class="content-grid">' +
      // Next action: the one card that answers "what now".
      '<section class="panel next-panel">' +
        '<p class="micro-label">Next action</p>' +
        (next
          ? '<h2 class="next-title"><span class="next-verb">' + escapeHtml(next.verb) + "</span> " + escapeHtml(next.item.title) + "</h2>" +
            '<p class="next-sub">' + escapeHtml(lookup(CONTENT_FORMATS, next.item.format).label) + ", " +
              escapeHtml(lookup(CONTENT_STAGES, next.item.stage).label.toLowerCase()) + " so far." +
              (next.item.link ? ' <a class="doc-link" href="' + escapeHtml(next.item.link) + '" target="_blank" rel="noopener">Open script ' + ICONS.external + "</a>" : "") +
            "</p>" +
            '<div class="next-actions">' +
              '<button class="btn btn-primary" data-advance="' + next.item.id + '">Done, mark ' + escapeHtml(lookup(CONTENT_STAGES, next.nextStage).label.toLowerCase()) + "</button>" +
              '<button class="btn btn-ghost" data-open="' + next.item.id + '">Open</button>' +
            "</div>"
          : '<h2 class="next-title">Nothing to do yet</h2><p class="next-sub">Every idea you add shows up here with its next step.</p>') +
      "</section>" +

      // Formats: what he should be making, against what he made.
      '<section class="panel">' +
        '<div class="panel-head"><h2>Posted, last 30 days</h2>' +
          (focus.length ? "" : '<button class="link-btn" data-goto="settings">Pick focus formats</button>') +
        "</div>" +
        '<ul class="mini-list">' +
          mix.map(function (m) {
            const isFocus = focus.indexOf(m.value) !== -1;
            return '<li class="mini-bar-row' + (isFocus ? " focus" : "") + '">' +
              '<div class="mini-bar-top"><span>' + escapeHtml(m.label) +
                (isFocus ? ' <span class="pill tone-neutral">Focus</span>' : "") + "</span>" +
                '<strong class="num">' + m.count + "</strong></div>" +
              '<span class="mini-bar-track"><span class="mini-bar-fill" style="width:' + Math.round(m.count / mixMax * 100) + '%"></span></span>' +
            "</li>";
          }).join("") +
        "</ul>" +
        (focus.length
          ? '<p class="panel-note">Focus: ' + focus.map(function (f) { return escapeHtml(lookup(CONTENT_FORMATS, f).label); }).join(" and ") +
            ". Everything else is a side dish.</p>"
          : '<p class="panel-note">Two formats, chosen once, so the question of what kind of video to make is already answered.</p>') +
        (blog
          ? '<div class="blog-row"><span>' + ICONS.book + "</span><div><strong>Blog this week: " + blogsThisWeek() + " of " + S().target_blogs + "</strong>" +
            '<span class="cell-sub">Next post: ' + escapeHtml(blog.title) + '</span></div><button class="btn btn-ghost btn-sm" data-blog="' + blog.id + '">Published</button></div>'
          : "") +
      "</section>" +
    "</div>" +

    '<div class="toolbar"><div class="chip-row">' +
      chips.map(function (c) {
        return '<button class="chip' + (contentFilter === c.value ? " active" : "") + '" data-filter="' + c.value + '">' +
               escapeHtml(c.label) + '<span class="chip-count">' + c.count + "</span></button>";
      }).join("") +
    "</div></div>" +

    (rows.length
      ? '<ul class="content-list">' + rows.map(contentRow).join("") + "</ul>"
      : (db.content.length
          ? emptyState("content", "Nothing here", "No videos match this filter.")
          : emptyState("content", "No videos yet", "Add the scripts you already have. Each one shows its next step, and the oldest finished one is always the next thing to post."))) +

    (ideas > 0 && contentFilter === "queue" ? "" : "");

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
        '<span class="dot-sep"></span>' + pill(CONTENT_STAGES, c.stage) +
        (c.posted_date ? '<span class="dot-sep"></span><span>Posted ' + escapeHtml(formatShortDate(c.posted_date)) + "</span>" : "") +
        (c.blog_date ? '<span class="dot-sep"></span><span class="task-due">Blog ' + escapeHtml(formatShortDate(c.blog_date)) + "</span>" : "") +
      "</span>" +
    "</div>" +
    (verb ? '<button class="btn btn-ghost btn-sm" data-advance="' + c.id + '">' + escapeHtml(verb) + "</button>" : "") +
  "</li>";
}

// The one write path for a stage change. Posted stamps posted_date with today
// (which is what the Today counter reads); moving back clears it.
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
  toast(next === "posted" ? "Posted. Counted on Today." : "Marked " + lookup(CONTENT_STAGES, next).label.toLowerCase());
}

function markBlogPublished(id) {
  update("content", id, { blog_date: dayKey() });
  toast("Blog post counted for this week");
}

function openContentForm(id, preset) {
  const c = id ? byId("content", id) : null;
  openForm({
    title: c ? "Edit video" : "New idea",
    fields: CONTENT_FIELDS,
    values: c || Object.assign({ stage: "idea", format: (S().focus_formats || [])[0] || "other" }, preset || {}),
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

// From Today: a post that was never tracked still counts. Two fields.
function logPostQuick() {
  openForm({
    title: "Log a post",
    fields: [
      { key: "title",  label: "What did you post", type: "text", required: true, autofocus: true },
      { key: "format", label: "Format", type: "select", options: CONTENT_FORMATS }
    ],
    values: { format: (S().focus_formats || [])[0] || "other" },
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
  page.querySelectorAll(".chip").forEach(function (c) {
    c.addEventListener("click", function () { contentFilter = c.dataset.filter; renderContent(); });
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
