/* ==========================================================
   13. NIGHT CHECK-IN
   ========================================================== */
// Three steps and a done screen. Two answers are required: a reason if the
// DMs were skipped, and yes or no to "1% better". Under thirty seconds.
//
// The same sheet closes yesterday from the gate: `day` is the day being
// closed.

let checkin = null;

function openCheckin(key) {
  const d = dayGet(key);
  checkin = {
    day: key,
    isToday: key === dayKey(),
    step: 1,
    draft: {
      reason: d.dm_skip_reason || null,
      screen: d.screen_minutes === null || d.screen_minutes === undefined ? undefined : d.screen_minutes,
      better: d.better === null || d.better === undefined ? null : !!d.better,
      journal: d.journal || ""
    }
  };
  renderCheckin();
}

function checkinHeader(title) {
  const label = checkin.isToday ? "Closing today" : "Closing " + formatWeekday(checkin.day) + " " + formatShortDate(checkin.day);
  return '<div class="sheet-head">' +
    '<p class="micro-label">' + escapeHtml(label) + ", step " + checkin.step + " of 3</p>" +
    "<h2>" + title + "</h2>" +
    '<div class="step-dots">' + [1, 2, 3].map(function (n) {
      return '<span class="step-dot' + (n <= checkin.step ? " on" : "") + '"></span>';
    }).join("") + "</div>" +
  "</div>";
}

function checkinFoot(nextLabel, backable) {
  return '<div class="sheet-foot">' +
    (backable ? '<button class="btn btn-ghost" data-back>Back</button>' : "<span></span>") +
    '<button class="btn btn-primary" data-next>' + nextLabel + "</button>" +
  "</div>";
}

function reviewLine(label, value, hit) {
  return '<li class="review-line' + (hit ? " hit" : "") + '"><span class="review-mark">' + (hit ? ICONS.check : "") + "</span>" +
    "<span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></li>";
}

function checkinHtml() {
  const d = dayGet(checkin.day);
  const s = S();
  const dr = checkin.draft;
  const checks = checksFor(checkin.day);
  const plan = planFor(weekdayIndex(checkin.day));
  const dmsSkipped = !d.dms_done;

  if (checkin.step === 1) {
    return checkinHeader("The day") +
      '<ul class="review-list">' +
        checks.map(function (c) {
          const label = c.key === "exercise" && plan.rest ? "Rest day" : c.label;
          return reviewLine(label, c.done ? "Done" : "Not done", c.done);
        }).join("") +
      "</ul>" +
      (dmsSkipped
        ? '<div class="ask"><h3>The DMs did not go out. What happened?</h3>' +
            '<div class="choice-grid">' + SKIP_REASONS.map(function (r) {
              return '<button class="choice' + (dr.reason === r.value ? " on" : "") + '" data-reason="' + r.value + '">' + escapeHtml(r.label) + "</button>";
            }).join("") + "</div>" +
          "</div>"
        : '<p class="ask-done">' + ICONS.check + " DMs went out. That is the whole job. Everything else is a bonus.</p>") +
      checkinFoot("Next", false);
  }

  if (checkin.step === 2) {
    const cap = num(s.screen_cap);
    const other = dr.screen === "other" || (typeof dr.screen === "number" && SCREEN_CHIPS.indexOf(dr.screen) === -1);
    return checkinHeader("Screen time") +
      '<p class="ask-sub">What did the phone say today? Cap is ' + minutesLabel(cap) + ".</p>" +
      '<div class="choice-grid chips-5">' + SCREEN_CHIPS.map(function (m) {
        return '<button class="choice' + (dr.screen === m ? " on" : "") + (m > cap ? " over" : "") + '" data-screen="' + m + '">' + minutesLabel(m) + "</button>";
      }).join("") +
        '<button class="choice' + (other ? " on" : "") + '" data-screen="other">Other</button>' +
        '<button class="choice' + (dr.screen === null ? " on" : "") + '" data-screen="none">Didn\'t check</button>' +
      "</div>" +
      (other
        ? '<div class="field"><label for="screen-other">Minutes</label><input type="text" inputmode="numeric" id="screen-other" value="' + (typeof dr.screen === "number" ? dr.screen : "") + '" placeholder="75"></div>'
        : "") +
      checkinFoot("Next", true);
  }

  if (checkin.step === 3) {
    return checkinHeader("Did I get 1% better today?") +
      '<div class="yes-no">' +
        '<button class="big-choice' + (dr.better === true ? " on" : "") + '" data-better="yes">Yes</button>' +
        '<button class="big-choice' + (dr.better === false ? " on" : "") + '" data-better="no">No</button>' +
      "</div>" +
      '<div class="field"><label for="journal-line">One line, if you want it</label>' +
        '<textarea id="journal-line" rows="3" placeholder="' + (dr.better === false ? "What got in the way" : "What was it") + '">' + escapeHtml(dr.journal) + "</textarea></div>" +
      checkinFoot("Close the day", true);
  }

  // Done
  const streak = checkinStreak();
  const tomorrow = tasksDueOn(shiftKey(checkin.day, 1)).length;
  return '<div class="sheet-head done-head">' +
      '<span class="done-mark">' + ICONS.check + "</span>" +
      '<p class="done-num">' + streak + "</p>" +
      '<p class="micro-label">' + (streak === 1 ? "day closed in a row" : "days closed in a row") + "</p>" +
      "<h2>Day closed.</h2>" +
      "<p>" + (tomorrow ? plural(tomorrow, "task") + " waiting for " + (checkin.isToday ? "tomorrow" : "today") + "." : "Nothing scheduled for " + (checkin.isToday ? "tomorrow" : "today") + " yet.") + "</p>" +
    "</div>" +
    '<div class="sheet-foot"><span></span><button class="btn btn-primary" data-done>Done</button></div>';
}

