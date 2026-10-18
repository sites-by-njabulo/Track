/* ==========================================================
   10d. STAND
   ========================================================== */
// For the moment the urge hits. One tap opens a dark, full-screen flow, one
// thing per screen. Built on what holds up in the research and in the apps
// made for this:
//   - an urge peaks and passes in roughly five to twenty minutes if it is
//     not acted on, so the flow can ride it out (physiological sighs, a
//     three-minute wave timer), not just distract for ten seconds;
//   - HALT: hungry, angry, lonely, tired are the usual fuel, so name it;
//   - an if-then plan decided in daylight beats willpower at 11pm
//     (implementation intentions, Gollwitzer);
//   - the abstinence violation effect: shame after a lapse is what turns one
//     lapse into a relapse, so the slip path reframes it as one event;
//   - reaching a real person works better than any screen, so an ally can be
//     one tap away on WhatsApp;
//   - looking at your own face raises self-awareness and interrupts the
//     autopilot (objective self-awareness), so there is an optional camera
//     step.
// Every stand is logged so Review can show the count. Tone: written to a
// 17-year-old Christian who asked for it. Hard, direct, never shaming. God
// is building him, not punishing him.

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
  "You are not tired. You are tempted. Those feel the same and they are not the same.",
  "Weak men negotiate with the urge. Strong men do not pick up the call.",
  "Ten minutes of nothing, then days of shame. That is the trade on the table. Only a fool takes it twice.",
  "The version of you that gets the clients, the wife, the respect, is on the other side of this exact moment. Won repeatedly. Starting now.",
  "You have already proven you can lose to this. Boring. Prove something new.",
  "Hard now, proud later. Easy now, ashamed in an hour. You already know which one you will feel.",
  "God is developing you, not punishing you. Development is just repetitions of this moment, won.",
  "Men talk about discipline in public. Discipline is decided alone, with nobody watching except God.",
  "Put the phone down and leave the room like a man who has somewhere to be. Because you do.",
  "This feeling has a shelf life of about fifteen minutes. The regret does not. Outlast the fifteen.",
  "You are not fighting the urge. You are letting it pass through a room it does not own."
];

// HALT plus the two he named. Each has a one-line truth.
const STAND_FEELINGS = [
  { value: "tired",    label: "Tired",          truth: "Tired men make bad trades. Going to sleep is the win here." },
  { value: "lonely",   label: "Lonely",         truth: "Lonely gets fixed by people and by God. A screen makes it worse by morning." },
  { value: "stressed", label: "Stressed",       truth: "Stress wants a release. Push-ups give it. This gives shame plus the same stress tomorrow." },
  { value: "bored",    label: "Bored",          truth: "Boredom is a signal to build something, not to consume something." },
  { value: "angry",    label: "Angry",          truth: "Anger wants to punish someone. This punishes you. Walk it off instead." },
  { value: "hungry",   label: "Hungry",         truth: "Low fuel, low judgment. Eat something real and the urge shrinks with it." },
  { value: "habit",    label: "It is just this hour", truth: "Then the fix is the hour. Notice when it comes, and be somewhere else, with people, at that hour." },
  { value: "other",    label: "Something else", truth: "Whatever it is, it is real, and it deserves better than this." }
];

const STAND_DEFAULT_STAKES = [
  "Your future wife, and the man she is praying to meet.",
  "Your kids, and a father who can look them in the eye.",
  "The $5,000 goal, and every client behind it.",
  "The people you are meant to help, who are waiting for a version of you that shows up.",
  "Waking up tomorrow and feeling good about yesterday.",
  "Your peace with God, and the blessing you keep asking Him for.",
  "Your self-respect, which you cannot buy back in the morning."
];

const STAND_DEFAULT_PLAN = "If the urge comes, then I leave the room immediately, phone left behind, and I walk until it passes.";

// Flee, do not fight. Every option gets him out of the room. (2 Timothy 2:22)
const STAND_ACTIONS = [
  { value: "plan",  label: "Do your plan" },
  { value: "walk",  label: "Leave the room. Walk for three minutes." },
  { value: "water", label: "Cold water on the face, then out of the room" },
  { value: "pray",  label: "Pray for 60 seconds, out loud, somewhere else" },
  { value: "ally",  label: "Message your ally" }
];

const STAND_PRAYER = "Father, I feel this pull and I am bringing it to You instead of hiding it. You see me and You are not disgusted. Keep my eyes. Keep my heart. Make me the man You can trust with more. I choose You tonight. Amen.";
const STAND_ALLY_MESSAGE = "Hey, having a hard moment right now. Can you pray for me and check on me later?";

const STAND_STEPS = ["breathe", "name", "verse", "stakes", "talk", "mirror", "act", "pray", "done"];
const BREATH_SECONDS = 24;   // three physiological sighs of eight seconds, not skippable
const WAVE_SECONDS = 180;

