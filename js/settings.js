/* ==========================================================
   15. SETTINGS
   ========================================================== */
// Inline forms, not modals. Targets and the mix sync; theme, PIN and the
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
  const mix = s.weekly_mix || {};
  const configured = supabaseConfigured();
  const sync = syncLabel();

  const html =
    pageHeader("Settings", "Targets, the look, and where the data lives.") +
    '<div class="col settings-col">' +

    '<section class="panel"><div class="panel-head"><h2>Theme</h2></div>' +
      '<div class="theme-wrap">' + segmented("theme-seg", [{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "Device" }], theme) + "</div>" +
      '<p class="panel-note">Per device. Your phone and laptop can differ.</p>' +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>Daily targets</h2></div>' +
      '<div class="inline-fields">' +
        settingsField("target_dms", "Cold DMs a day", "number", s.target_dms, null, { half: true }) +
        settingsField("target_videos", "Videos posted a day", "number", s.target_videos, null, { half: true }) +
        settingsField("target_comm", "Communication practice, minutes", "number", s.target_comm, null, { half: true }) +
        settingsField("screen_cap", "Screen time cap, minutes", "number", s.screen_cap, null, { half: true }) +
        settingsField("target_blogs", "Blog posts a week", "number", s.target_blogs, null, { half: true }) +
      "</div>" +
      '<div class="inline-actions"><button class="btn btn-primary" id="save-targets">Save targets</button></div>' +
      '<p class="panel-note">These only change the wording of the to-do list. Each item is a tick, done or not done.</p>' +
    "</section>" +

    '<section class="panel"><div class="panel-head"><h2>Weekly video mix</h2><span class="panel-meta">' + weekTargetTotal() + " a week</span></div>" +
      '<div class="inline-fields">' + CONTENT_FORMATS.map(function (f) {
        return settingsField("mix_" + f.value, f.label, "number", num(mix[f.value]) || 0, null, { half: true });
      }).join("") + "</div>" +
      '<div class="inline-actions"><button class="btn btn-primary" id="save-mix">Save mix</button></div>' +
      '<p class="panel-note">How many of each kind to post per week. Zero hides a format. The Content page and the Today card are built from this.</p>' +
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
      target_blogs: Math.max(0, Math.round(readSettingNumber("target_blogs")))
    });
    toast("Targets saved");
  });

  page.querySelector("#save-mix").addEventListener("click", function () {
    const mix = {};
    CONTENT_FORMATS.forEach(function (f) {
      const n = Math.max(0, Math.round(readSettingNumber("mix_" + f.value)));
      if (n) mix[f.value] = n;
    });
    saveSettings({ weekly_mix: mix });
    toast("Mix saved: " + weekTargetTotal() + " videos a week");
    renderSettings();
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
