/* ==========================================================
   14. REVIEW
   ========================================================== */
// Where decisions get made: a week of numbers, the skip reasons next to the
// reply rate, the journal, and the purchases on hold with their maths.

let reviewWeek = 0;   // 0 = this week, -1 = last week

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
  const tot = past.reduce(function (a, d) {
    a.dms += d.dms; a.replies += d.replies; a.videos += d.videos; a.blogs += d.blogs; a.comm += d.comm;
    a.parks += d.parks; a.closed += d.closed ? 1 : 0;
    if (d.screen !== null && d.screen !== undefined) { a.screenSum += num(d.screen); a.screenN++; }
    return a;
  }, { dms: 0, replies: 0, videos: 0, blogs: 0, comm: 0, parks: 0, closed: 0, screenSum: 0, screenN: 0 });

  const s30 = statsFor(30);
  const skip = skipReasonBreakdown(30);
  const skipTotal = Object.keys(skip.counts).reduce(function (n, k) { return n + skip.counts[k]; }, 0);
  const skipMax = Math.max(1, Math.max.apply(null, Object.keys(skip.counts).map(function (k) { return skip.counts[k]; })));

  const journal = db.days.filter(function (d) { return d.checkin_done; })
    .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 14);

  const holds = db.holds.slice().sort(function (a, b) {
    const sa = a.status === "holding" ? 0 : 1, sb2 = b.status === "holding" ? 0 : 1;
    if (sa !== sb2) return sa - sb2;
    return (a.hold_until || "") < (b.hold_until || "") ? -1 : 1;
  });
  const goal = goalProgress();
  const avg = avgDealValue();

  const weekLabel = reviewWeek === 0 ? "This week" : reviewWeek === -1 ? "Last week" : Math.abs(reviewWeek) + " weeks ago";

  const html =
    pageHeader("Review", "Decide from the numbers, not from how last night felt.") +

    // Week table
    '<section class="panel">' +
      '<div class="panel-head"><h2>' + weekLabel + '</h2>' +
        '<div class="week-nav"><button class="icon-btn" id="week-prev" aria-label="Previous week">' + ICONS.chevronLeft + "</button>" +
          '<span class="week-range">' + escapeHtml(formatShortDate(keys[0]) + " to " + formatShortDate(keys[6])) + "</span>" +
          '<button class="icon-btn" id="week-next" aria-label="Next week"' + (reviewWeek >= 0 ? " disabled" : "") + ">" + ICONS.chevronRight + "</button></div>" +
      "</div>" +
      '<div class="table-scroll"><table class="data-table week-table"><thead><tr>' +
        '<th>Day</th><th class="num">DMs</th><th class="num">Replies</th><th class="num">Videos</th><th class="num">Blogs</th>' +
        '<th class="num">Talk</th><th class="num">Screen</th><th class="num">Parks</th><th>Closed</th>' +
      "</tr></thead><tbody>" +
      stats.map(function (d) {
        const future = d.key > t;
        const today = d.key === t;
        return '<tr class="' + (future ? "row-future" : "") + (today ? " row-today" : "") + '">' +
          "<td><strong>" + escapeHtml(formatWeekday(d.key)) + "</strong>" + (today ? '<span class="cell-sub">today</span>' : "") + "</td>" +
          (future ? '<td class="num cell-muted" colspan="8"></td>' :
            '<td class="num">' + d.dms + "</td>" +
            '<td class="num">' + d.replies + "</td>" +
            '<td class="num">' + d.videos + "</td>" +
            '<td class="num">' + d.blogs + "</td>" +
            '<td class="num">' + (d.comm ? minutesLabel(d.comm) : "") + "</td>" +
            '<td class="num' + (d.screen !== null && d.screen !== undefined && num(d.screen) > num(S().screen_cap) ? " cell-overdue" : "") + '">' +
              (d.screen === null || d.screen === undefined ? "" : minutesLabel(d.screen)) + "</td>" +
            '<td class="num' + (d.parks ? " cell-due" : "") + '">' + (d.parks || "") + "</td>" +
            "<td>" + (d.closed ? '<span class="pill tone-good">Closed</span>' : (today ? '<span class="pill tone-muted">Open</span>' : '<span class="pill tone-bad">Missed</span>')) + "</td>") +
        "</tr>";
      }).join("") +
      "</tbody><tfoot><tr><td>Total</td>" +
        '<td class="num">' + tot.dms + '</td><td class="num">' + tot.replies + '</td><td class="num">' + tot.videos + "</td>" +
        '<td class="num">' + tot.blogs + '</td><td class="num">' + (tot.comm ? minutesLabel(tot.comm) : "") + "</td>" +
        '<td class="num">' + (tot.screenN ? minutesLabel(Math.round(tot.screenSum / tot.screenN)) + " avg" : "") + "</td>" +
        '<td class="num">' + tot.parks + '</td><td>' + tot.closed + " of " + past.length + "</td>" +
      "</tr></tfoot></table></div>" +
    "</section>" +

    // Honest picture
    '<div class="review-grid">' +
    '<section class="panel">' +
      '<div class="panel-head"><h2>DMs, last 30 days</h2></div>' +
      '<div class="stat-row stat-row-3 compact">' +
        statTile("Reply rate", s30.dmsPerReply ? "1 in " + s30.dmsPerReply : "none", plural(s30.replies, "reply", "replies") + " from " + s30.dms + " DMs") +
        statTile("Per client", s30.dmsPerWon ? s30.dmsPerWon + " DMs" : "none", s30.won ? plural(s30.won, "client") + " won" : "no client yet") +
        statTile("Won", formatUSD(s30.money), s30.calls ? plural(s30.calls, "call") + " booked" : "no calls yet", s30.money ? "good" : null) +
      "</div>" +
      '<h3 class="sub-head">Nights under target: ' + skipTotal + " of " + skip.closed + " closed</h3>" +
      (skipTotal
        ? '<ul class="mini-list">' + SKIP_REASONS.map(function (r) {
            const n = skip.counts[r.value];
            return '<li class="mini-bar-row"><div class="mini-bar-top"><span>' + escapeHtml(r.label) + '</span><strong class="num">' + n + "</strong></div>" +
              '<span class="mini-bar-track"><span class="mini-bar-fill' + (r.value === "mood" || r.value === "notworth" ? " fill-bad" : "") + '" style="width:' + Math.round(n / skipMax * 100) + '%"></span></span></li>';
          }).join("") + "</ul>"
        : '<p class="panel-note">No closed night under target yet.</p>') +
      '<p class="panel-note">' + escapeHtml(verdictLine(s30, skip)) + "</p>" +
    "</section>" +

    // Journal
    '<section class="panel">' +
      '<div class="panel-head"><h2>Journal</h2><span class="panel-meta">' + plural(db.days.filter(function (d) { return d.checkin_done; }).length, "night") + " closed</span></div>" +
      (journal.length
        ? '<ul class="journal-list">' + journal.map(function (d) {
            return '<li class="journal-row"><div class="journal-top"><strong>' + escapeHtml(formatWeekday(d.date) + " " + formatShortDate(d.date)) + "</strong>" +
              (d.better === true ? '<span class="pill tone-good">1% better</span>' : d.better === false ? '<span class="pill tone-muted">Not today</span>' : "") +
              "</div>" +
              (d.journal ? '<p class="journal-text">' + escapeHtml(d.journal) + "</p>" : "") +
              '<p class="journal-meta">' + [
                num(d.dms_sent) + " DMs",
                d.screen_minutes !== null && d.screen_minutes !== undefined ? minutesLabel(d.screen_minutes) + " screen" : null,
                d.dm_skip_reason ? lookup(SKIP_REASONS, d.dm_skip_reason).label : null
              ].filter(Boolean).map(escapeHtml).join(" <span class=\"dot-sep\"></span> ") + "</p>" +
            "</li>";
          }).join("") + "</ul>"
        : '<p class="panel-empty-text">Every closed day lands here. The first one is tonight.</p>') +
    "</section>" +
    "</div>" +

    // Holds
    '<section class="panel">' +
      '<div class="panel-head"><h2>On hold</h2><button class="btn btn-ghost btn-sm" id="add-hold">' + ICONS.plus + "<span>Add</span></button></div>" +
      (holds.length
        ? '<div class="hold-grid">' + holds.map(function (h) { return holdCard(h, goal, avg); }).join("") + "</div>"
        : '<p class="panel-empty-text">The urge to buy something is the signal. Put it here with its price and a date, then look at the maths instead of the checkout page.</p>') +
    "</section>";

  document.getElementById("page-review").innerHTML = html;
  wireReview();
}

