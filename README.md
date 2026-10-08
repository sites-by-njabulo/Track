# Track

One screen that says what to do next. A personal daily operating system:
Today, Tasks, Content, Exercise, Communication, Goals, Review, Settings.
Looks like Todoist, in black and white.

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

The app points at the MyDay Supabase project. Open that project's SQL editor
(link on the Settings page), paste the whole of `supabase/schema.sql`, Run.
From then on every device shares the same data. Until then each device
keeps its own, and the sidebar says Offline.

## How a day goes

- Morning: Today opens with a greeting. If last night was not closed, close
  it first (30 seconds). Then the list: six ticks and today's tasks.
- During the day: tick things off. Content says what today is for, with the
  links to the sheet and the scripts. Exercise and Communication show the
  day's plan with its guide videos. Goals shows what has come in.
- Night: Close the day. The ticks, Instagram time, 1% better.

## Files

| | |
|---|---|
| `index.html`, `styles.css`, `js/` | the app |
| `supabase/schema.sql` | database setup |
| `tools/` | local server, seed data, screenshots, tests |
