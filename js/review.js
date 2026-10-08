/* ==========================================================
   14. REVIEW
   ========================================================== */
// A week of ticks, why DMs got skipped, the journal, and the purchases on
// hold. Looking back, not more to do.

let reviewWeek = 0;   // 0 = this week, -1 = last week

const REVIEW_SHORT = { god_first: "God", dms_done: "DMs", videos_done: "Videos", comm_done: "Talk", exercise: "Exercise", blog_done: "Blog" };

const HOLD_FIELDS = [
  { key: "item",  label: "What",  type: "text", required: true, autofocus: true, placeholder: "MacBook Air" },
  { key: "price", label: "Price", type: "money", required: true, placeholder: "1200", hint: "USD" },
  { key: "notes", label: "Why you want it", type: "textarea", placeholder: "One honest line" }
];

function renderReview() {
  const keys = weekKeys(reviewWeek);
  const t = dayKey();
  const stats = keys.map(dayStats);
  const past = stats.filter(function (d) { return d.key <= t; });
  const totals = DAILY_CHECKS.map(function (c, i) { return past.filter(function (d) { return d.checks[i]; }).length; });
  const closed = past.filter(function (d) { return d.closed; }).length;
  const screens = past.filter(function (d) { return d.screen !== null && d.screen !== undefined; });
  const screenAvg = screens.length ? Math.round(screens.reduce(function (s, d) { return s + num(d.screen); }, 0) / screens.length) : null;

  const skip = skipReasonBreakdown(30);
  const skipMax = Math.max(1, Math.max.apply(null, Object.keys(skip.counts).map(function (k) { return skip.counts[k]; })));

  const journal = db.days.filter(function (d) { return d.checkin_done; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 14);

  const holds = db.holds.slice().sort(function (a, b) {
    const sa = a.status === "holding" ? 0 : 1, sb2 = b.status === "holding" ? 0 : 1;
    if (sa !== sb2) return sa - sb2;
    return (a.hold_until || "") < (b.hold_until || "") ? -1 : 1;
  });
  const goal = primaryGoal();
  const weekLabel = reviewWeek === 0 ? "This week" : reviewWeek === -1 ? "Last week" : Math.abs(reviewWeek) + " weeks ago";

  const html =
    pageHeader("Review", "Look back once a week. Decide, then go back to Today.") +

    '<section class="panel">' +
      '<div class="panel-head"><h2>' + weekLabel + "</h2>" +
        '<div class="week-nav"><button class="icon-btn" id="week-prev" aria-label="Previous week">' + ICONS.chevronLeft + "</button>" +
          '<span class="week-range">' + escapeHtml(formatShortDate(keys[0]) + " to " + formatShortDate(keys[6])) + "</span>" +
          '<button class="icon-btn" id="week-next" aria-label="Next week"' + (reviewWeek >= 0 ? " disabled" : "") + ">" + ICONS.chevronRight + "</button></div>" +
      "</div>" +
      '<div class="table-scroll"><table class="data-table week-table"><thead><tr><th>Day</th>' +
        DAILY_CHECKS.map(function (c) { return "<th>" + REVIEW_SHORT[c.key] + "</th>"; }).join("") +
        '<th class="num">Instagram</th><th>Closed</th></tr></thead><tbody>' +
      stats.map(function (d) {
        const future = d.key > t;
        const today = d.key === t;
        return '<tr class="' + (future ? "row-future" : "") + (today ? " row-today" : "") + '">' +
          "<td><strong>" + escapeHtml(formatWeekday(d.key)) + "</strong>" + (today ? '<span class="cell-sub">today</span>' : "") + "</td>" +
          (future ? '<td colspan="8"></td>' :
            d.checks.map(function (on) { return '<td class="tick-cell">' + (on ? '<span class="tick on">' + ICONS.check + "</span>" : '<span class="tick"></span>') + "</td>"; }).join("") +
            '<td class="num' + (d.screen !== null && d.screen !== undefined && num(d.screen) > num(S().screen_cap) ? " cell-overdue" : "") + '">' +
              (d.screen === null || d.screen === undefined ? "" : minutesLabel(d.screen)) + "</td>" +
            "<td>" + (d.closed ? '<span class="pill tone-good">Closed</span>' : (today ? '<span class="pill tone-muted">Open</span>' : '<span class="pill tone-bad">Missed</span>')) + "</td>") +
        "</tr>";
      }).join("") +
      "</tbody><tfoot><tr><td>Total</td>" +
        totals.map(function (n) { return '<td class="tick-cell">' + n + " of " + past.length + "</td>"; }).join("") +
        '<td class="num">' + (screenAvg === null ? "" : minutesLabel(screenAvg) + " avg") + "</td>" +
        "<td>" + closed + " of " + past.length + "</td>" +
      "</tr></tfoot></table></div>" +
    "</section>" +

    '<div class="review-grid">' +
    '<section class="panel">' +
      '<div class="panel-head"><h2>DMs skipped, last 30 days</h2><span class="panel-meta">' + skip.skipped + " of " + skip.closed + " closed days</span></div>" +
      (skip.skipped
        ? '<ul class="mini-list">' + SKIP_REASONS.map(function (r) {
            const n = skip.counts[r.value];
            return '<li class="mini-bar-row"><div class="mini-bar-top"><span>' + escapeHtml(r.label) + '</span><strong class="num">' + n + "</strong></div>" +
              '<span class="mini-bar-track"><span class="mini-bar-fill' + (r.value === "mood" || r.value === "notworth" ? " fill-bad" : "") + '" style="width:' + Math.round(n / skipMax * 100) + '%"></span></span></li>';
          }).join("") + "</ul>" +
          '<p class="panel-note">' + escapeHtml(skipVerdict(skip)) + "</p>"
        : '<p class="panel-empty-text">No skipped nights on record. Keep it that way.</p>') +
    "</section>" +

    '<section class="panel">' +
      '<div class="panel-head"><h2>Journal</h2><span class="panel-meta">' + plural(db.days.filter(function (d) { return d.checkin_done; }).length, "night") + " closed</span></div>" +
      (journal.length
        ? '<ul class="journal-list">' + journal.map(function (d) {
            return '<li class="journal-row"><div class="journal-top"><strong>' + escapeHtml(formatWeekday(d.date) + " " + formatShortDate(d.date)) + "</strong>" +
              (d.better === true ? '<span class="pill tone-good">1% better</span>' : d.better === false ? '<span class="pill tone-muted">Not today</span>' : "") +
              "</div>" +
              (d.journal ? '<p class="journal-text">' + escapeHtml(d.journal) + "</p>" : "") +
              '<p class="journal-meta">' + [
                checksDone(d.date) + " of " + DAILY_CHECKS.length + " ticked",
                d.screen_minutes !== null && d.screen_minutes !== undefined ? minutesLabel(d.screen_minutes) + " on Instagram" : null,
                d.dm_skip_reason ? lookup(SKIP_REASONS, d.dm_skip_reason).label : null
              ].filter(Boolean).map(escapeHtml).join(' <span class="dot-sep"></span> ') + "</p>" +
            "</li>";
          }).join("") + "</ul>"
        : '<p class="panel-empty-text">Every closed day lands here. The first one is tonight.</p>') +
    "</section>" +
    "</div>" +

    '<section class="panel">' +
      '<div class="panel-head"><h2>On hold</h2><button class="btn btn-ghost btn-sm" id="add-hold">' + ICONS.plus + "<span>Add</span></button></div>" +
      (holds.length
        ? '<div class="hold-grid">' + holds.map(function (h) { return holdCard(h, goal); }).join("") + "</div>"
        : '<p class="panel-empty-text">The urge to buy something is the signal. Put it here with its price and a date, then look at the maths instead of the checkout page.</p>') +
    "</section>";

  document.getElementById("page-review").innerHTML = html;
  wireReview();
}

function skipVerdict(skip) {
  const mood = skip.counts.mood + skip.counts.notworth;
  if (!skip.skipped) return "";
  if (mood) return mood + (mood === 1 ? " night" : " nights") + " the DMs were skipped on feel, not on a reason. The job is the same every night: send them, then decide.";
  return "The skipped nights were about time, not feel. Move the DMs earlier in the day.";
}

function holdCard(h, goal) {
  const days = h.hold_until ? daysFromToday(h.hold_until) : null;
  const goalLine = goal && num(goal.amount) > 0
    ? (num(goal.current) >= num(goal.amount)
        ? "The goal is reached; this comes out of what is above it."
        : "The goal is still " + formatUSD(num(goal.amount) - num(goal.current)) + " away. This would be bought with money you do not have yet.")
    : "";
  return '<article class="hold-card' + (h.status !== "holding" ? " settled" : "") + '" data-hold="' + h.id + '" tabindex="0">' +
    '<div class="record-top"><div><h3>' + escapeHtml(h.item) + "</h3>" +
      '<p class="record-sub">' + formatUSD(h.price) + "</p></div>" + pill(HOLD_STATUSES, h.status) + "</div>" +
    (h.status === "holding"
      ? '<p class="hold-math">' +
          (days === null ? "" : days > 0 ? "Decide in " + plural(days, "day") + ". " : "Decision day was " + formatShortDate(h.hold_until) + ". ") +
          goalLine + "</p>" +
        '<div class="hold-actions"><button class="btn btn-ghost btn-sm" data-hold-status="bought">Bought it</button>' +
          '<button class="btn btn-ghost btn-sm" data-hold-status="dropped">Dropped it</button></div>'
      : (h.notes ? '<p class="hold-math">' + escapeHtml(h.notes) + "</p>" : "")) +
  "</article>";
}

function openHoldForm(id) {
  const h = id ? byId("holds", id) : null;
  openForm({
    title: h ? "Edit hold" : "Put it on hold",
    fields: HOLD_FIELDS,
    values: h || {},
    saveLabel: h ? "Save" : "Hold for " + HOLD_DAYS + " days",
    onSave: function (values) {
      if (h) update("holds", id, values);
      else {
        create("holds", Object.assign(values, { hold_until: shiftKey(dayKey(), HOLD_DAYS), status: "holding" }));
        toast("On hold until " + formatShortDate(shiftKey(dayKey(), HOLD_DAYS)));
      }
      renderSection(currentSectionName);
    },
    onDelete: h ? function () {
      confirmDelete("this hold", function () { remove("holds", id); renderSection(currentSectionName); });
    } : null
  });
}

function wireReview() {
  const page = document.getElementById("page-review");
  page.querySelector("#week-prev").addEventListener("click", function () { reviewWeek--; renderReview(); });
  page.querySelector("#week-next").addEventListener("click", function () { if (reviewWeek < 0) { reviewWeek++; renderReview(); } });
  page.querySelector("#add-hold").addEventListener("click", function () { openHoldForm(null); });

  page.querySelectorAll("[data-hold-status]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = b.closest("[data-hold]").dataset.hold;
      update("holds", id, { status: b.dataset.holdStatus });
      renderReview();
    });
  });
  page.querySelectorAll("[data-hold]").forEach(function (card) {
    card.addEventListener("click", function () { openHoldForm(card.dataset.hold); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openHoldForm(card.dataset.hold); }
    });
  });
}