function renderCheckin() {
  openSheet(checkinHtml(), function () { checkin = null; renderSection(currentSectionName); });
  wireCheckin();
}

function checkinNext() {
  const dr = checkin.draft;
  const d = dayGet(checkin.day);
  if (checkin.step === 1) {
    if (!d.dms_done && !dr.reason) { toast("Pick the honest reason first."); return; }
  }
  if (checkin.step === 2) {
    if (dr.screen === undefined) { toast("Pick a number, or Didn't check."); return; }
    if (dr.screen === "other") {
      const v = num((document.getElementById("screen-other") || {}).value);
      if (!v) { toast("How many minutes?"); return; }
      dr.screen = Math.round(v);
    }
  }
  if (checkin.step === 3) {
    if (dr.better === null) { toast("Yes or no."); return; }
    const j = document.getElementById("journal-line");
    if (j) dr.journal = j.value.trim();
    finishCheckin();
    return;
  }
  checkin.step++;
  renderCheckin();
}

function finishCheckin() {
  const dr = checkin.draft;
  const d = dayGet(checkin.day);
  bumpDay(checkin.day, {
    checkin_done: true,
    checkin_at: nowIso(),
    dm_skip_reason: d.dms_done ? null : dr.reason,
    screen_minutes: typeof dr.screen === "number" ? dr.screen : null,
    better: dr.better,
    journal: dr.journal
  });
  checkin.step = 4;
  renderCheckin();
}

function wireCheckin() {
  const root = sheetBody();
  const dr = checkin.draft;

  const next = root.querySelector("[data-next]");
  if (next) next.addEventListener("click", checkinNext);
  const back = root.querySelector("[data-back]");
  if (back) back.addEventListener("click", function () {
    const j = root.querySelector("#journal-line");
    if (j) dr.journal = j.value.trim();
    checkin.step--;
    renderCheckin();
  });
  const done = root.querySelector("[data-done]");
  if (done) done.addEventListener("click", closeSheet);

  root.querySelectorAll("[data-reason]").forEach(function (b) {
    b.addEventListener("click", function () { dr.reason = b.dataset.reason; renderCheckin(); });
  });
  root.querySelectorAll("[data-screen]").forEach(function (b) {
    b.addEventListener("click", function () {
      const v = b.dataset.screen;
      dr.screen = v === "none" ? null : v === "other" ? "other" : Number(v);
      renderCheckin();
      const other = sheetBody().querySelector("#screen-other");
      if (other) other.focus();
    });
  });
  root.querySelectorAll("[data-better]").forEach(function (b) {
    b.addEventListener("click", function () {
      const j = root.querySelector("#journal-line");
      if (j) dr.journal = j.value.trim();
      dr.better = b.dataset.better === "yes";
      renderCheckin();
    });
  });
}
