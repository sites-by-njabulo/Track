/* ==========================================================
   15. SETTINGS
   ========================================================== */
// Inline forms, not modals. Targets and the goal sync; theme, PIN and the
// Supabase keys are per device.

function settingsField(key, label, type, value, hint, extra) {
  const id = "s_" + key;
  const inputType = type === "date" ? "date" : type === "password" ? "password" : "text";
  return '<div class="field' + (extra && extra.half ? " field-half" : "") + '">' +
    '<label for="' + id + '">' + escapeHtml(label) + "</label>" +
    '<input type="' + inputType + '"' +
      (type === "number" ? ' inputmode="numeric"' : "") +
      (type === "password" ? ' inputmode="numeric" maxlength="4" autocomplete="off"' : "") +
      ' id="' + id + '" value="' + escapeHtml(value === null || value === undefined ? "" : value) + '"' +
      (extra && extra.placeholder ? ' placeholder="' + escapeHtml(extra.placeholder) + '"' : "") + ">" +
    (hint ? '<span class="field-hint">' + escapeHtml(hint) + "</span>" : "") +
  "</div>";
}

function renderSettings() {
  const s = S();
  const theme = themeSetting();
  const focus = s.focus_formats || [];
  const w = goalWindow();
  const configured = supabaseConfigured();
  const sync = syncLabel();

  const html =
    pageHeader("Settings", "Targets, the goal, the look, and where the data lives.") +
    '<div class="col settings-col">' +

    '<section class="panel"><div class="panel-head"><h2>Theme</h2></div>' +
      segmented("theme-seg", [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Device" }], theme) +
      '<p class="panel-note">Per device. Your phone and laptop can differ.</p>' +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>Daily targets</h2></div>' +
      '<div class="inline-fields">' +
        settingsField("target_dms", "DMs a day", "number", s.target_dms, null, { half: true }) +
        settingsField("target_videos", "Videos posted a day", "number", s.target_videos, null, { half: true }) +
        settingsField("target_comm", "Communication practice, minutes", "number", s.target_comm, null, { half: true }) +
        settingsField("screen_cap", "Screen time cap, minutes", "number", s.screen_cap, null, { half: true }) +
        settingsField("target_blogs", "Blog posts a week", "number", s.target_blogs, null, { half: true }) +
        settingsField("default_deal_value", "Average client value, USD", "number", s.default_deal_value,
          "Used for the on-hold maths until real won deals exist.", { half: true }) +
      "</div>" +
      '<div class="inline-actions"><button class="btn btn-primary" id="save-targets">Save targets</button></div>' +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>Goal</h2></div>' +
      '<div class="inline-fields">' +
        settingsField("goal_amount", "Amount, USD", "number", s.goal_amount, null, { half: true }) +
        settingsField("goal_end", "Deadline", "date", s.goal_end || w.end, null, { half: true }) +
        settingsField("goal_start", "Counting from", "date", s.goal_start || w.start, "Won deals dated inside this window count.", { half: true }) +
      "</div>" +
      '<div class="inline-actions"><button class="btn btn-primary" id="save-goal">Save goal</button></div>' +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>Focus formats</h2><span class="panel-meta">up to 2</span></div>' +
      '<div class="chip-row chip-wrap">' + CONTENT_FORMATS.map(function (f) {
        return '<button class="chip' + (focus.indexOf(f.value) !== -1 ? " active" : "") + '" data-format="' + f.value + '">' + escapeHtml(f.label) + "</button>";
      }).join("") + "</div>" +
      '<p class="panel-note">The Content page sorts these first and shows how many of each you posted this month. Pick two and stop asking the question.</p>' +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>PIN</h2>' + (pinIsDefault() ? '<span class="pill tone-warn">Still 0000</span>' : "") + "</div>" +
      '<div class="inline-fields">' +
        settingsField("pin_old", "Current PIN", "password", "", null, { half: true }) +
        settingsField("pin_new", "New PIN", "password", "", "Four digits.", { half: true }) +
      "</div>" +
      '<div class="inline-actions"><button class="btn btn-primary" id="save-pin">Change PIN</button></div>' +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>Sync</h2>' +
      '<span class="sync-status tone-' + sync.tone + '" data-sync-status><span class="sync-dot"></span><span>' + escapeHtml(sync.label) + "</span></span></div>" +
      '<p class="panel-note top-note">Paste your Supabase project URL and publishable key once per device. Run supabase/schema.sql in that project first. Until then the app saves to this device only.</p>' +
      '<div class="inline-fields">' +
        settingsField("sb_url", "Project URL", "text", localStorage.getItem(KEYS.sbUrl) || "", null, { placeholder: "https://xxxx.supabase.co" }) +
        settingsField("sb_key", "Publishable key", "text", localStorage.getItem(KEYS.sbKey) || "", null, { placeholder: "sb_publishable_..." }) +
      "</div>" +
      '<div class="inline-actions">' +
        '<button class="btn btn-primary" id="save-sync">' + (configured ? "Reconnect" : "Connect") + "</button>" +
        (configured ? '<button class="btn btn-ghost" id="clear-sync">Disconnect this device</button>' : "") +
      "</div>" +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>Data</h2></div>' +
      '<div class="inline-actions">' +
        '<button class="btn btn-ghost" id="export-data">' + ICONS.download + "<span>Export JSON</span></button>" +
        '<label class="btn btn-ghost" for="import-file">' + ICONS.upload + '<span>Import JSON</span></label>' +
        '<input type="file" id="import-file" accept="application/json,.json" class="hidden">' +
      "</div>" +
      '<p class="panel-note">Import merges: a row only replaces yours if it is newer.</p>' +
    "</section>" +

    '<section class="panel about"><p class="panel-note">Track. The day starts at 05:00 and ends when you close it. Built for one person, no account, no feed.</p></section>' +
    "</div>";

  document.getElementById("page-settings").innerHTML = html;
  wireSettings();
}

function readSettingNumber(key) {
  const el = document.getElementById("s_" + key);
  return el ? num(el.value) : 0;
}
function readSettingText(key) {
  const el = document.getElementById("s_" + key);
  return el ? el.value.trim() : "";
}

function wireSettings() {
  const page = document.getElementById("page-settings");

  page.querySelectorAll("#theme-seg button").forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.dataset.value); renderSettings(); });
  });

  page.querySelector("#save-targets").addEventListener("click", function () {
    saveSettings({
      target_dms: Math.max(0, Math.round(readSettingNumber("target_dms"))),
      target_videos: Math.max(0, Math.round(readSettingNumber("target_videos"))),
      target_comm: Math.max(0, Math.round(readSettingNumber("target_comm"))),
      screen_cap: Math.max(0, Math.round(readSettingNumber("screen_cap"))),
      target_blogs: Math.max(0, Math.round(readSettingNumber("target_blogs"))),
      default_deal_value: Math.max(0, readSettingNumber("default_deal_value"))
    });
    toast("Targets saved");
  });

  page.querySelector("#save-goal").addEventListener("click", function () {
    saveSettings({
      goal_amount: Math.max(0, readSettingNumber("goal_amount")),
      goal_start: readSettingText("goal_start") || null,
      goal_end: readSettingText("goal_end") || null
    });
    toast("Goal saved");
  });

  page.querySelectorAll("[data-format]").forEach(function (b) {
    b.addEventListener("click", function () {
      const f = b.dataset.format;
      const cur = (S().focus_formats || []).slice();
      const i = cur.indexOf(f);
      if (i !== -1) cur.splice(i, 1);
      else if (cur.length >= 2) { toast("Two formats. Drop one first."); return; }
      else cur.push(f);
      saveSettings({ focus_formats: cur });
      renderSettings();
    });
  });

  page.querySelector("#save-pin").addEventListener("click", function () {
    const oldPin = readSettingText("pin_old");
    const newPin = readSettingText("pin_new");
    if (pinHash(oldPin) !== storedPinHash()) { toast("Current PIN is wrong"); return; }
    if (!/^\d{4}$/.test(newPin)) { toast("New PIN must be four digits"); return; }
    localStorage.setItem(KEYS.pin, pinHash(newPin));
    toast("PIN changed on this device");
    renderSettings();
  });

  page.querySelector("#save-sync").addEventListener("click", function () {
    const url = readSettingText("sb_url").replace(/\/+$/, "");
    const key = readSettingText("sb_key");
    if (!/^https:\/\/.+/.test(url) || key.length < 20) { toast("Paste both the URL and the key"); return; }
    localStorage.setItem(KEYS.sbUrl, url);
    localStorage.setItem(KEYS.sbKey, key);
    if (!window.supabase) { toast("Supabase script did not load. Check the connection and reload."); renderSettings(); return; }
    connectSupabase().then(function () { toast(sb ? "Connected. Syncing." : "Could not connect"); renderSettings(); });
  });
  const clear = page.querySelector("#clear-sync");
  if (clear) clear.addEventListener("click", function () {
    confirmDialog("Disconnect sync on this device? Your data stays here and in Supabase.", "Disconnect", function () {
      localStorage.removeItem(KEYS.sbUrl);
      localStorage.removeItem(KEYS.sbKey);
      connectSupabase();
      renderSettings();
    });
  });

  page.querySelector("#export-data").addEventListener("click", function () {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "track-" + dayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  page.querySelector("#import-file").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const n = importAll(JSON.parse(reader.result));
        toast(n ? plural(n, "row") + " imported" : "Nothing newer in that file");
        renderSettings();
      } catch (err) {
        toast("Could not read that file");
      }
    };
    reader.readAsText(file);
  });
}
