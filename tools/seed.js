// Fake data for screenshots and manual testing, built relative to today so the
// windows (7 / 30 days, this week) always have something in them.
//
//   node tools/seed.js            prints the localStorage map as JSON
//   node tools/shoot.js           injects it before the page loads
//
// Mirrors stableId() from js/sync.js so day rows get the same ids the app
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
    row({ title: 'Send proposal to Themba (plumbing site)', due: t, area: 'agency', done: false, top_date: t, notes: '' }, 2),
    row({ title: 'Film the "3 mistakes" video', due: t, area: 'content', done: false, top_date: t }, 1),
    row({ title: 'Maths past paper, section B', due: t, area: 'school', done: true, done_date: t, top_date: t }, 3),
    row({ title: 'Reply to Lerato about the GBP audit', due: shift(t, -1), area: 'agency', done: false }, 4),
    row({ title: 'Update portfolio with Geff site', due: shift(t, 2), area: 'agency', done: false }, 5),
    row({ title: 'Book dentist', due: null, area: 'personal', done: false }, 6),
    row({ title: 'Write blog from "why your GBP is invisible" script', due: shift(t, 1), area: 'content', done: false }, 2),
    row({ title: 'Ask Mr Dlamini about the Friday test', due: shift(t, 3), area: 'school', done: false }, 1),
    row({ title: 'Read 10 pages', due: null, area: 'personal', done: false }, 8)
  ];

  const leads = [
    row({ name: 'Themba M', business: 'Themba Plumbing', platform: 'instagram', service: 'web', stage: 'proposal', value: 1500, notes: 'Wants it before December.', follow_up_date: t, replied_date: shift(t, -9), call_date: shift(t, -6), proposal_date: shift(t, -2) }, 9),
    row({ name: 'Lerato K', business: 'Glow Beauty Bar', platform: 'instagram', service: 'seo', stage: 'call', value: 1000, notes: '', follow_up_date: shift(t, -1), replied_date: shift(t, -5), call_date: shift(t, -3) }, 5),
    row({ name: 'Sipho N', business: 'Sipho Electrical', platform: 'tiktok', service: 'web', stage: 'won', value: 1200, notes: 'Deposit paid.', replied_date: shift(t, -20), call_date: shift(t, -17), proposal_date: shift(t, -15), won_date: shift(t, -12) }, 20),
    row({ name: 'Anele D', business: 'Anele Tutoring', platform: 'instagram', service: 'web', stage: 'replied', value: 0, notes: 'Asked for prices.', follow_up_date: shift(t, 1), replied_date: shift(t, -1) }, 1),
    row({ name: 'Mandla R', business: 'MR Roofing', platform: 'whatsapp', service: 'both', stage: 'lost', value: 2500, notes: 'Went with his cousin.', replied_date: shift(t, -14), call_date: shift(t, -11), lost_date: shift(t, -8) }, 14),
    row({ name: 'Zinhle P', business: 'Zinhle Cleaning', platform: 'instagram', service: 'seo', stage: 'replied', value: 0, notes: '', replied_date: shift(t, -3) }, 3)
  ];

  const content = [
    row({ title: '3 mistakes plumbers make on their website', format: 'teach', stage: 'scripted', link: '', notes: '' }, 6),
    row({ title: 'How I got my first client at 16', format: 'story', stage: 'edited', link: '', notes: '' }, 4),
    row({ title: 'Geff site before and after', format: 'proof', stage: 'filmed', link: '', notes: '' }, 3),
    row({ title: 'Why your Google Business Profile is invisible', format: 'teach', stage: 'posted', posted_date: t, blog_date: null }, 7),
    row({ title: 'A school day plus 30 cold DMs', format: 'dayinlife', stage: 'posted', posted_date: shift(t, -1), blog_date: shift(t, -1) }, 8),
    row({ title: 'Reacting to a R500 website', format: 'reaction', stage: 'idea' }, 1),
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
    const dms = i % 5 === 0 ? 8 : (i % 3 === 0 ? 22 : 30);
    const closed = !(i === 1 && opts.gate);
    days.push(row({
      date: k, dms_sent: dms, comm_minutes: i % 2 ? 75 : 45, god_first: i % 4 !== 0, exercise: i % 3 === 0,
      screen_minutes: closed ? (i % 2 ? 55 : 85) : null,
      checkin_done: closed, checkin_at: closed ? new Date(Date.now() - i * 86400000).toISOString() : null,
      dm_skip_reason: closed && dms < 30 ? reasons[i % reasons.length] : null,
      better: closed ? i % 3 !== 0 : null,
      journal: closed && i % 4 === 0 ? 'Sent the DMs before school instead of after. Easier.' : '',
      focus_task_id: null, focus_started_at: null,
      focus_log: i % 6 === 0 ? [{ task_id: null, title: 'Old task', started_at: null, ended_at: null, outcome: 'parked', reason: 'pulled' }] : []
    }, i, stableId('day:' + k)));
  }
  days.push(row({
    date: t, dms_sent: 12, comm_minutes: 30, god_first: true, exercise: false, screen_minutes: null,
    checkin_done: false, checkin_at: null, dm_skip_reason: null, better: null, journal: '',
    focus_task_id: opts.focus ? tasks[0].id : null,
    focus_started_at: opts.focus ? new Date(Date.now() - 14 * 60000).toISOString() : null,
    focus_log: []
  }, 0, stableId('day:' + t)));

  const holds = [
    row({ item: 'MacBook Air', price: 1200, hold_until: shift(t, 23), status: 'holding', notes: 'For editing. The phone edits fine.' }, 7),
    row({ item: 'Rode wireless mic', price: 180, hold_until: shift(t, -5), status: 'dropped', notes: 'The earbuds were fine on camera.' }, 35)
  ];

  const settings = [row({
    target_dms: 30, target_videos: 2, target_comm: 75, screen_cap: 60, target_blogs: 5,
    goal_amount: 5000, goal_start: null, goal_end: null, focus_formats: ['teach', 'proof'], default_deal_value: 1500
  }, 10, stableId('settings'))];

  return {
    track_tasks: tasks, track_leads: leads, track_content: content, track_days: days, track_holds: holds, track_settings: settings
  };
}

module.exports = { buildSeed: buildSeed, stableId: stableId };

if (require.main === module) {
  console.log(JSON.stringify(buildSeed({ gate: process.argv.indexOf('--gate') !== -1, focus: process.argv.indexOf('--focus') !== -1 }), null, 2));
}
