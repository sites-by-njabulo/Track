/* ==========================================================
   17. PIN GATE
   ========================================================== */
// Tap-only keypad, no text input, so the on-screen keyboard never appears.
// sessionStorage: re-locks when the tab or browser closes.
//
// A casual deterrent, not real security. The PIN is stored as stableId() of
// the digits, which is not a cryptographic hash. It keeps the digits out of
// plain view in localStorage, nothing more.

const lockView = document.getElementById("lock-view");
const lockCard = document.getElementById("lock-card");
const appView = document.getElementById("app-view");
const pinDotsEl = document.getElementById("pin-dots");
const pinKeypad = document.getElementById("pin-keypad");
const pinDotEls = Array.prototype.slice.call(document.querySelectorAll(".pin-dot"));

let enteredPin = "";
let pinValidating = false;
let appReady = false;

function pinHash(pin) { return stableId("pin:" + pin); }
function storedPinHash() {
  try { return localStorage.getItem(KEYS.pin) || pinHash(DEFAULT_PIN); } catch (e) { return pinHash(DEFAULT_PIN); }
}
function pinIsDefault() { return storedPinHash() === pinHash(DEFAULT_PIN); }

function isUnlocked() {
  return sessionStorage.getItem(KEYS.unlocked) === "true";
}

function updatePinDots() {
  pinDotEls.forEach(function (dot, i) {
    dot.classList.toggle("filled", i < enteredPin.length);
  });
}

function rejectPin() {
  pinValidating = true;
  pinDotsEl.classList.remove("pin-shake");
  requestAnimationFrame(function () { pinDotsEl.classList.add("pin-shake"); });
  setTimeout(function () {
    pinDotsEl.classList.remove("pin-shake");
    enteredPin = "";
    updatePinDots();
    pinValidating = false;
  }, 400);
}

function handlePinDigit(digit) {
  if (pinValidating || enteredPin.length >= PIN_LENGTH) return;
  enteredPin += digit;
  updatePinDots();
  if (enteredPin.length === PIN_LENGTH) {
    pinValidating = true;
    setTimeout(function () {
      if (pinHash(enteredPin) === storedPinHash()) unlockApp();
      else { pinValidating = false; rejectPin(); }
    }, 150);
  }
}

function handlePinDelete() {
  if (pinValidating) return;
  enteredPin = enteredPin.slice(0, -1);
  updatePinDots();
}

pinKeypad.addEventListener("click", function (e) {
  if (e.target.closest("#pin-delete")) { handlePinDelete(); return; }
  const key = e.target.closest(".pin-key[data-key]");
  if (key) handlePinDigit(key.dataset.key);
});

document.addEventListener("keydown", function (e) {
  if (lockView.classList.contains("hidden")) return;
  if (/^[0-9]$/.test(e.key)) handlePinDigit(e.key);
  else if (e.key === "Backspace") handlePinDelete();
});

function showLock() {
  lockView.classList.remove("hidden");
}

function unlockApp() {
  sessionStorage.setItem(KEYS.unlocked, "true");
  lockCard.classList.add("unlock-success");
  setTimeout(enterApp, 380);
}


/* ==========================================================
   18. BOOTSTRAP
   ========================================================== */

async function enterApp() {
  // Usable from localStorage already; waiting on Supabase is capped.
  await Promise.race([
    initialSync,
    new Promise(function (resolve) { setTimeout(resolve, 2500); })
  ]);

  lockView.classList.add("hidden");
  appView.classList.remove("hidden");

  buildNav();
  wireNav();
  wireTheme();
  wireModal();
  wireConfirm();
  wireSheet();
  renderSyncStatus();
  seedDefaultGoal();
  appReady = true;
  showSection("today");

  registerServiceWorker();
  armDayWatcher();
}

// The $5,000 goal exists from the first open. Once, ever: deleting it later
// must not bring it back.
function seedDefaultGoal() {
  try {
    if (localStorage.getItem("track_goal_seeded")) return;
    if (!db.goals.length) create("goals", { title: DEFAULT_GOAL.title, amount: DEFAULT_GOAL.amount, deadline: lastOfMonth(dayKey()) });
    localStorage.setItem("track_goal_seeded", "1");
  } catch (e) {}
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "127.0.0.1" && location.hostname !== "localhost") return;
  navigator.serviceWorker.register("sw.js").then(function (reg) {
    reg.update();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") reg.update();
    });
  }).catch(function (err) {
    console.warn("Service worker registration failed.", err);
  });
}

// Re-render when the app day rolls over at 05:00, so a tab left open overnight
// shows the new day instead of yesterday's counters.
function armDayWatcher() {
  const now = new Date();
  let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), DAY_START_HOUR, 0, 5);
  if (next <= now) next.setDate(next.getDate() + 1);
  setTimeout(function () {
    renderSection(currentSectionName);
    armDayWatcher();
  }, next - now);
}

/* ---- Splash ---- */
const splashView = document.getElementById("splash-view");

function runSplash() {
  setTimeout(function () {
    splashView.classList.add("fade-out");
    setTimeout(function () {
      splashView.classList.add("hidden");
      if (!LOCK_ENABLED || isUnlocked()) enterApp();
      else showLock();
    }, 450);
  }, 900);
}

runSplash();
