/* ==========================================================
   10d. STAND
   ========================================================== */
// For the moment the urge hits. One tap opens a dark, full-screen flow, one
// thing per screen: breathe, name it, a verse, what is on the line, straight
// talk, do this instead, pray, done. Every stand is logged so Review can
// show the count. A slip has its own short path so it never becomes a
// spiral: confess, get up, tomorrow is still yours.
//
// Tone: this is written to a 17-year-old Christian who asked for it. Hard,
// direct, never shaming. God is building him, not punishing him.

const STAND_VERSES = [
  { text: "No temptation has overtaken you but such as is common to man; and God is faithful, who will not allow you to be tempted beyond what you are able, but with the temptation will provide the way of escape also.", reference: "1 Corinthians 10:13" },
  { text: "Now flee from youthful lusts and pursue righteousness, faith, love and peace, with those who call on the Lord from a pure heart.", reference: "2 Timothy 2:22" },
  { text: "How can a young man keep his way pure? By keeping it according to Your word.", reference: "Psalm 119:9" },
  { text: "I have made a covenant with my eyes.", reference: "Job 31:1" },
  { text: "Walk by the Spirit, and you will not carry out the desire of the flesh.", reference: "Galatians 5:16" },
  { text: "Put on the Lord Jesus Christ, and make no provision for the flesh in regard to its lusts.", reference: "Romans 13:14" },
  { text: "Submit therefore to God. Resist the devil and he will flee from you.", reference: "James 4:7" },
  { text: "Watch over your heart with all diligence, for from it flow the springs of life.", reference: "Proverbs 4:23" },
  { text: "Blessed are the pure in heart, for they shall see God.", reference: "Matthew 5:8" },
  { text: "Create in me a clean heart, O God, and renew a steadfast spirit within me.", reference: "Psalm 51:10" },
  { text: "Be of sober spirit, be on the alert. Your adversary, the devil, prowls around like a roaring lion, seeking someone to devour. But resist him, firm in your faith.", reference: "1 Peter 5:8-9" },
  { text: "Let us also lay aside every encumbrance and the sin which so easily entangles us, and let us run with endurance the race that is set before us.", reference: "Hebrews 12:1" },
  { text: "I can do all things through Him who strengthens me.", reference: "Philippians 4:13" },
  { text: "Be on the alert, stand firm in the faith, act like men, be strong.", reference: "1 Corinthians 16:13" }
];
const STAND_FINAL_VERSE = { text: "Blessed is a man who perseveres under trial; for once he has been approved, he will receive the crown of life which the Lord has promised to those who love Him.", reference: "James 1:12" };
const STAND_SLIP_VERSES = [
  { text: "If we confess our sins, He is faithful and righteous to forgive us our sins and to cleanse us from all unrighteousness.", reference: "1 John 1:9" },
  { text: "For a righteous man falls seven times, and rises again.", reference: "Proverbs 24:16" }
];

// Hard lines in the cadence he asked for. Written here, not quoted from anyone.
const STAND_LINES = [
  "Every man who ever became something sat exactly where you are sitting. So did every man who became nothing. The next sixty seconds is the only difference between them.",
  "You do not get the blessing and the habit. God is not confused about which one you keep choosing. Pick.",
  "Comfortable men stay average. Average men stay broke, stay soft, stay waiting. You were not built to wait.",
  "The urge is not strong. It is just loud. Loud things lose to quiet men who do not answer.",
  "Nobody is coming to pull the phone out of your hand. Good. This win is yours alone, and so is the loss.",
  "Discipline is picking what you want most over what you want now. You told God what you want most. Act like it.",
  "A man who cannot say no to a screen will not be trusted with a family, a business, or a calling. Earn the trust tonight.",
  "You are not tired. You are tempted. Those feel the same at 11pm and they are not the same.",
  "Weak men negotiate with the urge. Strong men do not pick up the call.",
  "Ten minutes of nothing, then days of shame. That is the trade on the table. Only a fool takes it twice.",
  "The version of you that gets the clients, the wife, the respect, is on the other side of this exact moment. Won repeatedly. Starting now.",
  "You have already proven you can lose to this. Boring. Prove something new.",
  "Hard now, proud tomorrow. Easy now, ashamed tomorrow. You already know which one you will feel at 6am.",
  "God is developing you, not punishing you. Development is just repetitions of this moment, won.",
  "Men talk about discipline in the daytime. Discipline is decided in the dark, alone, with nobody watching except God.",
  "Put the phone down like a man who has somewhere to be in the morning. Because you do."
];

