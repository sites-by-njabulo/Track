# Track

Njabulo's personal daily operating system: Today, Tasks, Pipeline, Content,
Review, Settings. One user, one screen that says what to do next. Built
2026-10-08 around eight problems he listed (falling off DMs on mood, task
switching, content overwhelm, screen time, impulse purchases, an unread
notebook, forgotten blog posts, inconsistency). **Every feature maps to one of
those. A feature that does not is a feature to remove, not add to.**

Vanilla HTML/CSS/JS, no build step, no npm. Classic scripts in a fixed order
(not ES modules, must run on `file://`). Inline SVG icons, no emoji, no em or
en dashes in copy. Money is **USD** everywhere (`formatUSD` in `js/derive.js`).
The goal is $5,000 this period; his offers are local SEO at $1,000 to $1,500 a
month and web design at $1,000 to $3,000.

Architecture is lifted from `My Projects/Projects/Agency CRM`: same tokens,
same shell, same sync engine (normalized tables, outbox, soft deletes,
last-write-wins trigger). Read that project's CLAUDE.md for the sync design
rationale; this file covers what is different.

## The behaviour rules (why the app is shaped like this)

- **The day starts at 05:00** (`DAY_START_HOUR` in `js/config.js`). Before
  that, `dayKey()` returns yesterday. Every "today" in the app goes through
  `dayKey()`, never `new Date()` directly. `armDayWatcher()` re-renders at
  05:00:05 so a tab left open rolls over.
- **Stored vs derived.** Anything he taps is stored on the `days` row
  (`dms_sent`, `comm_minutes`, `god_first`, `exercise`, `screen_minutes`,
  check-in answers, `focus_log`). Anything that is a fact about another record
  is derived at render: videos posted today = `content.posted_date`, blogs this
  week = `content.blog_date`, parks = `focus_log`, Top 3 = `tasks.top_date`,
  money = `leads.won_date`. Nothing stores its own total. Do not add a counter
  for something that already has a date column.
- **DMs are a counter, leads are rows.** A lead exists from the first reply.
  Reply rate = leads with `replied_date` in the window over DMs sent in the
  window. The sentence under the DM counter (`dmMathLine`) is the mechanism
  against problem 1: the numbers sit where the decision gets made, all day,
  and again in the check-in beside the skip reason.
- **Stage dates are stamped, not inferred.** `stampStage()` in
  `js/pipeline.js` sets `*_date` the first time a lead reaches a stage.
  `setContentStage()` in `js/content.js` sets or clears `posted_date`. Every
  write that changes a stage must go through those two functions.
- **One thing in focus.** `days.focus_task_id` + `focus_started_at`. Only one
  active focus across all day rows (`activeFocus()` scans them all so a 05:00
  rollover never strands it). Starting another task while one is active forces
  Park with a reason. The timer updates one text node every second and never
  re-renders the page.
- **Top 3 is three.** `toggleTop()` refuses the fourth star. The check-in's
  last step writes `top_date = day + 1`, so the morning opens decided.
- **The yesterday gate.** `gateDayKey()` returns yesterday if some day row
  exists before today and yesterday is not `checkin_done`. While gated, Today
  shows the inverted gate card and starring is blocked; counters still work.
  Only ever one day, never a backfill. A fresh install (no prior day row) is
  never gated.
- **Check-in asks for two things.** A skip reason (only when DMs are under
  target) and yes or no to "1% better". Everything else is a tap or optional.
  If it takes more than thirty seconds it will not happen nightly.
- **Content cap is soft.** Over `CONTENT_QUEUE_CAP` (10) started-but-not-posted
  videos, the add button turns into "Add anyway (N waiting)" and a notice
  explains why. It never blocks.
- **Holds block nothing.** They show the maths: days until the decision date,
  clients needed at the average won value, and how far the goal still is.

## Files

| File | Role |
|---|---|
| `index.html` | Shell only: splash, PIN gate, sidebar, six empty `<section class="page">`, mobile nav + More sheet, modal, sheet, confirm, toast. Head script applies the theme before paint. |
| `styles.css` | Tokens first (identical to Agency CRM), mobile-first, desktop sidebar at 769px, tables replace cards at 900px. Today, Tasks and Settings use `.col` (760px reading column). |
| `js/config.js` | Keys, defaults, every vocabulary list, `ICONS`. |
| `js/verses.js` | 30 verses, same list as MyDay. |
| `js/sync.js` | `TABLES` registry, localStorage-first db, outbox, `applyRemote`, `pullAll`, realtime, lazy `connectSupabase()`, `dayGet`/`dayRow`/`bumpDay`, `S()`/`saveSettings`, export/import. |
| `js/derive.js` | Dates (5AM boundary), money, every derived number. Pure functions over `db.*`. |
| `js/ui.js` | Router, nav, theme (light/dark/system), modal, sheet, confirm, toast, `pageHeader`. |
| `js/tasks.js`, `content.js`, `pipeline.js`, `today.js`, `checkin.js`, `review.js`, `settings.js` | One file per page. Module-level state is prefixed with the page name (`tasksView`, `contentFilter`): one shared global scope, a bare `filter` in two files is a parse error that kills the app. |
| `js/boot.js` | PIN gate (hash compare), bootstrap, service worker, 05:00 watcher, splash. |
| `supabase/schema.sql` | Six tables. Pair of `TABLES`; change both or writes fail with PGRST204. |
| `tools/serve.js` | `http://127.0.0.1:4178/` |
| `tools/seed.js` | Fake data relative to today. `--gate`, `--focus`. |
| `tools/shoot.js` | Puppeteer screenshots, six pages, three widths, both themes. `--gate --focus --checkin --empty`. |
| `tools/test.js` | 57 headless assertions: day boundary, quick-add parsing, stats on seed, star limit, stamping, focus, export/import, the gate and check-in flow, fresh install, `file://` boot. Run after any change to `derive.js`, `sync.js`, `checkin.js` or `today.js`. |

## Per-device vs synced

Per device (localStorage, never synced): `track_theme`, `track_pin_hash`
(`stableId("pin:" + digits)`, default is the hash of 0000), `track_sb_url`,
`track_sb_key`, the outbox keys, and the `track_<table>` caches.
`track_unlocked` is sessionStorage.

Synced (Supabase, once connected): all six tables, including `settings`,
which is a singleton row with id `stableId("settings")`. `days` rows use
`stableId("day:" + date)` so both devices write the same row.

**The Supabase URL and key are typed into Settings, not stored in source.**
That is why the GitHub repo can be public (GitHub Pages on a free account
needs that). Until he pastes them on a device, that device runs local-only and
the sidebar reads "Local only".

## Deploy

GitHub Pages from `main`, root. Remote
`https://github.com/sites-by-njabulo/Track.git`. The service worker is
network-first so a push is live on next open without bumping `CACHE_NAME`.
`.nojekyll` is there so nothing is ignored.

## Verify

```
node tools/serve.js
node tools/test.js
node tools/shoot.js            # screenshots/{light,dark}/{390,768,1280}/*.png
node tools/shoot.js --gate --checkin --widths 390
```

The harness ignores network failures and the manifest CORS message on
`file://`; anything else in the console is a bug.

## Known limits

- PIN and publishable key are a casual deterrent, same trust model as the CRM.
- Screen time is typed in, not read from the phone.
- The focus timer only runs while the Today page is open; the elapsed time is
  computed from `focus_started_at`, so leaving and returning is accurate.
- No undo. Deletes are soft in the database but there is no button.
