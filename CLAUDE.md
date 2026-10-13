# Track

Njabulo's personal daily operating system: Today, Tasks, Content, Exercise,
Communication, Goals, Stand, Review, Settings. Built 2026-10-08, cut down the same day on his instruction:
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
   day's workout from the Exercise plan with its guide video link; the
   communication row shows the day's focus from the Communication plan. A
   rest day on either plan counts as done without a tick.
5. **Content**: what today is for, from the Content plan ("Film and Post
   day", the day's note, and the next content day), plus the two links to
   his Google Sheet and Docs (`CONTENT_LINKS`). The scripts live there, not
   in the app.
6. **Goals**: title, days left, "$1,700 of $5,000, $3,300 to go" and the
   percentage with a bar. Tap goes to the Goals page. "+ Log what came in"
   adds an entry to the primary goal.

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
- **Content is days, not scripts.** He manages scripts in Google Sheets and
  Docs. The Content page is only: which weekdays are scripting, filming,
  editing and posting days (`content_plan`, four booleans and a note per
  weekday, tap to edit) and the two links. A "This week by format" section
  with next-step buttons was built and removed ("I don't really understand
  it"); so was a blog "Published" button he pressed by mistake. No quick
  action buttons on this page.
- **Goals are entries, not a typed total.** `goals` (title, amount,
  deadline) and `goal_entries` (goal_id, amount, note, date). Progress is
  the sum of entries. The $5,000 goal is created once on first open
  (`seedDefaultGoal` in `js/boot.js`, flag `track_goal_seeded`).
- **Exercise and Communication are weekly plans**, not trackers, built from
  one factory (`makeWeekPlanPage` in `js/weekplan.js`). One row per weekday
  in `exercise_plan` / `comm_plan`: a label or rest, a link, notes. Ticking
  happens on Today.
- **Screen time means Instagram time.** Cap default 70 minutes: an hour of
  DMs and posting plus ten. Not the whole phone (WhatsApp is client work).
- **Stand is the page for the urge.** He asked for it himself (2026-10-13):
  he struggles with lust and pornography, is a committed Christian, and the
  trigger comes at night. `js/stand.js` is a full-screen, always-dark flow,
  one thing per screen: ten-second breathing ring, name the feeling (each
  feeling has a one-line truth), a verse (fourteen on purity and temptation,
  rotating), what is on the line (`settings.stand_list`, one per line, with
  built-in defaults: future wife, kids, the $5,000, the people he is meant to
  help, peace with God), three hard lines in the Goggins/Tate cadence he
  asked for (written in the file, never real quotes, never misogyny, always
  compatible with the faith framing), one concrete action (phone out of the
  room, 30 push-ups, cold water, 60 seconds of prayer with a timer), a short
  prayer, then the finish: an SVG ring draws itself, "You stood.", the count
  this month, James 1:12. Every completion is a `stands` row (outcome
  "stood"). "I already gave in" is a separate short path (1 John 1:9,
  Proverbs 24:16, say it to God, get up) logged as "slipped", so a slip never
  becomes a spiral. Stand sits in the phone's bottom bar on purpose: one tap
  at night. Tone rule: hard and direct, never shaming. God is developing him,
  not punishing him. Do not add tracking beyond the count.
- **Sidebar is resizable** on the laptop (drag the right edge, double-click
  to reset), stored per device in `track_sidebar_w` and applied in the head
  script before paint, so Chrome can sit in half a screen.
- **Holds block nothing.** They show the decision date and how far the money
  goal still is.

## Files

| File | Role |
|---|---|
| `index.html` | Shell: splash, PIN gate, sidebar, six `<section class="page">`, mobile nav, modal, sheet, confirm, toast. |
| `styles.css` | Tokens, then everything flat. Additions are appended at the bottom in dated blocks. |
| `js/config.js` | Keys, defaults, `DAILY_CHECKS`, `CONTENT_ACTS`, `GREETINGS`, vocab lists, `ICONS`. |
| `js/sync.js` | `TABLES` registry (tasks, days, goals, goal_entries, exercise_plan, comm_plan, content_plan, holds, settings), localStorage-first db, outbox, `applyRemote`, lazy `connectSupabase()`, `dayGet`/`dayRow`/`bumpDay`, `weekPlanId`, `S()`/`saveSettings`, export/import. |
| `js/derive.js` | Dates (5AM boundary), checks, streak, gate, goals, plans, content actions. Pure functions over `db.*`. |
| `js/ui.js` | Router, nav with counts, theme, modal, sheet, confirm, toast. |
| `js/today.js`, `tasks.js`, `content.js`, `weekplan.js` (Exercise + Communication), `goals.js`, `stand.js`, `checkin.js`, `review.js`, `settings.js` | One file per page. Module state is prefixed with the page name; one shared global scope. |
| `js/boot.js` | PIN gate, bootstrap, service worker, 05:00 watcher, splash. |
| `supabase/schema.sql` | Ten tables. Pair of `TABLES`; change both or writes fail with PGRST204. |
| `tools/serve.js`, `seed.js`, `shoot.js`, `test.js` | Local server on 4178, seed relative to today, screenshots (nine pages, three widths, both themes, `--gate --checkin --stand --empty`), 55 headless assertions. |

Per device (never synced): `track_theme`, `track_sidebar_w`, `track_pin_hash`,
`track_sb_url`, `track_sb_key`, `track_goal_seeded`, outbox keys,
`track_<table>` caches; `track_unlocked` is sessionStorage.

**Sync points at MyDay's Supabase project by default** (`SUPABASE_DEFAULT_URL`
and `_KEY` in `js/config.js`), on his instruction: he no longer uses MyDay.
The publishable key was already public in MyDay's Pages source. Settings can
override per device. Until `supabase/schema.sql` has been run in that
project the sidebar says "Offline" and everything stays local; the schema
does not touch MyDay's own tables.

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

- Run `supabase/schema.sql` once in the MyDay project's SQL editor (link on
  the Settings page). Nothing to paste into the app.
- Change the PIN from 0000.