const STAND_FEELINGS = [
  { value: "bored",    label: "Bored",          truth: "Boredom is a signal to build something, not to consume something." },
  { value: "lonely",   label: "Lonely",         truth: "Lonely gets fixed by people and by God. A screen makes it worse by morning." },
  { value: "stressed", label: "Stressed",       truth: "Stress wants a release. Push-ups give it. This gives shame plus the same stress tomorrow." },
  { value: "tired",    label: "Tired",          truth: "Tired men make bad trades. Going to sleep is the win here." },
  { value: "habit",    label: "It is just this hour", truth: "Then the fix is the hour. Phone out of the room at ten, every night." },
  { value: "other",    label: "Something else", truth: "Whatever it is, it is real, and it deserves better than this." }
];

const STAND_DEFAULT_STAKES = [
  "Your future wife, and the man she is praying to meet.",
  "Your kids, and a father who can look them in the eye.",
  "The $5,000 goal, and every client behind it.",
  "The people you are meant to help, who are waiting for a version of you that shows up.",
  "Tonight's sleep, tomorrow's morning, tomorrow's 30 DMs.",
  "Your peace with God, and the blessing you keep asking Him for.",
  "Your self-respect, which you cannot buy back in the morning."
];

const STAND_ACTIONS = [
  { value: "phone",   label: "Phone in another room, then bed" },
  { value: "pushups", label: "30 push-ups, right now" },
  { value: "water",   label: "Cold water on the face, a glass to drink" },
  { value: "pray",    label: "Pray for 60 seconds, out loud" }
];

const STAND_PRAYER = "Father, I feel this pull and I am bringing it to You instead of hiding it. You see me and You are not disgusted. Keep my eyes. Keep my heart. Make me the man You can trust with more. I choose You tonight. Amen.";

const STAND_STEPS = ["breathe", "name", "verse", "stakes", "talk", "act", "pray", "done"];

let stand = null;          // { step, feeling, action, verse, line, timer }