// One sentence that puts the mood next to the maths.
function verdictLine(s, skip) {
  const mood = skip.counts.mood + skip.counts.notworth;
  if (!s.dms) return "Nothing to judge yet. Thirty days of DMs will answer the question for you.";
  if (!s.replies) return "Too early to call it. " + s.dms + " DMs with no reply is a sample, not a verdict. Keep sending until the number is real.";
  if (mood && s.won) return mood + (mood === 1 ? " night" : " nights") + " you stopped on feel. The numbers say 1 client per " + s.dmsPerWon + " DMs. Feel was wrong every one of those nights.";
  if (mood) return mood + (mood === 1 ? " night" : " nights") + " you stopped on feel, and replies are coming in at 1 per " + s.dmsPerReply + ". The pipeline is working; the nights off are what is slowing it.";
  if (s.won) return "1 client per " + s.dmsPerWon + " DMs. Every " + s.dmsPerWon + " DMs is a client. That is the whole decision.";
  return "Replies at 1 per " + s.dmsPerReply + " DMs. Keep the count up and the calls follow.";
}

function holdCard(h, goal, avg) {
  const days = h.hold_until ? daysFromToday(h.hold_until) : null;
  const need = clientsNeeded(h.price);
  const short = Math.max(0, num(h.price) - Math.max(0, goal.won - goal.target));
  return '<article class="hold-card' + (h.status !== "holding" ? " settled" : "") + '" data-hold="' + h.id + '" tabindex="0">' +
    '<div class="record-top"><div><h3>' + escapeHtml(h.item) + "</h3>" +
      '<p class="record-sub">' + formatUSD(h.price) + "</p></div>" + pill(HOLD_STATUSES, h.status) + "</div>" +
    (h.status === "holding"
      ? '<p class="hold-math">' +
          (days === null ? "" : days > 0 ? "Decide in " + plural(days, "day") + ". " : "Decision day was " + formatShortDate(h.hold_until) + ". ") +
          "That is " + plural(need, "client") + " at " + formatUSD(avg) + " each. " +
          (goal.won >= goal.target ? "The goal is hit; this comes out of what is above it."
            : "The goal is still " + formatUSD(goal.remaining) + " away, so this would be bought with money you do not have yet.") +
        "</p>" +
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
        toast("On hold. " + plural(clientsNeeded(values.price), "client") + " of work.");
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
