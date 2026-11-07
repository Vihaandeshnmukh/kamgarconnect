// Demo data for Kamgar Connect: realistic Aurangabad workers, employers, jobs, bookings and reviews.
// SAFETY: refuses to run unless the database name is exactly "kamgar_demo"; every record has isDemo: true;
// phone numbers start with 1 (no Indian mobile number does), so they cannot belong to a real person.
//
// Usage:
//   node scripts/demo-seed.js --uri "mongodb://.../kamgar_demo?..."            wipe demo records, then seed
//   node scripts/demo-seed.js --uri "..." --wipe                               only wipe demo records
//   (or set DEMO_MONGODB_URI instead of --uri; never point it at the production database)
const mongoose = require('mongoose');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const Call = require('../models/Call');
const Review = require('../models/Review');

const args = process.argv.slice(2);
const uri = args[args.indexOf('--uri') + 1] && args.includes('--uri') ? args[args.indexOf('--uri') + 1] : process.env.DEMO_MONGODB_URI;
const WIPE_ONLY = args.includes('--wipe');
const DEMO_DB = 'kamgar_demo';

// Aurangabad (Chhatrapati Sambhajinagar) areas with approximate coordinates [lng, lat]
const AREAS = [
  ['CIDCO N-5', 75.3693, 19.8762], ['Waluj MIDC', 75.2353, 19.8427], ['Garkheda', 75.3360, 19.8640],
  ['Osmanpura', 75.3270, 19.8700], ['Shendra MIDC', 75.4597, 19.8869], ['Chikalthana', 75.3990, 19.8800],
  ['Paithan Gate', 75.3220, 19.8890], ['Satara Parisar', 75.3200, 19.8410], ['Harsul', 75.3400, 19.9370],
  ['Jalna Road', 75.3550, 19.8760], ['Beed Bypass', 75.3300, 19.8500], ['Cidco N-2', 75.3800, 19.8720]
];
const TRADES = ['Mason', 'Plumber', 'Electrician', 'Domestic Help', 'Factory Worker', 'Carpenter', 'Painter', 'Driver'];
const WAGE = { Mason: [650, 900], Plumber: [600, 850], Electrician: [650, 950], 'Domestic Help': [400, 600], 'Factory Worker': [500, 700], Carpenter: [700, 1000], Painter: [550, 800], Driver: [600, 900] };
const FIRST = ['Ravi', 'Sunil', 'Ganesh', 'Santosh', 'Rahul', 'Vijay', 'Anil', 'Mahesh', 'Sachin', 'Prakash', 'Sita', 'Lata', 'Sunita', 'Kavita', 'Asha', 'Rekha', 'Dnyaneshwar', 'Balu', 'Shankar', 'Ramesh', 'Ajay', 'Kiran', 'Sandip', 'Nitin', 'Pooja'];
const LAST = ['Shinde', 'Pawar', 'More', 'Jadhav', 'Kale', 'Gaikwad', 'Patil', 'Bhosale', 'Wagh', 'Salve', 'Kamble', 'Deshmukh', 'Mane', 'Sonawane', 'Thorat'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COMMENTS = ['Came on time and finished the work neatly.', 'Good work, will hire again.', 'Hard working and polite.', 'Work was fine, came a little late.', 'Very skilled, explained everything.', ''];

let seed = 42; // deterministic, so every re-seed looks the same
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi, step = 50) => Math.round((lo + rnd() * (hi - lo)) / step) * step;
const istDay = (n) => new Date(Date.now() + n * 86400000 + 330 * 60000).toISOString().slice(0, 10);
const jitter = () => (rnd() - 0.5) * 0.02;

async function wipe() {
  const r = await Promise.all([Worker, Employer, Job, Call, Review].map(M => M.deleteMany({ isDemo: true })));
  return r.map(x => x.deletedCount).reduce((a, b) => a + b, 0);
}