function standStakes() {
  const custom = String(S().stand_list || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  return custom.length ? custom : STAND_DEFAULT_STAKES;
}
function standsIn(n) {
  const keys = windowKeys(n);
  return db.stands.filter(function (s) { return inRange(s.date, keys[0], keys[keys.length - 1]); });
}
function standsThisMonth() {
  const t = dayKey();
  const lo = t.slice(0, 7) + "-01";
  return db.stands.filter(function (s) { return inRange(s.date, lo, t); });
}
function standCount(list, outcome) { return list.filter(function (s) { return s.outcome === outcome; }).length; }


/* ---------- The page ---------- */

function renderStand() {
  const month = standsThisMonth();
  const stood = standCount(month, "stood");
  const slipped = standCount(month, "slipped");
  const recent = db.stands.slice().sort(function (a, b) { return (a.at || "") < (b.at || "") ? 1 : -1; }).slice(0, 7);

  const html =
    pageHeader("Stand", stood ? '<span class="sub-check">' + ICONS.check + "</span>" + plural(stood, "time") + " stood this month" : "Stand firm in the faith. 1 Corinthians 16:13") +
    '<div class="col">' +
      '<section class="stand-hero">' +
        '<p class="stand-hero-text">When the urge hits, open this. Do not think, do not argue with it, just press the button and follow the screens. It takes about three minutes.</p>' +
        '<button class="btn btn-primary stand-go" id="stand-go">' + ICONS.shield + "<span>I feel the urge</span></button>" +
        '<button class="link-btn stand-slip-link" id="stand-slip">I already gave in</button>' +
      "</section>" +
      (recent.length
        ? '<section class="panel"><div class="panel-head"><h2>This month</h2><span class="panel-meta">' + stood + " stood" + (slipped ? ", " + slipped + " slipped" : "") + "</span></div>" +
            '<ul class="mini-list">' + recent.map(function (s) {
              return "<li><span>" + escapeHtml(formatWeekday(s.date) + " " + formatShortDate(s.date)) + (s.at ? ", " + escapeHtml(formatTime(s.at)) : "") +
                (s.feeling ? '<span class="cell-sub">' + escapeHtml(lookup(STAND_FEELINGS, s.feeling).label) + "</span>" : "") + "</span>" +
                (s.outcome === "stood" ? '<span class="pill tone-good">Stood</span>' : '<span class="pill tone-muted">Got back up</span>') + "</li>";
            }).join("") + "</ul></section>"
        : "") +
      '<p class="panel-note">The list of what is on the line is yours to edit in Settings. The verses and the straight talk rotate, so it does not go stale.</p>' +
    "</div>";

  document.getElementById("page-stand").innerHTML = html;
  document.getElementById("stand-go").addEventListener("click", function () { openStand(); });
  document.getElementById("stand-slip").addEventListener("click", function () { openSlip(); });
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}


/* ---------- The flow ---------- */

function openStand() {
  const seed = Date.now();
  stand = {
    step: 0,
    feeling: null,
    action: null,
    verse: STAND_VERSES[Math.floor(seed / 60000) % STAND_VERSES.length],
    lines: pickLines(3, seed),
    timer: null,
    startedAt: nowIso()
  };
  document.getElementById("stand").classList.add("open");
  document.body.classList.add("stand-open");
  renderStandStep();
}

function pickLines(n, seed) {
  const start = Math.floor(seed / 1000) % STAND_LINES.length;
  const out = [];
  for (let i = 0; i < n; i++) out.push(STAND_LINES[(start + i * 5) % STAND_LINES.length]);
  return out;
}

function closeStand() {
  if (stand && stand.timer) { clearInterval(stand.timer); stand.timer = null; }
  stand = null;
  document.getElementById("stand").classList.remove("open");
  document.body.classList.remove("stand-open");
  if (typeof renderSection === "function") renderSection(currentSectionName);
}

function standProgress() {
  return '<div class="stand-progress">' + STAND_STEPS.map(function (s, i) {
    return '<span class="stand-dot' + (i <= stand.step ? " on" : "") + '"></span>';
  }).join("") + "</div>";
}

function standStepHtml() {
  const name = STAND_STEPS[stand.step];

  if (name === "breathe") {
    return '<div class="stand-step">' +
      '<p class="stand-kicker">Stop</p>' +
      '<h2 class="stand-title">Put the phone face down for ten seconds.</h2>' +
      '<div class="breath"><div class="breath-ring"></div><span class="breath-label" id="breath-label">Breathe in</span></div>' +
      '<p class="stand-sub" id="breath-count">10</p>' +
      '<div class="stand-foot"><button class="btn btn-ghost stand-skip" data-next>I am still here</button></div>' +
    "</div>";
  }

  if (name === "name") {
    const f = stand.feeling ? lookup(STAND_FEELINGS, stand.feeling) : null;
    return '<div class="stand-step">' +
      '<p class="stand-kicker">Name it</p>' +
      '<h2 class="stand-title">What are you actually feeling right now?</h2>' +
      '<div class="stand-choices">' + STAND_FEELINGS.map(function (x) {
        return '<button class="stand-choice' + (stand.feeling === x.value ? " on" : "") + '" data-feeling="' + x.value + '">' + escapeHtml(x.label) + "</button>";
      }).join("") + "</div>" +
      (f ? '<p class="stand-truth">' + escapeHtml(f.truth) + " This does not fix it. It just hands tomorrow's version of you the same feeling plus shame.</p>" : "") +
      '<div class="stand-foot"><button class="btn btn-primary" data-next' + (f ? "" : " disabled") + ">Next</button></div>" +
    "</div>";
  }

  if (name === "verse") {
    return '<div class="stand-step">' +
      '<p class="stand-kicker">The truth</p>' +
      '<blockquote class="stand-verse"><p>' + escapeHtml(stand.verse.text) + "</p><cite>" + escapeHtml(stand.verse.reference) + "</cite></blockquote>" +
      '<p class="stand-sub">Read it twice. Out loud if you can.</p>' +
      '<div class="stand-foot"><button class="btn btn-primary" data-next>I have read it</button></div>' +
    "</div>";
  }

  if (name === "stakes") {
    return '<div class="stand-step">' +
      '<p class="stand-kicker">On the line</p>' +
      '<h2 class="stand-title">This is what you would be trading.</h2>' +
      '<ul class="stand-stakes">' + standStakes().map(function (s, i) {
        return '<li style="animation-delay:' + (0.25 + i * 0.35) + 's">' + escapeHtml(s) + "</li>";
      }).join("") + "</ul>" +
      '<p class="stand-sub stand-late" style="animation-delay:' + (0.6 + standStakes().length * 0.35) + 's">For a few minutes you will regret in ten.</p>' +
      '<div class="stand-foot"><button class="btn btn-primary" data-next>Not tonight</button></div>' +
    "</div>";
  }

  if (name === "talk") {
    return '<div class="stand-step">' +
      '<p class="stand-kicker">Straight talk</p>' +
      '<div class="stand-lines">' + stand.lines.map(function (l, i) {
        return '<p style="animation-delay:' + (0.2 + i * 0.9) + 's">' + escapeHtml(l) + "</p>";
      }).join("") + "</div>" +
      '<div class="stand-foot"><button class="btn btn-primary" data-next>Understood</button></div>' +
    "</div>";
  }

  if (name === "act") {
    return '<div class="stand-step">' +
      '<p class="stand-kicker">Do this instead</p>' +
      '<h2 class="stand-title">Pick one. Then actually do it.</h2>' +
      '<div class="stand-choices stand-choices-tall">' + STAND_ACTIONS.map(function (a) {
        return '<button class="stand-choice' + (stand.action === a.value ? " on" : "") + '" data-action="' + a.value + '">' + escapeHtml(a.label) + "</button>";
      }).join("") + "</div>" +
      (stand.action === "pray"
        ? '<div class="breath small"><div class="breath-ring slow"></div><span class="breath-label" id="pray-count">60</span></div>'
        : "") +
      '<div class="stand-foot"><button class="btn btn-primary" data-next' + (stand.action ? "" : " disabled") + ">Done</button></div>" +
    "</div>";
  }

  if (name === "pray") {
    return '<div class="stand-step">' +
      '<p class="stand-kicker">Pray</p>' +
      '<p class="stand-prayer">' + escapeHtml(STAND_PRAYER) + "</p>" +
      '<div class="stand-foot"><button class="btn btn-primary" data-next>Amen</button></div>' +
    "</div>";
  }

  // done
  const month = standsThisMonth();
  const stood = standCount(month, "stood");
  return '<div class="stand-step stand-done">' +
    '<div class="stand-ring"><svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-draw" cx="60" cy="60" r="52"/><path class="ring-check" d="M38 62l15 15 30-34"/></svg></div>' +
    '<h2 class="stand-title stand-late" style="animation-delay:1.1s">You stood.</h2>' +
    '<p class="stand-sub stand-late" style="animation-delay:1.5s">God is not done with you. He is building the man He can trust with more.</p>' +
    '<p class="stand-count stand-late" style="animation-delay:1.9s">' + plural(stood, "time") + " this month.</p>" +
    '<blockquote class="stand-verse stand-late" style="animation-delay:2.3s"><p>' + escapeHtml(STAND_FINAL_VERSE.text) + "</p><cite>" + escapeHtml(STAND_FINAL_VERSE.reference) + "</cite></blockquote>" +
    '<div class="stand-foot stand-late" style="animation-delay:2.7s"><button class="btn btn-primary" data-close>Go to sleep</button></div>' +
  "</div>";
}

function renderStandStep() {
  const root = document.getElementById("stand");
  if (stand.timer) { clearInterval(stand.timer); stand.timer = null; }
  root.innerHTML =
    '<button class="icon-btn stand-close" id="stand-close" aria-label="Close">' + ICONS.close + "</button>" +
    standProgress() + standStepHtml();
  wireStandStep();
}

function wireStandStep() {
  const root = document.getElementById("stand");
  const name = STAND_STEPS[stand.step];

  root.querySelector("#stand-close").addEventListener("click", closeStand);
  root.querySelectorAll("[data-next]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (name === "pray") {
        create("stands", { date: dayKey(), at: stand.startedAt, feeling: stand.feeling, action: stand.action, outcome: "stood" });
      }
      stand.step++;
      renderStandStep();
    });
  });
  root.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", closeStand); });
  root.querySelectorAll("[data-feeling]").forEach(function (b) {
    b.addEventListener("click", function () { stand.feeling = b.dataset.feeling; renderStandStep(); });
  });
  root.querySelectorAll("[data-action]").forEach(function (b) {
    b.addEventListener("click", function () { stand.action = b.dataset.action; renderStandStep(); });
  });

  if (name === "breathe") {
    let left = 10;
    const count = root.querySelector("#breath-count");
    const label = root.querySelector("#breath-label");
    stand.timer = setInterval(function () {
      left--;
      if (count) count.textContent = String(Math.max(0, left));
      if (label) label.textContent = (Math.floor((10 - left) / 4) % 2 === 0) ? "Breathe in" : "Breathe out";
      if (left <= 0) {
        clearInterval(stand.timer); stand.timer = null;
        const btn = root.querySelector("[data-next]");
        if (btn) { btn.classList.remove("btn-ghost", "stand-skip"); btn.classList.add("btn-primary"); btn.textContent = "I am still here"; }
        if (label) label.textContent = "Good.";
      }
    }, 1000);
  }

  if (name === "act" && stand.action === "pray") {
    let left = 60;
    const count = root.querySelector("#pray-count");
    stand.timer = setInterval(function () {
      left--;
      if (count) count.textContent = String(Math.max(0, left));
      if (left <= 0) { clearInterval(stand.timer); stand.timer = null; if (count) count.textContent = "Amen"; }
    }, 1000);
  }
}


