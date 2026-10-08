// Fake data for screenshots and tests, built relative to today.
//
//   node tools/seed.js [--gate]     prints the localStorage map as JSON
//
// Mirrors stableId() from js/sync.js so day and plan rows get the ids the app
// would mint. Keep the two in step if either changes.
const DAY_START_HOUR = 5;

function stableId(seed) {
  const hex = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b].map(function (base) {
    let h = base >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-5' + hex.slice(13, 16) + '-8' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
}

function key(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function today() {
  const d = new Date();
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return key(d);
}
function shift(k, n) {
  const p = k.split('-');
  const d = new Date(+p[0], +p[1] - 1, +p[2]);
  d.setDate(d.getDate() + n);
  return key(d);
}
function lastOfMonth(k) {
  const p = k.split('-');
  return key(new Date(+p[0], +p[1], 0));
}

let counter = 0;
function id() { counter++; return stableId('seed:' + counter); }
function row(fields, daysAgo, fixedId) {
  const stamp = new Date(Date.now() - (daysAgo || 0) * 86400000).toISOString();
  return Object.assign({ id: fixedId || id(), created_at: stamp, updated_at: stamp, deleted_at: null }, fields);
}

function buildSeed(opts) {
  opts = opts || {};
  const t = today();
  const tasks = [
    row({ title: 'Send proposal to Themba (plumbing site)', due: t, area: 'agency', done: false, notes: '' }, 2),
    row({ title: 'Reply to Lerato about the GBP audit', due: shift(t, -1), area: 'agency', done: false }, 4),
    row({ title: 'Maths past paper, section B', due: t, area: 'school', done: true, done_date: t }, 3),
    row({ title: 'Update portfolio with Geff site', due: shift(t, 2), area: 'agency', done: false }, 5),
    row({ title: 'Book dentist', due: null, area: 'personal', done: false }, 6),
    row({ title: 'Ask Mr Dlamini about the Friday test', due: shift(t, 3), area: 'school', done: false }, 1),
    row({ title: 'Read 10 pages', due: null, area: 'personal', done: false }, 8)
  ];

  const content = [
    row({ title: '3 mistakes plumbers make on their website', format: 'teach', stage: 'scripted' }, 6),
    row({ title: 'How I got my first client at 16', format: 'story', stage: 'edited' }, 4),
    row({ title: 'Geff site before and after', format: 'proof', stage: 'filmed' }, 3),
    row({ title: 'Why your Google Business Profile is invisible', format: 'teach', stage: 'posted', posted_date: t }, 7),
    row({ title: 'A school day plus 30 cold DMs', format: 'dayinlife', stage: 'posted', posted_date: shift(t, -1), blog_date: shift(t, -1) }, 8),
    row({ title: 'Reacting to a $100 website', format: 'reaction', stage: 'scripted' }, 1),
    row({ title: 'What a $1,500 website actually includes', format: 'teach', stage: 'scripted' }, 5),
    row({ title: 'The DM that got a reply in 4 minutes', format: 'proof', stage: 'scripted' }, 9),
    row({ title: 'Client call: what they ask first', format: 'teach', stage: 'posted', posted_date: shift(t, -3), blog_date: shift(t, -2) }, 12),
    row({ title: 'Local SEO in 60 seconds', format: 'teach', stage: 'posted', posted_date: shift(t, -5) }, 15),
    row({ title: 'Reading my first cold DM out loud', format: 'story', stage: 'posted', posted_date: shift(t, -8) }, 18)
  ];

  const days = [];
  const reasons = ['mood', 'notime', 'mood', 'notworth', 'other'];
  for (let i = 29; i >= 1; i--) {
    const k = shift(t, -i);
    const closed = !(i === 1 && opts.gate);
    const dms = i % 5 !== 0;
    days.push(row({
      date: k, god_first: i % 4 !== 0, dms_done: dms, videos_done: i % 3 !== 0, comm_done: i % 2 === 0,
      exercise: i % 3 === 0, blog_done: i % 2 === 1,
      screen_minutes: closed ? (i % 2 ? 55 : 85) : null,
      checkin_done: closed, checkin_at: closed ? new Date(Date.now() - i * 86400000).toISOString() : null,
      dm_skip_reason: closed && !dms ? reasons[i % reasons.length] : null,
      better: closed ? i % 3 !== 0 : null,
      journal: closed && i % 4 === 0 ? 'Sent the DMs before school instead of after. Easier.' : ''
    }, i, stableId('day:' + k)));
  }
  days.push(row({
    date: t, god_first: true, dms_done: false, videos_done: false, comm_done: false, exercise: false, blog_done: false,
    screen_minutes: null, checkin_done: false, checkin_at: null, dm_skip_reason: null, better: null, journal: ''
  }, 0, stableId('day:' + t)));

  const goals = [
    row({ title: '$5,000 in client work', amount: 5000, current: 1200, deadline: lastOfMonth(t), done: false, sort: 0 }, 10),
    row({ title: 'Post every day for 30 days', amount: 0, current: 0, deadline: shift(t, 18), done: false, sort: 1 }, 12)
  ];

  const exercise_plan = [
    { weekday: 0, label: 'Upper', rest: false, video_url: 'https://www.youtube.com/watch?v=IODxDxX7oi4', notes: '' },
    { weekday: 1, label: 'Legs', rest: false, video_url: 'https://www.youtube.com/watch?v=vjdlqhPM9Jc', notes: '' },
    { weekday: 2, label: '', rest: true, video_url: '', notes: '' },
    { weekday: 3, label: 'Push', rest: false, video_url: 'https://www.youtube.com/watch?v=IODxDxX7oi4', notes: '' },
    { weekday: 4, label: 'Pull', rest: false, video_url: '', notes: '' },
    { weekday: 5, label: 'Cardio', rest: false, video_url: '', notes: '20 minutes, easy pace' },
    { weekday: 6, label: '', rest: true, video_url: '', notes: '' }
  ].map(function (p) { return row(p, 14, stableId('plan:' + p.weekday)); });

  const content_plan = [
    { weekday: 0, do_script: false, do_film: true,  do_edit: false, do_post: true,  notes: "Film 3, post 2" },
    { weekday: 1, do_script: false, do_film: false, do_edit: true,  do_post: true,  notes: "" },
    { weekday: 2, do_script: false, do_film: false, do_edit: false, do_post: true,  notes: "" },
    { weekday: 3, do_script: false, do_film: true,  do_edit: false, do_post: true,  notes: "Film 3" },
    { weekday: 4, do_script: false, do_film: false, do_edit: true,  do_post: true,  notes: "" },
    { weekday: 5, do_script: false, do_film: false, do_edit: false, do_post: false, notes: "" },
    { weekday: 6, do_script: true,  do_film: false, do_edit: false, do_post: false, notes: "Script next week" }
  ].map(function (p) { return row(p, 14, stableId('cplan:' + p.weekday)); });

  const holds = [
    row({ item: 'MacBook Air', price: 1200, hold_until: shift(t, 23), status: 'holding', notes: 'For editing. The phone edits fine.' }, 7),
    row({ item: 'Rode wireless mic', price: 180, hold_until: shift(t, -5), status: 'dropped', notes: 'The earbuds were fine on camera.' }, 35)
  ];

  const settings = [row({
    target_dms: 30, target_videos: 2, target_comm: 75, screen_cap: 60, target_blogs: 5,
    weekly_mix: { teach: 6, proof: 4, story: 2, dayinlife: 2 }
  }, 10, stableId('settings'))];

  return {
    track_tasks: tasks, track_content: content, track_days: days, track_goals: goals,
    track_exercise_plan: exercise_plan, track_content_plan: content_plan, track_holds: holds, track_settings: settings
  };
}

module.exports = { buildSeed: buildSeed, stableId: stableId };

if (require.main === module) {
  console.log(JSON.stringify(buildSeed({ gate: process.argv.indexOf('--gate') !== -1 }), null, 2));
}
