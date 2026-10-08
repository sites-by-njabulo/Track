# Track

One screen that says what to do next. A personal daily operating system:
Today, Tasks, Pipeline, Content, Exercise, Review, Settings. Looks like
Todoist, in black and white.

## Run it

Open `index.html`, or:

```
node tools/serve.js
```

then `http://127.0.0.1:4178/`. PIN is `0000` until you change it in Settings.

## Install on the phone

Open the GitHub Pages URL in Safari or Chrome, Share, Add to Home Screen. It
opens straight to Today after the PIN.

## Sync between laptop and phone (once)

1. Create a free project at supabase.com.
2. SQL Editor, New query, paste `supabase/schema.sql`, Run.
3. Project Settings, API: copy the Project URL and the publishable key.
4. In Track, Settings, Sync: paste both, Connect. Do this on each device.

Until then every device keeps its own data. Settings, Data has Export and
Import if you ever need to move data by hand.

## How a day goes

- Morning: Today opens. If last night was not closed, close it first (30
  seconds). Your Top 3 are already chosen. Press play on one.
- During the day: tap +1 or +5 as DMs go out. The line under the counter tells
  you what DMs have been worth over the last 30 days. Content shows which
  kind of video is behind this week and what to do with it next. Exercise
  counts each exercise up to its target.
- Night: Close the day. Numbers, screen time, 1% better, tomorrow's three.

## Files

| | |
|---|---|
| `index.html`, `styles.css`, `js/` | the app |
| `supabase/schema.sql` | database setup |
| `tools/` | local server, seed data, screenshots, tests |