/* ---------- The slip path ---------- */

function openSlip() {
  const root = document.getElementById("stand");
  root.classList.add("open");
  document.body.classList.add("stand-open");
  stand = { step: 0, timer: null, slip: true };
  root.innerHTML =
    '<button class="icon-btn stand-close" id="stand-close" aria-label="Close">' + ICONS.close + "</button>" +
    '<div class="stand-step">' +
      '<p class="stand-kicker">Get back up</p>' +
      '<h2 class="stand-title">You are not disqualified.</h2>' +
      STAND_SLIP_VERSES.map(function (v, i) {
        return '<blockquote class="stand-verse stand-late" style="animation-delay:' + (0.3 + i * 0.6) + 's"><p>' + escapeHtml(v.text) + "</p><cite>" + escapeHtml(v.reference) + "</cite></blockquote>";
      }).join("") +
      '<p class="stand-sub stand-late" style="animation-delay:1.6s">Do not hide from Him. Say it plainly, right now. Then water, phone in another room, bed. Tomorrow\'s ticks are still yours, and so is the man you are becoming.</p>' +
      '<div class="stand-foot stand-late" style="animation-delay:2s"><button class="btn btn-primary" data-confessed>I have said it to Him</button></div>' +
    "</div>";
  root.querySelector("#stand-close").addEventListener("click", closeStand);
  root.querySelector("[data-confessed]").addEventListener("click", function () {
    create("stands", { date: dayKey(), at: nowIso(), feeling: null, action: null, outcome: "slipped" });
    closeStand();
    toast("Logged. Get some sleep.");
  });
}