(async () => {
  if (!uri) { console.error('Give --uri or DEMO_MONGODB_URI (the kamgar_demo database).'); process.exit(2); }
  await mongoose.connect(uri);
  if (mongoose.connection.name !== DEMO_DB) {
    console.error(`REFUSED: connected database is "${mongoose.connection.name}", not "${DEMO_DB}". Nothing was changed.`);
    await mongoose.disconnect(); process.exit(3);
  }
  const removed = await wipe();
  console.log(`removed ${removed} old demo records`);
  if (WIPE_ONLY) { await mongoose.disconnect(); return; }

  // 40 workers, 5 per trade
  const workers = [];
  let n = 1;
  for (const trade of TRADES) {
    for (let i = 0; i < 5; i++) {
      const [area, lng, lat] = pick(AREAS);
      const days = rnd() < 0.5 ? ['24/7'] : DAYS.filter(() => rnd() < 0.75);
      const live = rnd() < 0.45;
      workers.push({
        name: `${pick(FIRST)} ${pick(LAST)}`, phone: `100000${String(n++).padStart(4, '0')}`, city: 'Aurangabad', skill: trade,
        experience: Math.floor(rnd() * 15), expectedSalary: between(...WAGE[trade]), availability: days.length ? days : ['24/7'],
        isLooking: live, availableUntil: live ? new Date(Date.now() + (2 + rnd() * 6) * 3600000) : null,
        location: { type: 'Point', coordinates: [lng + jitter(), lat + jitter()] }, language: pick(['hi', 'mr', 'en']),
        isDemo: true, _area: area
      });
    }
  }
  const W = await Worker.insertMany(workers.map(({ _area, ...w }) => w));

  // 10 employers: builders, households, factories
  const EMP = [['Shree Ganesh Builders', 'Mason'], ['Patil Constructions', 'Mason'], ['Home (Kale family)', 'Domestic Help'], ['Waluj Auto Parts', 'Factory Worker'],
    ['Sai Interiors', 'Carpenter'], ['Jadhav Electricals', 'Electrician'], ['Home (Deshmukh family)', 'Plumber'], ['Shendra Packaging', 'Factory Worker'],
    ['Rang Painters & Co', 'Painter'], ['City Transport', 'Driver']];
  const E = await Employer.insertMany(EMP.map(([company, type], i) => {
    const [, lng, lat] = pick(AREAS);
    return { name: `${pick(FIRST)} ${pick(LAST)}`, phone: `100001${String(i + 1).padStart(4, '0')}`, city: 'Aurangabad', companyName: company,
      workerType: type, workerCount: 1 + Math.floor(rnd() * 5), location: { type: 'Point', coordinates: [lng + jitter(), lat + jitter()] }, isDemo: true };
  }));

  // Open jobs (one per employer, some for several workers)
  const jobs = E.map((e, i) => ({ employerId: e._id, jobType: EMP[i][1], city: 'Aurangabad', workerCount: 1 + Math.floor(rnd() * 3), status: 'pending',
    amount: between(...WAGE[EMP[i][1]]), date: istDay(1 + Math.floor(rnd() * 5)), location: pick(AREAS)[0], description: 'Demo job: bring your own tools.', isDemo: true }));
  // Finished jobs, for history and stats
  for (let i = 0; i < 6; i++) {
    const e = E[i], w = W.find(x => x.skill === EMP[i][1]);
    jobs.push({ employerId: e._id, workerId: w._id, jobType: w.skill, city: 'Aurangabad', status: 'completed', amount: w.expectedSalary,
      date: istDay(-3 - i), acceptedAt: new Date(Date.now() - (5 + i) * 86400000), completedAt: new Date(Date.now() - (3 + i) * 86400000), location: pick(AREAS)[0], isDemo: true });
  }
  const J = await Job.insertMany(jobs);

  // Website bookings: past (confirmed, rated) and upcoming (pending / confirmed)
  const calls = [];
  for (let i = 0; i < 24; i++) {
    const e = pick(E), w = pick(W), past = i < 16, d = past ? istDay(-1 - Math.floor(rnd() * 20)) : istDay(1 + Math.floor(rnd() * 6));
    calls.push({ callerId: e._id, receiverId: w._id, callerType: 'employer', callType: 'assign', status: 'completed', duration: 0,
      timestamp: new Date(Date.now() - (past ? 25 : 1) * 86400000 * rnd()),
      assignmentData: { location: pick(AREAS)[0], date: d, time: pick(['08:00', '09:00', '09:30', '10:00']), employerName: e.name,
        instructions: 'Demo booking', workerResponse: past ? 'confirmed' : pick(['pending', 'confirmed']), wage: w.expectedSalary }, isDemo: true });
  }
  const C = await Call.insertMany(calls);

  // Reviews for the past bookings; worker rating = average
  const reviews = C.slice(0, 16).filter(() => rnd() < 0.85).map(c => ({ workerId: c.receiverId, employerId: c.callerId, hireId: c._id,
    rating: 3 + Math.floor(rnd() * 3), comment: pick(COMMENTS), isDemo: true }));
  await Review.insertMany(reviews);
  for (const w of W) {
    const rs = reviews.filter(r => String(r.workerId) === String(w._id));
    if (rs.length) await Worker.updateOne({ _id: w._id }, { rating: +(rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(1), totalRatings: rs.length });
  }
  console.log(`seeded ${W.length} workers, ${E.length} employers, ${J.length} jobs, ${C.length} bookings, ${reviews.length} reviews (all isDemo: true)`);
  console.log('demo logins: workers 1000000001-1000000040, employers 1000010001-1000010010');
  await mongoose.disconnect();
})().catch(async (e) => { console.error(e.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
