/* ==========================================================
   11. PIPELINE
   ========================================================== */
// DMs sent are a daily counter on Today. A lead row exists from the first
// reply. The stats strip turns the two into the sentence that decides whether
// outreach is worth it: numbers, not the mood at 21:00.

let pipelineWindow = 30;      // 7 | 30
let pipelineFilter = "open";  // open | all | a stage

const LEAD_FIELDS = [
  { key: "name",           label: "Name",      type: "text", required: true, autofocus: true, placeholder: "Who replied", half: true },
  { key: "business",       label: "Business",  type: "text", placeholder: "Their company", half: true },
  { key: "platform",       label: "Came from", type: "select", options: LEAD_PLATFORMS, half: true },
  { key: "service",        label: "Service",   type: "select", options: LEAD_SERVICES, half: true },
  { key: "stage",          label: "Stage",     type: "select", options: LEAD_STAGES, half: true },
  { key: "value",          label: "Value",     type: "money", placeholder: "1500", hint: "USD. Counts toward the goal once Won.", half: true },
  { key: "follow_up_date", label: "Follow up on", type: "date", half: true },
  { key: "notes",          label: "Notes",     type: "textarea", placeholder: "What they said, what they need, what you promised" }
];

function leadsVisible() {
  let rows = db.leads.slice();
  if (pipelineFilter === "open") rows = rows.filter(function (l) { return OPEN_STAGES.indexOf(l.stage) !== -1; });
  else if (pipelineFilter !== "all") rows = rows.filter(function (l) { return l.stage === pipelineFilter; });
  rows.sort(function (a, b) {
    const av = a.follow_up_date || "9999-99-99", bv = b.follow_up_date || "9999-99-99";
    if (av !== bv) return av < bv ? -1 : 1;
    return (b.updated_at || "") < (a.updated_at || "") ? -1 : 1;
  });
  return rows;
}

function renderPipeline() {
  const s = statsFor(pipelineWindow);
  const rows = leadsVisible();
  const chips = [{ value: "open", label: "Open", count: db.leads.filter(function (l) { return OPEN_STAGES.indexOf(l.stage) !== -1; }).length },
                 { value: "all", label: "All", count: db.leads.length }]
    .concat(LEAD_STAGES.map(function (st) {
      return { value: st.value, label: st.label, count: db.leads.filter(function (l) { return l.stage === st.value; }).length };
    }));

  const html =
    pageHeader("Pipeline", "A lead starts at the first reply. DMs are counted on Today.", primaryAction("Add lead", "add-lead-btn")) +

    '<div class="toolbar"><div class="segmented-wrap">' +
      segmented("pipeline-window", [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }], String(pipelineWindow)) +
    "</div></div>" +

    '<div class="stat-row stat-row-4">' +
      statTile("DMs sent", String(s.dms), s.dms ? "about " + (Math.round(s.dms / pipelineWindow * 10) / 10) + " a day" : "none logged") +
      statTile("Replies", String(s.replies), s.dmsPerReply ? "1 per " + s.dmsPerReply + " DMs" : "no replies yet") +
      statTile("Calls booked", String(s.calls), s.replies ? formatPercent(s.calls / s.replies) + " of replies" : "") +
      statTile("Won", String(s.won), s.won ? formatUSD(s.money) + (s.dmsPerWon ? ", 1 per " + s.dmsPerWon + " DMs" : "") : "nothing closed yet", s.won ? "good" : null) +
    "</div>" +
    '<p class="math-line math-line-wide">' + escapeHtml(dmMathLine(pipelineWindow)) + "</p>" +

    '<div class="toolbar"><div class="chip-row">' +
      chips.map(function (c) {
        return '<button class="chip' + (pipelineFilter === c.value ? " active" : "") + '" data-filter="' + c.value + '">' +
               escapeHtml(c.label) + '<span class="chip-count">' + c.count + "</span></button>";
      }).join("") +
    "</div></div>" +

    (rows.length ? leadsTable(rows)
      : (db.leads.length
          ? emptyState("pipeline", "Nothing here", "No leads match this filter.")
          : emptyState("pipeline", "No replies yet", "The moment someone replies to a DM, add them here. From then on every number on this page is real.")));

  document.getElementById("page-pipeline").innerHTML = html;
  wirePipeline();
}

