/* ==========================================================
   1. CONFIG
   ========================================================== */
// Track: a personal daily operating system. One user, one screen that says
// what to do next. Vanilla JS, classic scripts, shared global scope.

// Set to false to skip the PIN gate while developing.
const LOCK_ENABLED = true;

// Per-device localStorage keys. None of these are synced.
const KEYS = {
  theme: "track_theme",         // "light" | "dark" | "system"
  pin: "track_pin_hash",        // stableId("pin:" + pin), default is the hash of 0000
  unlocked: "track_unlocked",   // sessionStorage, re-locks when the tab closes
  sbUrl: "track_sb_url",        // Supabase project URL, entered in Settings
  sbKey: "track_sb_key"         // Supabase publishable/anon key, entered in Settings
};

const DEFAULT_PIN = "0000";
const PIN_LENGTH = 4;

// The day rolls over at 05:00, not midnight. Closing the day at 00:30 still
// counts as closing "today".
const DAY_START_HOUR = 5;

// Created lazily by connectSupabase() in js/sync.js from the two localStorage
// values above. Null means localStorage-only mode, which is a complete app.
let sb = null;

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";

// Settings row defaults. Money is USD throughout. His offers: local SEO
// $1,000 to $1,500 a month, web design $1,000 to $3,000, so $1,500 is the
// fallback "one client" value until real won deals exist.
const SETTINGS_DEFAULTS = {
  target_dms: 30,
  target_videos: 2,
  target_comm: 75,
  screen_cap: 60,
  target_blogs: 5,
  goal_amount: 5000,
  goal_start: null,
  goal_end: null,
  focus_formats: [],
  default_deal_value: 1500
};


/* ---------- Shared vocabulary ----------
   Single source of truth for every dropdown, chip and pill. */

const TASK_AREAS = [
  { value: "",         label: "No area" },
  { value: "agency",   label: "Agency" },
  { value: "content",  label: "Content" },
  { value: "school",   label: "School" },
  { value: "personal", label: "Personal" }
];

const LEAD_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok",    label: "TikTok" },
  { value: "whatsapp",  label: "WhatsApp" },
  { value: "email",     label: "Email" },
  { value: "referral",  label: "Referral" },
  { value: "other",     label: "Other" }
];

const LEAD_SERVICES = [
  { value: "web",  label: "Web design" },
  { value: "seo",  label: "Local SEO" },
  { value: "both", label: "Web + SEO" },
  { value: "other", label: "Other" }
];

// A lead exists from the first reply. DMs sent are a daily counter, not rows.
const LEAD_STAGES = [
  { value: "replied",  label: "Replied",       tone: "neutral" },
  { value: "call",     label: "Call booked",   tone: "info" },
  { value: "proposal", label: "Proposal sent", tone: "warn" },
  { value: "won",      label: "Won",           tone: "good" },
  { value: "lost",     label: "Lost",          tone: "bad" }
];
const OPEN_STAGES = ["replied", "call", "proposal"];
// The date column stamped the first time a lead reaches each stage.
const STAGE_DATE = { replied: "replied_date", call: "call_date", proposal: "proposal_date", won: "won_date", lost: "lost_date" };

const CONTENT_STAGES = [
  { value: "idea",     label: "Idea",     tone: "muted" },
  { value: "scripted", label: "Scripted", tone: "info" },
  { value: "filmed",   label: "Filmed",   tone: "warn" },
  { value: "edited",   label: "Edited",   tone: "warn" },
  { value: "posted",   label: "Posted",   tone: "good" }
];
// What to do next with a video, derived from its stage. Never stored.
const NEXT_VERB  = { idea: "Script", scripted: "Film", filmed: "Edit", edited: "Post" };
const NEXT_STAGE = { idea: "scripted", scripted: "filmed", filmed: "edited", edited: "posted" };
// Stages that count as "started but not finished". Above CONTENT_QUEUE_CAP of
// these, idea capture goes soft-locked.
const QUEUE_STAGES = ["scripted", "filmed", "edited"];
const CONTENT_QUEUE_CAP = 10;

const CONTENT_FORMATS = [
  { value: "story",     label: "Story" },
  { value: "teach",     label: "Teach" },
  { value: "proof",     label: "Proof" },
  { value: "dayinlife", label: "Day in the life" },
  { value: "reaction",  label: "Reaction" },
  { value: "other",     label: "Other" }
];

const PARK_REASONS = [
  { value: "pulled",   label: "Another task pulled me" },
  { value: "blocked",  label: "Blocked, waiting on something" },
  { value: "interest", label: "Lost interest" },
  { value: "other",    label: "Other" }
];

const SKIP_REASONS = [
  { value: "notime",   label: "Ran out of time" },
  { value: "mood",     label: "Didn't feel like it" },
  { value: "notworth", label: "Decided it's not worth it" },
  { value: "other",    label: "Something else" }
];

const SCREEN_CHIPS = [30, 45, 60, 90, 120];

const HOLD_STATUSES = [
  { value: "holding", label: "On hold", tone: "info" },
  { value: "bought",  label: "Bought",  tone: "good" },
  { value: "dropped", label: "Dropped", tone: "muted" }
];
const HOLD_DAYS = 30;

const TOP_LIMIT = 3;


/* ---------- Icons ----------
   Inline SVG, stroke-based (Lucide geometry), sized by the CSS around them.
   No emoji anywhere in this app. */

function svg(paths, sw) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.75) +
         '" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
}

const ICONS = {
  today:    svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  tasks:    svg('<path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><path d="M13 7h8M13 17h8"/>'),
  pipeline: svg('<path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>'),
  content:  svg('<path d="m10 8 6 4-6 4V8Z"/><rect x="2" y="4" width="20" height="16" rx="2.5"/>'),
  review:   svg('<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'),
  settings: svg('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>'),

  plus:     svg('<path d="M12 5v14M5 12h14"/>', 2),
  minus:    svg('<path d="M5 12h14"/>', 2),
  check:    svg('<path d="m4 12 5 5L20 6"/>', 2.5),
  close:    svg('<path d="M18 6 6 18M6 6l12 12"/>', 2),
  edit:     svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  trash:    svg('<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  alert:    svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.01"/>'),
  clock:    svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  link:     svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  external: svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  chevronLeft:  svg('<path d="m15 18-6-6 6-6"/>', 2),
  chevronRight: svg('<path d="m9 18 6-6-6-6"/>', 2),
  arrowRight:   svg('<path d="M5 12h14M12 5l7 7-7 7"/>', 2),
  delete:   svg('<path d="M20 5H9l-6 7 6 7h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="m16 9-5 6M11 9l5 6"/>'),
  play:     svg('<path d="m6 4 14 8-14 8V4Z"/>'),
  flag:     svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
  star:     svg('<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z"/>'),
  starFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z"/></svg>',
  calendar: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  moon:     svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'),
  book:     svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  hand:     svg('<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'),
  lock:     svg('<rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  message:  svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  mic:      svg('<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>'),
  activity: svg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
  phone:    svg('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>'),
  video:    svg('<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
  flame:    svg('<path d="M12 22c4.4 0 7-2.9 7-7 0-3-2-5.5-3.5-7-.5 2-1.5 3-2.5 3.5 0-3-1.5-6.5-4-8.5 0 3-1 5-2.5 6.5S4 12.5 4 15c0 4.1 3.6 7 8 7Z"/>'),
  download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'),
  upload:   svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>'),
  cloud:    svg('<path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A7 7 0 0 0 4.3 12.3 3.5 3.5 0 0 0 6 19h11.5Z"/>'),
  inbox:    svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-7A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1Z"/>'),
  zap:      svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>')
};
