# Track

Njabulo's personal daily operating system: Today, Tasks, Pipeline, Content,
Exercise, Review, Settings. One user, one screen that says what to do next. Built
2026-10-08 around eight problems he listed (falling off DMs on mood, task
switching, content overwhelm, screen time, impulse purchases, an unread
notebook, forgotten blog posts, inconsistency). **Every feature maps to one of
those. A feature that does not is a feature to remove, not add to.**

Vanilla HTML/CSS/JS, no build step, no npm. Classic scripts in a fixed order
(not ES modules, must run on `file://`). Inline SVG icons, no emoji, no em or
en dashes in copy. Money is **USD** everywhere (`formatUSD` in `js/derive.js`).
The goal is $5,000 this period; his offers are local SEO at $1,000 to $1,500 a
month and web design at $1,000 to $3,000.

The sync engine is lifted from `My Projects/Projects/Agency CRM` (normalized
tables, outbox, soft deletes, last-write-wins trigger); read that project's
CLAUDE.md for the rationale. **The look is NOT the CRM's.** The first build
reused the CRM's tokens (bordered cards, two-layer shadows, Instrument Sans,
sticky blurred topbar) and Njabulo rejected it the same day: "way too similar
to the CRM", "looks like MyDay", "I told you to make it look like Todoist".

## The look: Todoist, in black and white

He sent a Todoist screenshot as the reference. Match it, not the CRM:

- White page. Sidebar is a soft warm off-white (`--sidebar`), 280px, with the
  user row at the top, then "Add task" with a filled plus circle, then the nav
  rows with a quiet count on the right (red badge only for follow-ups due).
- Big bold page title (26px) with a small grey line under it that starts with
  a check icon ("3 tasks", "3 of 14 posted this week"). Nothing sticky,
  nothing blurred.
- **No cards.** Sections are a bold 15px heading with a hairline under it.
  Rows are divided by hairlines. No borders around rows, no shadows anywhere
  except the modal and sheet.
- Task rows: 18px circle, title, a meta line under it (date in green for
  today, red for overdue), and the label ("Agency", "Inbox") at the bottom
  right. Date group headers read "Oct 8 · Today · Thursday".
- The add row is "+ Add task" at the bottom of the list and types inline.
- System font stack, same as Todoist. No Google Fonts link.
- Monochrome: black is the only accent. Green for a target hit, red for
  overdue. The Todoist orange is deliberately not used; he asked for black
  and white with a light/dark switch.
- Mobile: flat bottom bar with a hairline on top, not a floating pill.

If a screen starts growing boxes, shadows or stat tiles, it is drifting back
toward the CRM. Flatten it.

## The behaviour rules (why the app is shaped like this)

- **The day starts at 05:00** (`DAY_START_HOUR` in `js/config.js`). Before
  that, `dayKey()` returns yesterday. Every "today" in the app goes through
  `dayKey()`, never `new Date()` directly. `armDayWatcher()` re-renders at
  05:00:05 so a tab left open rolls over.
- **Stored vs derived.** Anything he taps is stored on the `days` row
  (`dms_sent`, `comm_minutes`, `god_first`, `exercise`, `screen_minutes`,
  check-in answers, `focus_log`) or on an `exercise_logs` row. Anything that is a fact about another record
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
- **Content is formats first, not ideas.** He will not be adding video ideas;
  he has the scripts. The page is the weekly mix from Settings
  (`settings.weekly_mix`, e.g. teach 6, proof 4, story 2, day in the life 2,
  fourteen a week at two a day), each format with its posted count for the
  week and ONE next step: the furthest-along unposted video of that format
  (Film / Edit / Post), or "Script" when the format has nothing in the
  pipeline. The scripts themselves are a collapsed list underneath.
  `nextContentAction()` picks the format furthest behind its target and
  feeds the Today card. "Log a post" creates a posted row so untracked posts
  still count. There is no idea stage and no idea cap.
- **Exercise is a list he defines.** `exercises` (name, target, unit) and
  `exercise_logs` (date, exercise_id, amount) keyed by `exLogId(date, id)`.
  Done for the day = every active exercise at target. The Exercise row on
  Today reads that; with no exercises set up it falls back to the plain
  `days.exercise` toggle.
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
| `js/tasks.js`, `content.js`, `exercise.js`, `pipeline.js`, `today.js`, `checkin.js`, `review.js`, `settings.js` | One file per page. Module-level state is prefixed with the page name (`tasksView`, `contentFilter`): one shared global scope, a bare `filter` in two files is a parse error that kills the app. |
| `js/boot.js` | PIN gate (hash compare), bootstrap, service worker, 05:00 watcher, splash. |
| `supabase/schema.sql` | Eight tables. Pair of `TABLES`; change both or writes fail with PGRST204. |
| `tools/serve.js` | `http://127.0.0.1:4178/` |
| `tools/seed.js` | Fake data relative to today. `--gate`, `--focus`. |
| `tools/shoot.js` | Puppeteer screenshots, six pages, three widths, both themes. `--gate --focus --checkin --empty`. |
| `tools/test.js` | 64 headless assertions: day boundary, quick-add parsing, stats on seed, star limit, stamping, focus, export/import, the gate and check-in flow, fresh install, `file://` boot. Run after any change to `derive.js`, `sync.js`, `checkin.js` or `today.js`. |

## Per-device vs synced

Per device (localStorage, never synced): `track_theme`, `track_pin_hash`
(`stableId("pin:" + digits)`, default is the hash of 0000), `track_sb_url`,
`track_sb_key`, the outbox keys, and the `track_<table>` caches.
`track_unlocked` is sessionStorage.

Synced (Supabase, once connected): all eight tables, including `settings`,
which is a singleton row with id `stableId("settings")`. `days` rows use
`stableId("day:" + date)` and `exercise_logs` use `stableId("ex:" + date + ":" + id)`
so both devices write the same row.

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
