# Track

Njabulo's personal daily operating system: Today, Tasks, Content, Exercise,
Review, Settings. Built 2026-10-08, cut down the same day on his instruction:
**"I want to keep things as simple as I possibly can."** Every time a screen
grows, re-read that line.

Vanilla HTML/CSS/JS, no build step, no npm. Classic scripts in a fixed order
(not ES modules, must run on `file://`). Inline SVG icons, no emoji, no em or
en dashes in copy. Money is **USD** (`formatUSD` in `js/derive.js`). His goal
is $5,000 this period.

The sync engine is lifted from `My Projects/Projects/Agency CRM` (normalized
tables, outbox, soft deletes, last-write-wins trigger); read that project's
CLAUDE.md for the rationale. **The look is NOT the CRM's**, see below.

## What was removed, and must not come back

The first build had a Pipeline page (leads, reply rates, DMs-per-client
maths), a "Now" focus block with a timer and park reasons, a Top 3 with a
star limit, counters with +1/+5 steppers, per-exercise rep counters, an idea
list with a queue cap, and goal money derived from won deals. He rejected all
of it: "I don't know why we have a pipeline page", "remove the nothing in
focus, remove the top three", "I'm not supposed to have an option for how
many DMs, just check it off or not". Do not reintroduce counters, stats
strips, focus timers or lead tracking. A tick is the unit of this app.

## The look: Todoist, in black and white

He sent a Todoist screenshot as the reference. Match it, not the CRM or MyDay:

- White page. Sidebar is a soft warm off-white, 280px, user row at the top,
  then "Add task" with a filled plus circle, then nav rows with a quiet count.
- Big bold page title (26px, 22px on the phone) with a small grey line under
  it that starts with a check icon. Nothing sticky, nothing blurred.
- **No cards.** Sections are a bold 15px heading with a hairline under it.
  Rows are divided by hairlines. No borders around rows, no shadows anywhere
  except the modal and sheet.
- Task rows: 18px circle, title, meta line under it (date in green for
  today, red for overdue), label at the bottom right. Date group headers read
  "Oct 8 · Today · Thursday". The add row is "+ Add task" at the bottom and
  types inline.
- System font stack. Monochrome: black is the only accent, green for done,
  red for overdue. No Todoist orange.
- Mobile: flat bottom bar with a hairline on top.

## Today (`js/today.js`)

Top to bottom, and nothing else:

1. **Greeting** as the page title, like Claude's "Njabulo returns!" which he
   likes. `GREETINGS` in `js/config.js` has five lines per time bucket
   (early, morning, afternoon, evening, late) plus "returns" lines for when
   yesterday was never closed and the streak is zero. `greeting()` picks one
   per day so it does not change on every tap. Add lines, never remove the
   name.
2. **Gate card** if yesterday was never closed (see below).
3. **Countdown strip**: days left for the primary goal (the money goal with a
   deadline, else the nearest deadline, else end of month), its amount if it
   is money, and the verse of the day.
4. **Today's to-do list**: the six fixed checks from `DAILY_CHECKS`
   (`js/config.js`), each a boolean on the day row (`god_first`, `dms_done`,
   `videos_done`, `comm_done`, `exercise`, `blog_done`), followed by the
   tasks due today or overdue, then "+ Add task". The exercise row shows the
   day's workout from the Exercise plan and its guide video link; a rest day
   counts as done without a tick.
5. **Content**: what today is for. If the Content plan marks today as a
   script/film/edit/post day, one line per activity with the concrete video
   (`todayContentActions()`), each with a Done button that advances the
   stage. If today is off: "Nothing to do today. Next content day is X".
6. **Goals**: title, days left, and a progress bar when the goal is money.
   Tap to edit. "+ Add goal".

## The behaviour rules

- **The day starts at 05:00** (`DAY_START_HOUR`). Every "today" goes through
  `dayKey()`. `armDayWatcher()` re-renders at 05:00:05.
- **A tick is the unit.** Anything he does is a boolean on the `days` row.
  Weekly counts (blog posts, videos by format) are derived at render.
- **The yesterday gate.** `gateDayKey()` returns yesterday if some day row
  exists before today and yesterday is not `checkin_done`. Only ever one day,
  never a backfill. A fresh install is never gated.
- **Check-in is three steps.** The day's ticks (with a required reason if
  the DMs were not sent), screen time chips, "1% better" yes or no with an
  optional line. Under thirty seconds or it will not happen nightly.
- **Content is formats and days, not ideas.** He has the scripts; he will not
  be adding ideas. The Content page shows which weekdays are scripting,
  filming, editing and posting days (`content_plan`, four booleans per
  weekday, tap to edit) and the weekly mix (`settings.weekly_mix`, e.g. teach
  6, proof 4, story 2, day in the life 2) with each format's posted count and
  one next step. The scripts are a collapsed list underneath. This exists
  because he doom-scrolls Instagram "looking for ideas" with twenty scripts
  waiting; the page must always answer "which one, and what do I do with it".
- **Exercise is a weekly plan**, not a tracker. `exercise_plan` has one row
  per weekday: a workout name or rest, and the video he follows while
  training. Ticking it off happens on Today.
- **Holds block nothing.** They show the decision date and how far the money
  goal still is.

## Files

| File | Role |
|---|---|
| `index.html` | Shell: splash, PIN gate, sidebar, six `<section class="page">`, mobile nav, modal, sheet, confirm, toast. |
| `styles.css` | Tokens, then everything flat. Additions are appended at the bottom in dated blocks. |
| `js/config.js` | Keys, defaults, `DAILY_CHECKS`, `CONTENT_ACTS`, `GREETINGS`, vocab lists, `ICONS`. |
| `js/sync.js` | `TABLES` registry (tasks, content, days, goals, exercise_plan, content_plan, holds, settings), localStorage-first db, outbox, `applyRemote`, lazy `connectSupabase()`, `dayGet`/`dayRow`/`bumpDay`, `planId`/`contentPlanId`, `S()`/`saveSettings`, export/import. |
| `js/derive.js` | Dates (5AM boundary), checks, streak, gate, goals, plans, content actions. Pure functions over `db.*`. |
| `js/ui.js` | Router, nav with counts, theme, modal, sheet, confirm, toast. |
| `js/today.js`, `tasks.js`, `content.js`, `exercise.js`, `checkin.js`, `review.js`, `settings.js` | One file per page. Module state is prefixed with the page name; one shared global scope. |
| `js/boot.js` | PIN gate, bootstrap, service worker, 05:00 watcher, splash. |
| `supabase/schema.sql` | Eight tables. Pair of `TABLES`; change both or writes fail with PGRST204. |
| `tools/serve.js`, `seed.js`, `shoot.js`, `test.js` | Local server on 4178, seed relative to today, screenshots (six pages, three widths, both themes, `--gate --checkin --empty`), 49 headless assertions. |

Per device (never synced): `track_theme`, `track_pin_hash`, `track_sb_url`,
`track_sb_key`, outbox keys, `track_<table>` caches; `track_unlocked` is
sessionStorage. The Supabase URL and key are typed into Settings, never in
source, which is why the GitHub Pages repo can be public.

## Deploy

GitHub Pages from `main`, root. Remote `sites-by-njabulo/Track`, live at
https://sites-by-njabulo.github.io/Track/. Network-first service worker, so a
push is live on next open. The Google Calendar button opens account 2
(`CALENDAR_URL`).

## Verify

```
node tools/serve.js
node tools/test.js
node tools/shoot.js
```

## Left for Njabulo

- Create the Supabase project, run `supabase/schema.sql`, paste URL + key into
  Settings on each device.
- Change the PIN from 0000.
