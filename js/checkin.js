/* ==========================================================
   13. NIGHT CHECK-IN + TOP 3 PICKER
   ========================================================== */
// Four steps and a done screen. Only two answers are required: a reason if
// DMs were under target, and yes or no to "1% better". Everything else is a
// tap or optional. Under thirty seconds, or it will not happen nightly.
//
// The same sheet closes yesterday from the gate: `day` is the day being
// closed and the Top 3 are picked for the day after it.

let checkin = null;

function openCheckin(key) {
  if (activeFocus()) {
    promptPark(function () { openCheckin(key); });
    return;
  }
  const d = dayGet(key);
  const nextKey = shiftKey(key, 1);
  let top = topTasksFor(nextKey).map(function (x) { return x.id; });
  // Suggest carrying over what did not get done, so the honest default is
  // "finish what you started", not a blank slate.
  if (!top.length) top = topTasksFor(key).filter(function (x) { return !x.done; }).map(function (x) { return x.id; });
  checkin = {
    day: key,
    nextKey: nextKey,
    isToday: key === dayKey(),
    step: 1,
    draft: {
      reason: d.dm_skip_reason || null,
      screen: d.screen_minutes === null || d.screen_minutes === undefined ? undefined : d.screen_minutes,
      better: d.better === null || d.better === undefined ? null : !!d.better,
      journal: d.journal || "",
      top: top.slice(0, TOP_LIMIT)
    }
  };
  renderCheckin();
}