let stand = null;          // { step, feeling, action, verse, lines, timer, stream }

function standStakes() {
  const custom = String(S().stand_list || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  return custom.length ? custom : STAND_DEFAULT_STAKES;
}
function standPlan() { return String(S().stand_plan || "").trim() || STAND_DEFAULT_PLAN; }
function standAlly() {
  const n = String(S().stand_ally || "").replace(/[^\d]/g, "");
  return n.length >= 8 ? { number: n, name: String(S().stand_ally_name || "").trim() || "your ally" } : null;
}
function standAllyUrl() {
  const a = standAlly();
  return a ? "https://wa.me/" + a.number + "?text=" + encodeURIComponent(STAND_ALLY_MESSAGE) : "";
}
function standsIn(n) {
  const keys = windowKeys(n);
  return db.stands.filter(function (s) { return inRange(s.date, keys[0], keys[keys.length - 1]); });
}
function standsThisMonth() {
  const t = dayKey();
  return db.stands.filter(function (s) { return inRange(s.date, t.slice(0, 7) + "-01", t); });
}
function standCount(list, outcome) { return list.filter(function (s) { return s.outcome === outcome; }).length; }
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}


/* ---------- The page ---------- */

function renderStand() {
  const ally = standAlly();

  const html =
    pageHeader("Stand", "Stand firm in the faith. 1 Corinthians 16:13") +
    '<div class="col">' +
      '<section class="stand-hero">' +
        '<p class="stand-hero-text">When the urge hits, open this. Do not think, do not argue with it, just press the button and follow the screens. About four minutes, any time of day. The urge itself only lasts a few more than that if you do not feed it.</p>' +
        '<button class="btn btn-primary stand-go" id="stand-go">' + ICONS.shield + "<span>I feel the urge</span></button>" +
        '<button class="link-btn stand-slip-link" id="stand-slip">I already gave in</button>' +
      "</section>" +
      '<section class="panel"><div class="panel-head"><h2>Your plan</h2><button class="link-btn" data-goto="settings">Edit</button></div>' +
        '<p class="stand-plan-text">' + escapeHtml(standPlan()) + "</p>" +
        '<p class="panel-note">Decided in daylight so there is nothing to decide at night. ' +
          (ally ? "Your ally is " + escapeHtml(ally.name) + ", one tap away inside the flow." : "Add an ally in Settings: a number on WhatsApp you can message in one tap from inside the flow.") + "</p>" +
      "</section>" +
    "</div>";

  document.getElementById("page-stand").innerHTML = html;
  document.getElementById("stand-go").addEventListener("click", function () { openStand(); });
  document.getElementById("stand-slip").addEventListener("click", function () { openSlip(); });
  document.querySelectorAll("#page-stand [data-goto]").forEach(function (b) {
    b.addEventListener("click", function () { showSection(b.dataset.goto); });
  });
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
    stream: null,
    startedAt: nowIso()
  };
  document.getElementById("stand").classList.add("open");
  document.body.classList.add("stand-open");
  renderStandStep();
}

function pickLines(n, seed) {
  const start = Math.floor(seed / 1000) % STAND_LINES.length;
  const out = [];
  for (let i = 0; i < n; i++) out.push(STAND_LINES[(start + i * 7) % STAND_LINES.length]);
  return out;
}

