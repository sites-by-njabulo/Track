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

  const days = [];
  const reasons = ['mood', 'notime', 'mood', 'notworth', 'other'];
  for (let i = 29; i >= 1; i--) {
    const k = shift(t, -i);
    const closed = !(i === 1 && opts.gate);
    const dms = i % 5 !== 0;
    days.push(row({
      date: k, god_first: i % 4 !== 0, dms_done: dms, videos_done: i % 3 !== 0, comm_done: i % 2 === 0,
      exercise: i % 3 === 0, blog_done: i % 2 === 1,
      screen_minutes: closed ? (i % 2 ? 60 : 90) : null,
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

  const goalMoney = row({ title: '$5,000 in client work', amount: 5000, deadline: lastOfMonth(t), done: false, sort: 0 }, 10, stableId('seed:goal1'));
  const goalPost = row({ title: 'Post every day for 30 days', amount: 0, deadline: shift(t, 18), done: false, sort: 1 }, 12, stableId('seed:goal2'));
  const goals = [goalMoney, goalPost];
  const goal_entries = [
    row({ goal_id: goalMoney.id, amount: 1200, note: 'Sipho Electrical, website deposit', date: shift(t, -12) }, 12),
    row({ goal_id: goalMoney.id, amount: 500, note: 'Glow Beauty Bar, GBP setup', date: shift(t, -4) }, 4)
  ];

  const exercise_plan = [
    { weekday: 0, label: 'Upper', rest: false, link: 'https://www.youtube.com/watch?v=IODxDxX7oi4', notes: '' },
    { weekday: 1, label: 'Legs', rest: false, link: 'https://www.youtube.com/watch?v=vjdlqhPM9Jc', notes: '' },
    { weekday: 2, label: '', rest: true, link: '', notes: '' },
    { weekday: 3, label: 'Push', rest: false, link: 'https://www.youtube.com/watch?v=IODxDxX7oi4', notes: '' },
    { weekday: 4, label: 'Pull', rest: false, link: '', notes: '' },
    { weekday: 5, label: 'Cardio', rest: false, link: '', notes: '20 minutes, easy pace' },
    { weekday: 6, label: '', rest: true, link: '', notes: '' }
  ].map(function (p) { return row(p, 14, stableId('exercise_plan:' + p.weekday)); });

  const comm_plan = [
    { weekday: 0, label: 'Speaking clearly', rest: false, link: '', notes: 'Read one page aloud, record it' },
    { weekday: 1, label: 'Pacing', rest: false, link: '', notes: 'Slow down between points' },
    { weekday: 2, label: 'No fillers', rest: false, link: 'https://www.youtube.com/watch?v=IODxDxX7oi4', notes: '' },
    { weekday: 3, label: 'Eye contact', rest: false, link: '', notes: 'Hold it through the whole sentence' },
    { weekday: 4, label: 'Storytelling', rest: false, link: '', notes: 'One story, told three times' },
    { weekday: 5, label: 'Cold open', rest: false, link: '', notes: 'First line only, ten takes' },
    { weekday: 6, label: '', rest: true, link: '', notes: '' }
  ].map(function (p) { return row(p, 14, stableId('comm_plan:' + p.weekday)); });

  const content_plan = [
    { weekday: 0, do_script: false, do_film: true,  do_edit: false, do_post: true,  notes: 'Film 3, post 2' },
    { weekday: 1, do_script: false, do_film: false, do_edit: true,  do_post: true,  notes: '' },
    { weekday: 2, do_script: false, do_film: false, do_edit: false, do_post: true,  notes: '' },
    { weekday: 3, do_script: false, do_film: true,  do_edit: false, do_post: true,  notes: 'Film 3' },
    { weekday: 4, do_script: false, do_film: false, do_edit: true,  do_post: true,  notes: '' },
    { weekday: 5, do_script: false, do_film: false, do_edit: false, do_post: false, notes: '' },
    { weekday: 6, do_script: true,  do_film: false, do_edit: false, do_post: false, notes: 'Script next week' }
  ].map(function (p) { return row(p, 14, stableId('content_plan:' + p.weekday)); });

  const holds = [
    row({ item: 'MacBook Air', price: 1200, hold_until: shift(t, 23), status: 'holding', notes: 'For editing. The phone edits fine.' }, 7),
    row({ item: 'Rode wireless mic', price: 180, hold_until: shift(t, -5), status: 'dropped', notes: 'The earbuds were fine on camera.' }, 35)
  ];

  const stands = [
    row({ date: shift(t, -2), at: new Date(Date.now() - 2 * 86400000).toISOString(), feeling: "habit", action: "phone", outcome: "stood" }, 2),
    row({ date: shift(t, -5), at: new Date(Date.now() - 5 * 86400000).toISOString(), feeling: "lonely", action: "pray", outcome: "stood" }, 5),
    row({ date: shift(t, -9), at: new Date(Date.now() - 9 * 86400000).toISOString(), feeling: null, action: null, outcome: "slipped" }, 9)
  ];

  const settings = [row({ target_dms: 30, target_videos: 2, target_comm: 75, screen_cap: 70, target_blogs: 4, stand_list: '' }, 10, stableId('settings'))];

  return {
    track_tasks: tasks, track_days: days, track_goals: goals, track_goal_entries: goal_entries,
    track_exercise_plan: exercise_plan, track_comm_plan: comm_plan, track_content_plan: content_plan,
    track_holds: holds, track_stands: stands, track_settings: settings
  };
}

module.exports = { buildSeed: buildSeed, stableId: stableId };

if (require.main === module) {
  console.log(JSON.stringify(buildSeed({ gate: process.argv.indexOf('--gate') !== -1 }), null, 2));
}