function checkinHeader(title) {
  const label = checkin.isToday ? "Closing today" : "Closing " + formatWeekday(checkin.day) + " " + formatShortDate(checkin.day);
  return '<div class="sheet-head">' +
    '<p class="micro-label">' + escapeHtml(label) + ", step " + checkin.step + " of 4</p>" +
    "<h2>" + title + "</h2>" +
    '<div class="step-dots">' + [1, 2, 3, 4].map(function (n) {
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
  const dms = num(d.dms_sent), dmTarget = num(s.target_dms);
  const under = dms < dmTarget;
  const videos = videosPostedOn(checkin.day);
  const blogsWk = (function () { const w = weekKeys(0); return countContent("blog_date", w[0], w[6]); })();

  if (checkin.step === 1) {
    return checkinHeader("The numbers") +
      '<ul class="review-list">' +
        reviewLine("DMs sent", dms + " of " + dmTarget, !under) +
        reviewLine("Videos posted", videos + " of " + num(s.target_videos), videos >= num(s.target_videos)) +
        reviewLine("Communication practice", minutesLabel(d.comm_minutes) + " of " + minutesLabel(s.target_comm), num(d.comm_minutes) >= num(s.target_comm)) +
        reviewLine("Time with God before the phone", d.god_first ? "Yes" : "No", !!d.god_first) +
        reviewLine("Exercise", (function () { const st = exerciseStatus(checkin.day); return st ? st.done + " of " + st.total : (d.exercise ? "Yes" : "No"); })(), exerciseDoneOn(checkin.day)) +
        reviewLine("Blog posts this week", blogsWk + " of " + num(s.target_blogs), blogsWk >= num(s.target_blogs)) +
      "</ul>" +
      (under
        ? '<div class="ask"><h3>' + (dms ? dms + " of " + dmTarget + ". What happened?" : "No DMs today. What happened?") + "</h3>" +
            '<div class="choice-grid">' + SKIP_REASONS.map(function (r) {
              return '<button class="choice' + (dr.reason === r.value ? " on" : "") + '" data-reason="' + r.value + '">' + escapeHtml(r.label) + "</button>";
            }).join("") + "</div>" +
            '<p class="math-box">' + ICONS.pipeline + "<span>" + escapeHtml(dmMathLine(30)) + "</span></p>" +
          "</div>"
        : '<p class="ask-done">' + ICONS.check + " " + dmTarget + " of " + dmTarget + ". That is the whole job. Everything else is a bonus.</p>") +
      checkinFoot("Next", false);
  }

  if (checkin.step === 2) {
    const cap = num(s.screen_cap);
    return checkinHeader("Screen time") +
      '<p class="ask-sub">What did the phone say today? Cap is ' + minutesLabel(cap) + ".</p>" +
      '<div class="choice-grid chips-5">' + SCREEN_CHIPS.map(function (m) {
        return '<button class="choice' + (dr.screen === m ? " on" : "") + (m > cap ? " over" : "") + '" data-screen="' + m + '">' + minutesLabel(m) + "</button>";
      }).join("") +
        '<button class="choice' + (dr.screen === "other" || (typeof dr.screen === "number" && SCREEN_CHIPS.indexOf(dr.screen) === -1) ? " on" : "") + '" data-screen="other">Other</button>' +
        '<button class="choice' + (dr.screen === null ? " on" : "") + '" data-screen="none">Didn\'t check</button>' +
      "</div>" +
      ((dr.screen === "other" || (typeof dr.screen === "number" && SCREEN_CHIPS.indexOf(dr.screen) === -1))
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
      checkinFoot("Next", true);
  }

  if (checkin.step === 4) {
    const label = checkin.isToday ? "Tomorrow's three" : "Today's three";
    return checkinHeader(label) +
      '<p class="ask-sub">Pick up to three. The morning should start decided.</p>' +
      topPickHtml(checkin.nextKey, dr.top) +
      checkinFoot("Close the day", true);
  }

  // Done
  const streak = checkinStreak();
  const count = dr.top.length;
  return '<div class="sheet-head done-head">' +
      '<span class="done-mark">' + ICONS.check + "</span>" +
      '<p class="done-num">' + streak + "</p>" +
      '<p class="micro-label">' + (streak === 1 ? "day closed in a row" : "days closed in a row") + "</p>" +
      "<h2>Day closed.</h2>" +
      "<p>" + (count ? (checkin.isToday ? "Tomorrow" : "Today") + " starts with " + plural(count, "task") + " already chosen." : "Nothing chosen for next. Pick from Tasks when you open it.") + "</p>" +
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
    if (num(d.dms_sent) < num(S().target_dms) && !dr.reason) { toast("Pick the honest reason first."); return; }
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
  }
  if (checkin.step === 4) { finishCheckin(); return; }
  checkin.step++;
  renderCheckin();
}

function finishCheckin() {
  const dr = checkin.draft;
  const d = dayGet(checkin.day);
  const under = num(d.dms_sent) < num(S().target_dms);
  bumpDay(checkin.day, {
    checkin_done: true,
    checkin_at: nowIso(),
    dm_skip_reason: under ? dr.reason : null,
    screen_minutes: typeof dr.screen === "number" ? dr.screen : null,
    better: dr.better,
    journal: dr.journal
  });
  applyTopPick(checkin.nextKey, dr.top);
  checkin.step = 5;
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

  if (checkin.step === 4) wireTopPick(root, dr.top, function () { renderCheckin(); });
}


/* ---------- Top 3 picker (shared with the Today page) ---------- */

function topPickCandidates(key, selected) {
  return openTasks().slice().sort(function (a, b) {
    const sa = selected.indexOf(a.id) !== -1 ? 0 : 1, sb2 = selected.indexOf(b.id) !== -1 ? 0 : 1;
    if (sa !== sb2) return sa - sb2;
    const da = a.due && a.due <= key ? 0 : 1, db2 = b.due && b.due <= key ? 0 : 1;
    if (da !== db2) return da - db2;
    const ad = a.due || "9999", bd = b.due || "9999";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (b.created_at || "") < (a.created_at || "") ? -1 : 1;
  });
}

function topPickHtml(key, selected) {
  const rows = topPickCandidates(key, selected);
  return '<div class="todo-add pick-add">' +
      '<input type="text" id="pick-input" placeholder="Or add a new task" aria-label="New task" autocomplete="off">' +
      '<button class="btn btn-ghost" id="pick-add-btn" aria-label="Add">' + ICONS.plus + "</button>" +
    "</div>" +
    '<p class="pick-count">' + selected.length + " of " + TOP_LIMIT + " picked</p>" +
    (rows.length
      ? '<ul class="pick-list">' + rows.map(function (x) {
          const on = selected.indexOf(x.id) !== -1;
          return '<li class="pick-row' + (on ? " on" : "") + '" data-pick="' + x.id + '" role="checkbox" aria-checked="' + on + '" tabindex="0">' +
            '<span class="checkbox-box">' + ICONS.check + "</span>" +
            '<span class="pick-title">' + escapeHtml(x.title) + "</span>" +
            (x.due ? '<span class="pick-due' + (x.due < dayKey() ? " cell-overdue" : "") + '">' + escapeHtml(relativeDayLabel(x.due)) + "</span>" : "") +
          "</li>";
        }).join("") + "</ul>"
      : '<p class="panel-empty-text">No open tasks. Add one above.</p>');
}

function wireTopPick(root, selected, rerender) {
  root.querySelectorAll("[data-pick]").forEach(function (li) {
    const flip = function () {
      const id = li.dataset.pick;
      const i = selected.indexOf(id);
      if (i !== -1) selected.splice(i, 1);
      else if (selected.length >= TOP_LIMIT) { toast("Three is the limit. Unpick one first."); return; }
      else selected.push(id);
      rerender();
    };
    li.addEventListener("click", flip);
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
    });
  });
  const input = root.querySelector("#pick-input");
  const add = function () {
    const parsed = parseQuickAdd(input.value);
    if (!parsed.title) return;
    const row = create("tasks", { title: parsed.title, due: parsed.due });
    if (selected.length < TOP_LIMIT) selected.push(row.id);
    input.value = "";
    rerender();
    const fresh = sheetBody().querySelector("#pick-input");
    if (fresh) fresh.focus();
  };
  if (input) {
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
    root.querySelector("#pick-add-btn").addEventListener("click", add);
  }
}

function applyTopPick(key, selected) {
  db.tasks.forEach(function (x) {
    const want = selected.indexOf(x.id) !== -1;
    if (want && x.top_date !== key) update("tasks", x.id, { top_date: key });
    else if (!want && x.top_date === key) update("tasks", x.id, { top_date: null });
  });
}

// Standalone picker from the Today page.
let topPickState = null;

function openTopPicker(key, onDone) {
  topPickState = { key: key, selected: topTasksFor(key).map(function (x) { return x.id; }) };
  const render = function () {
    openSheet(
      '<div class="sheet-head"><p class="micro-label">' + escapeHtml(relativeDayLabel(key)) + '</p><h2>Pick your three</h2></div>' +
      topPickHtml(key, topPickState.selected) +
      '<div class="sheet-foot"><span></span><button class="btn btn-primary" data-save>Save</button></div>',
      function () { topPickState = null; if (onDone) onDone(); }
    );
    const root = sheetBody();
    wireTopPick(root, topPickState.selected, render);
    root.querySelector("[data-save]").addEventListener("click", function () {
      applyTopPick(key, topPickState.selected);
      closeSheet();
    });
  };
  render();
}