function stopStandMedia() {
  if (!stand) return;
  if (stand.timer) { clearInterval(stand.timer); stand.timer = null; }
  if (stand.stream) {
    try { stand.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    stand.stream = null;
  }
}

function closeStand() {
  stopStandMedia();
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
      '<h2 class="stand-title">Put the phone face down. Three slow breaths.</h2>' +
      '<p class="stand-sub">In through the nose, a second small sip in, then a long breath out through the mouth. The fastest known way to bring the body down.</p>' +
      '<div class="breath"><div class="breath-ring"></div><span class="breath-label" id="breath-label">Breathe in</span></div>' +
      '<p class="stand-sub" id="breath-count">' + BREATH_SECONDS + "</p>" +
      '<div class="stand-foot" id="breath-foot"></div>' +
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
      (f ? '<p class="stand-truth">' + escapeHtml(f.truth) + " This does not fix it. It hands tomorrow's version of you the same feeling plus shame.</p>" : "") +
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
    const stakes = standStakes();
    return '<div class="stand-step">' +
      '<p class="stand-kicker">On the line</p>' +
      '<h2 class="stand-title">This is what you would be trading.</h2>' +
      '<ul class="stand-stakes">' + stakes.map(function (s, i) {
        return '<li style="animation-delay:' + (0.25 + i * 0.35) + 's">' + escapeHtml(s) + "</li>";
      }).join("") + "</ul>" +
      '<p class="stand-sub stand-late" style="animation-delay:' + (0.6 + stakes.length * 0.35) + 's">For a few minutes you will regret in ten.</p>' +
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

  if (name === "mirror") {
    return '<div class="stand-step">' +
      '<p class="stand-kicker">Look</p>' +
      '<h2 class="stand-title">Look yourself in the eye.</h2>' +
      '<p class="stand-sub">This is the man making the decision. Not the urge. Him.</p>' +
      '<div class="stand-mirror" id="stand-mirror">' +
        '<video id="stand-video" autoplay playsinline muted></video>' +
        '<button class="btn btn-ghost" id="stand-camera">Show me my face</button>' +
      "</div>" +
      '<div class="stand-foot"><button class="btn btn-primary" data-next>I see him</button></div>' +
    "</div>";
  }

  if (name === "act") {
    const ally = standAlly();
    const options = STAND_ACTIONS.filter(function (a) { return a.value !== "ally" || ally; });
    return '<div class="stand-step">' +
      '<p class="stand-kicker">Do this instead</p>' +
      '<h2 class="stand-title">Pick one. Then actually do it.</h2>' +
      '<div class="stand-choices stand-choices-tall">' + options.map(function (a) {
        const label = a.value === "plan" ? standPlan() : a.value === "ally" ? "Message " + ally.name + " on WhatsApp" : a.label;
        return '<button class="stand-choice' + (stand.action === a.value ? " on" : "") + (a.value === "plan" ? " stand-choice-plan" : "") + '" data-action="' + a.value + '">' + escapeHtml(label) + "</button>";
      }).join("") + "</div>" +
      (stand.action === "pray"
        ? '<div class="breath small"><div class="breath-ring slow"></div><span class="breath-label" id="pray-count">60</span></div>'
        : "") +
      (stand.action === "walk"
        ? '<div class="wave-box"><p class="stand-sub" id="wave-text">Get up and go. It is rising. That is what it does. Keep walking.</p>' +
            '<div class="wave"><div class="wave-fill" id="wave-fill"></div></div>' +
            '<p class="stand-sub wave-count" id="wave-count">3:00</p></div>'
        : "") +
      (stand.action === "ally"
        ? '<a class="btn btn-primary stand-ally-link" href="' + escapeHtml(standAllyUrl()) + '" target="_blank" rel="noopener">Open WhatsApp</a>'
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
  const stood = standCount(standsThisMonth(), "stood");
  return '<div class="stand-step stand-done">' +
    '<div class="stand-ring"><svg viewBox="0 0 120 120"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-draw" cx="60" cy="60" r="52"/><path class="ring-check" d="M38 62l15 15 30-34"/></svg></div>' +
    '<h2 class="stand-title stand-late" style="animation-delay:1.1s">You stood.</h2>' +
    '<p class="stand-sub stand-late" style="animation-delay:1.5s">God is not done with you. He is building the man He can trust with more.</p>' +
    '<p class="stand-count stand-late" style="animation-delay:1.9s">' + plural(stood, "time") + " this month.</p>" +
    '<blockquote class="stand-verse stand-late" style="animation-delay:2.3s"><p>' + escapeHtml(STAND_FINAL_VERSE.text) + "</p><cite>" + escapeHtml(STAND_FINAL_VERSE.reference) + "</cite></blockquote>" +
    '<p class="stand-sub stand-late" style="animation-delay:2.7s">Last step: stay out of that room for a while. The urge lives where it found you.</p>' +
    '<div class="stand-foot stand-late" style="animation-delay:3s"><button class="btn btn-primary" data-close>Back to the day</button></div>' +
  "</div>";
}

function renderStandStep() {
  const root = document.getElementById("stand");
  stopStandMedia();
  root.innerHTML =
    '<button class="icon-btn stand-close" id="stand-close" aria-label="Close">' + ICONS.close + "</button>" +
    standProgress() + standStepHtml();
  root.scrollTop = 0;
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
    // Three physiological sighs: in for 3, sip for 1, out for 4.
    let left = BREATH_SECONDS;
    const count = root.querySelector("#breath-count");
    const label = root.querySelector("#breath-label");
    const phase = function (elapsed) {
      const p = elapsed % 8;
      return p < 3 ? "Breathe in" : p < 4 ? "One more sip" : "Long breath out";
    };
    stand.timer = setInterval(function () {
      left--;
      if (count) count.textContent = String(Math.max(0, left));
      if (label) label.textContent = phase(BREATH_SECONDS - left);
      if (left <= 0) {
        clearInterval(stand.timer); stand.timer = null;
        if (label) label.textContent = "Good.";
        const foot = root.querySelector("#breath-foot");
        if (foot) {
          foot.innerHTML = '<button class="btn btn-primary stand-late" data-next>Next</button>';
          foot.querySelector("[data-next]").addEventListener("click", function () { stand.step++; renderStandStep(); });
        }
      }
    }, 1000);
  }

  if (name === "mirror") {
    const btn = root.querySelector("#stand-camera");
    const video = root.querySelector("#stand-video");
    btn.addEventListener("click", function () {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { btn.textContent = "No camera here. Find a mirror."; return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }).then(function (stream) {
        if (!stand) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        stand.stream = stream;
        video.srcObject = stream;
        root.querySelector("#stand-mirror").classList.add("live");
      }).catch(function () { btn.textContent = "No camera. Find a mirror, then come back."; });
    });
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

  if (name === "act" && stand.action === "walk") {
    // The wave rises for the first third, holds, then falls. The text says
    // what is happening so he can watch it instead of obeying it.
    let left = WAVE_SECONDS;
    const fill = root.querySelector("#wave-fill");
    const count = root.querySelector("#wave-count");
    const text = root.querySelector("#wave-text");
    const paint = function () {
      const elapsed = WAVE_SECONDS - left;
      const x = elapsed / WAVE_SECONDS;
      const h = x < 0.35 ? 20 + (x / 0.35) * 70 : x < 0.5 ? 90 : 90 - ((x - 0.5) / 0.5) * 80;
      if (fill) fill.style.height = Math.round(h) + "%";
      if (count) count.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
      if (text) text.textContent = x < 0.35 ? "Keep walking. It is rising. That is what it does." : x < 0.5 ? "This is the peak. It feels like it will last. It will not." : x < 0.85 ? "It is passing. You did not feed it, so it is leaving." : "Almost gone. You outlasted it. Stay out of that room a while.";
    };
    paint();
    stand.timer = setInterval(function () {
      left--;
      paint();
      if (left <= 0) { clearInterval(stand.timer); stand.timer = null; if (text) text.textContent = "Gone. That is the whole trick. Do not go back in yet."; }
    }, 1000);
  }
}


/* ---------- The slip path ---------- */
// One lapse is one event. The research is clear that the shame spiral after
// a lapse is what produces the next one, so this path is short, honest and
// forward-facing: confess, learn one thing, sleep.

let slip = null;

function openSlip() {
  slip = { feeling: null };
  const root = document.getElementById("stand");
  root.classList.add("open");
  document.body.classList.add("stand-open");
  stand = { step: 0, timer: null, stream: null, slip: true };
  renderSlip();
}

function renderSlip() {
  const root = document.getElementById("stand");
  root.innerHTML =
    '<button class="icon-btn stand-close" id="stand-close" aria-label="Close">' + ICONS.close + "</button>" +
    '<div class="stand-step">' +
      '<p class="stand-kicker">Get back up</p>' +
      '<h2 class="stand-title">You are not disqualified.</h2>' +
      '<p class="stand-sub">One lapse is one event. It is not a verdict on who you are, and the only thing that turns it into a pattern is hiding from it. So do not hide.</p>' +
      STAND_SLIP_VERSES.map(function (v, i) {
        return '<blockquote class="stand-verse small stand-late" style="animation-delay:' + (0.3 + i * 0.5) + 's"><p>' + escapeHtml(v.text) + "</p><cite>" + escapeHtml(v.reference) + "</cite></blockquote>";
      }).join("") +
      '<p class="stand-sub stand-late" style="animation-delay:1.3s">One thing to learn, so tomorrow is different. What was going on right before?</p>' +
      '<div class="stand-choices stand-late" style="animation-delay:1.5s">' + STAND_FEELINGS.map(function (x) {
        return '<button class="stand-choice' + (slip.feeling === x.value ? " on" : "") + '" data-feeling="' + x.value + '">' + escapeHtml(x.label) + "</button>";
      }).join("") + "</div>" +
      '<p class="stand-sub stand-late" style="animation-delay:1.7s">Say it to God plainly, right now. Then water, out of the room, back to the day. The next hour is still yours, and so is the man you are becoming.</p>' +
      '<div class="stand-foot stand-late" style="animation-delay:1.9s"><button class="btn btn-primary" data-confessed>I have said it to Him</button></div>' +
    "</div>";
  root.querySelector("#stand-close").addEventListener("click", closeStand);
  root.querySelectorAll("[data-feeling]").forEach(function (b) {
    b.addEventListener("click", function () { slip.feeling = b.dataset.feeling; renderSlip(); });
  });
  root.querySelector("[data-confessed]").addEventListener("click", function () {
    create("stands", { date: dayKey(), at: nowIso(), feeling: slip.feeling, action: null, outcome: "slipped" });
    slip = null;
    closeStand();
    toast("Logged. Back to the day.");
  });
}