function followUpCell(l) {
  if (!l.follow_up_date) return { cls: "cell-muted", text: "" };
  if (OPEN_STAGES.indexOf(l.stage) === -1) return { cls: "cell-muted", text: formatShortDate(l.follow_up_date) };
  const d = daysFromToday(l.follow_up_date);
  const label = relativeDayLabel(l.follow_up_date);
  if (d < 0) return { cls: "cell-overdue", text: label };
  if (d === 0) return { cls: "cell-due", text: label };
  return { cls: "", text: label };
}

function leadsTable(rows) {
  return '<div class="table-wrap">' +
    '<table class="data-table"><thead><tr>' +
      "<th>Name</th><th>Service</th><th>From</th><th>Stage</th>" +
      '<th class="num">Value</th><th>Follow up</th>' +
    "</tr></thead><tbody>" +
    rows.map(function (l) {
      const due = followUpCell(l);
      return '<tr data-id="' + l.id + '" tabindex="0">' +
        "<td><strong>" + escapeHtml(l.name || "Unnamed") + "</strong>" +
          (l.business ? '<span class="cell-sub">' + escapeHtml(l.business) + "</span>" : "") + "</td>" +
        "<td>" + escapeHtml(lookup(LEAD_SERVICES, l.service).label) + "</td>" +
        "<td>" + escapeHtml(lookup(LEAD_PLATFORMS, l.platform).label) + "</td>" +
        "<td>" + pill(LEAD_STAGES, l.stage) + "</td>" +
        '<td class="num">' + (num(l.value) ? formatUSD(l.value) : "") + "</td>" +
        '<td class="' + due.cls + '">' + due.text + "</td>" +
      "</tr>";
    }).join("") +
    "</tbody></table></div>" +

    '<div class="card-list">' +
    rows.map(function (l) {
      const due = followUpCell(l);
      return '<article class="record-card" data-id="' + l.id + '" tabindex="0">' +
        '<div class="record-top"><div><h3>' + escapeHtml(l.name || "Unnamed") + "</h3>" +
          '<p class="record-sub">' + escapeHtml([l.business, lookup(LEAD_SERVICES, l.service).label].filter(Boolean).join(", ")) + "</p></div>" +
          pill(LEAD_STAGES, l.stage) + "</div>" +
        '<div class="record-meta">' +
          '<span class="record-money">' + (num(l.value) ? formatUSD(l.value) : "") + "</span>" +
          '<span class="' + due.cls + '">' + due.text + "</span>" +
        "</div>" +
      "</article>";
    }).join("") +
    "</div>";
}

// Stamps the date column for the stage being entered, the first time only.
// "Calls last 7 days" and "won this month" both read these columns; the stage
// itself is a state and cannot answer when.
function stampStage(values, existing) {
  const col = STAGE_DATE[values.stage];
  if (col && !(existing && existing[col])) values[col] = dayKey();
  if (!existing && !values.replied_date) values.replied_date = dayKey();
  return values;
}

function openLeadForm(id) {
  const lead = id ? byId("leads", id) : null;
  openForm({
    title: lead ? "Edit lead" : "Someone replied",
    fields: LEAD_FIELDS,
    values: lead || { stage: "replied", platform: "instagram", service: "web" },
    saveLabel: lead ? "Save" : "Add lead",
    onSave: function (values) {
      stampStage(values, lead);
      if (lead) {
        update("leads", id, values);
        toast(values.stage === "won" && lead.stage !== "won" ? "Won. Counted toward the goal." : "Saved");
      } else {
        create("leads", values);
        toast("Lead added");
      }
      renderSection(currentSectionName);
    },
    onDelete: lead ? function () {
      confirmDelete(lead.name || "this lead", function () { remove("leads", id); renderSection(currentSectionName); });
    } : null
  });
}

function wirePipeline() {
  const page = document.getElementById("page-pipeline");
  page.querySelector("#add-lead-btn").addEventListener("click", function () { openLeadForm(null); });
  page.querySelectorAll("#pipeline-window button").forEach(function (b) {
    b.addEventListener("click", function () { pipelineWindow = Number(b.dataset.value); renderPipeline(); });
  });
  page.querySelectorAll(".chip").forEach(function (c) {
    c.addEventListener("click", function () { pipelineFilter = c.dataset.filter; renderPipeline(); });
  });
  page.querySelectorAll("[data-id]").forEach(function (el) {
    el.addEventListener("click", function () { openLeadForm(el.dataset.id); });
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLeadForm(el.dataset.id); }
    });
  });
}
