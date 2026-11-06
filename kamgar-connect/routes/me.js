// The logged-in user's own account: profile (view + edit), hire history and stats.
// Used by the website's app screens (Profile, History, Stats) and later the mobile app.
//   GET /api/me          own profile
//   PUT /api/me          edit own profile (the phone number is the login, so it can't change here)
//   GET /api/me/history  past hires: employer -> workers they hired, worker -> employers who hired them
//   GET /api/me/stats    numbers for the Stats screen
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Call = require('../models/Call');
const Job = require('../models/Job');
const Review = require('../models/Review');
const { cleanName, isValidName, cleanText, CITIES, SKILLS, parseLocation, nearestCity, toPoint } = require('../utils/sanitize');

router.use(auth);

const Model = (req) => (req.user.role === 'employer' ? Employer : Worker);
const DAYS = ['24/7', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// [lng, lat] -> { lat, lng }, or null for the 0,0 default
const readLocation = (loc) => {
  const c = loc && loc.coordinates;
  if (!Array.isArray(c) || c.length !== 2 || (c[0] === 0 && c[1] === 0)) return null;
  return { lat: c[1], lng: c[0] };
};

// What the user sees about themself
const ownProfile = (u, role) => ({
  id: u.id,
  role,
  name: u.name,
  phone: u.phone,
  city: u.city,
  email: u.email || null,
  googleLinked: Boolean(u.googleId),
  location: readLocation(u.location),
  createdAt: u.createdAt,
  ...(role === 'worker' ? {
    skill: u.skill,
    experience: u.experience,
    expectedSalary: u.expectedSalary,
    availability: u.availability,
    isLooking: Boolean(u.isLooking),
    availableUntil: u.availableUntil,
    isWithdrawn: Boolean(u.isWithdrawn),
    hiredUntil: u.hiredUntil,
    rating: u.rating,
    totalRatings: u.totalRatings
  } : {
    companyName: u.companyName || '',
    workerType: u.workerType || '',
    workerCount: u.workerCount || null
  })
});

const findMe = (req) => Model(req).findById(req.user.id).select('+email +googleId');

router.get('/', async (req, res) => {
  try {
    const me = await findMe(req);
    if (!me) return res.status(404).json({ msg: 'Account not found' });
    res.json(ownProfile(me, req.user.role));
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Returns an error message for a bad field, or null. Only the fields sent are checked.
function profileError(b, role) {
  if (b.name !== undefined && !isValidName(cleanName(b.name))) return 'Please enter your name (letters only)';
  if (b.city !== undefined && !CITIES.includes(b.city)) return 'Please select your city';
  if (b.location !== undefined && b.location !== null && !parseLocation(b.location)) return 'Invalid location';
  if (role === 'worker') {
    if (b.skill !== undefined && !SKILLS.includes(b.skill)) return 'Please select your work type';
    if (b.experience !== undefined && !(Number.isInteger(Number(b.experience)) && Number(b.experience) >= 0 && Number(b.experience) <= 60)) return 'Experience must be 0-60 years';
    if (b.expectedSalary !== undefined && !(Number.isInteger(Number(b.expectedSalary)) && Number(b.expectedSalary) >= 100 && Number(b.expectedSalary) <= 5000)) return 'Daily wage must be between 100 and 5000';
    if (b.availability !== undefined && !(Array.isArray(b.availability) && b.availability.length >= 1 && b.availability.length <= 8 && b.availability.every(d => DAYS.includes(d)))) return 'Please select at least one day';
  } else {
    if (b.workerType !== undefined && b.workerType !== '' && !SKILLS.includes(b.workerType)) return 'Please select a worker type';
    if (b.workerCount !== undefined && b.workerCount !== null && b.workerCount !== '' && !(Number.isInteger(Number(b.workerCount)) && Number(b.workerCount) >= 1 && Number(b.workerCount) <= 500)) return 'Number of workers must be 1-500';
    if (b.companyName !== undefined && typeof b.companyName !== 'string') return 'Invalid company name';
  }
  return null;
}

router.put('/', async (req, res) => {
  try {
    const b = req.body || {};
    const role = req.user.role;
    const bad = profileError(b, role);
    if (bad) return res.status(400).json({ msg: bad });

    const me = await findMe(req);
    if (!me) return res.status(404).json({ msg: 'Account not found' });

    if (b.name !== undefined) me.name = b.name;
    if (b.city !== undefined) me.city = b.city;
    if (b.location !== undefined) {
      const loc = parseLocation(b.location);
      me.location = loc ? toPoint(loc) : { type: 'Point', coordinates: [0, 0] };
      // Location shared but no city sent: follow the location
      if (loc && b.city === undefined) me.city = nearestCity(loc);
    }
    if (role === 'worker') {
      if (b.skill !== undefined) me.skill = b.skill;
      if (b.experience !== undefined) me.experience = Number(b.experience);
      if (b.expectedSalary !== undefined) me.expectedSalary = Number(b.expectedSalary);
      if (b.availability !== undefined) me.availability = b.availability.includes('24/7') ? ['24/7'] : b.availability;
    } else {
      if (b.companyName !== undefined) me.companyName = cleanText(b.companyName, 80);
      if (b.workerType !== undefined) me.workerType = b.workerType || undefined;
      if (b.workerCount !== undefined) me.workerCount = Number(b.workerCount) || undefined;
    }
    await me.save();
    res.json(ownProfile(me, role));
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Website hires ("assign" records), newest first
const hiresFor = (req) => Call.find(req.user.role === 'employer'
  ? { callerId: req.user.id, callType: 'assign' }
  : { receiverId: req.user.id, callType: 'assign' }).sort({ timestamp: -1 }).limit(200);

router.get('/history', async (req, res) => {
  try {
    const hires = await hiresFor(req);
    const now = new Date();
    if (req.user.role === 'employer') {
      const ids = [...new Set(hires.map(h => String(h.receiverId)))];
      const workers = await Worker.find({ _id: { $in: ids } }).select('name skill phone city rating totalRatings expectedSalary hiredUntil hiredBy isLooking availableUntil isWithdrawn');
      const byId = Object.fromEntries(workers.map(w => [String(w._id), w]));
      const rated = new Set((await Review.find({ hireId: { $in: hires.map(h => h._id) } }).select('hireId')).map(r => String(r.hireId)));
      return res.json(hires.map(h => {
        const w = byId[String(h.receiverId)];
        return {
          hireId: h._id,
          bookedAt: h.timestamp,
          date: h.assignmentData && h.assignmentData.date,
          time: h.assignmentData && h.assignmentData.time,
          location: h.assignmentData && h.assignmentData.location,
          rated: rated.has(String(h._id)),
          worker: w ? {
            _id: w._id, name: w.name, skill: w.skill, phone: w.phone, city: w.city,
            rating: w.rating, totalRatings: w.totalRatings, expectedSalary: w.expectedSalary,
            bookedByYouNow: Boolean(w.hiredUntil > now && String(w.hiredBy) === req.user.id),
            availableNow: Boolean(w.isLooking && w.availableUntil > now && !w.hiredUntil && !w.isWithdrawn)
          } : null // worker account deleted
        };
      }));
    }
    const ids = [...new Set(hires.map(h => String(h.callerId)))];
    const employers = await Employer.find({ _id: { $in: ids } }).select('name phone city companyName');
    const byId = Object.fromEntries(employers.map(e => [String(e._id), e]));
    res.json(hires.map(h => {
      const e = byId[String(h.callerId)];
      return {
        hireId: h._id,
        bookedAt: h.timestamp,
        date: h.assignmentData && h.assignmentData.date,
        time: h.assignmentData && h.assignmentData.time,
        location: h.assignmentData && h.assignmentData.location,
        instructions: h.assignmentData && h.assignmentData.instructions,
        employer: e ? { name: (h.assignmentData && h.assignmentData.employerName) || e.name, phone: e.phone, city: e.city, companyName: e.companyName || '' } : null
      };
    }));
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// "2026-11" for a date, in India time
const monthKey = (d) => new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 7);
const lastMonths = (n) => {
  const out = [];
  const d = new Date(Date.now() + 330 * 60000);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(m.toISOString().slice(0, 7));
  }
  return out;
};

router.get('/stats', async (req, res) => {
  try {
    const me = await Model(req).findById(req.user.id);
    if (!me) return res.status(404).json({ msg: 'Account not found' });
    const hires = await hiresFor(req);
    const months = lastMonths(6);
    const perMonth = Object.fromEntries(months.map(m => [m, 0]));
    hires.forEach(h => { const k = monthKey(h.timestamp); if (k in perMonth) perMonth[k]++; });
    const thisMonth = perMonth[months[months.length - 1]];
    const monthly = months.map(m => ({ month: m, count: perMonth[m] }));
    const now = new Date();

    if (req.user.role === 'employer') {
      const workerIds = [...new Set(hires.map(h => String(h.receiverId)))];
      const workers = await Worker.find({ _id: { $in: workerIds } }).select('skill expectedSalary');
      const skillOf = Object.fromEntries(workers.map(w => [String(w._id), w]));
      const bySkill = {};
      let estSpend = 0;
      hires.forEach(h => {
        const w = skillOf[String(h.receiverId)];
        if (!w) return;
        bySkill[w.skill] = (bySkill[w.skill] || 0) + 1;
        estSpend += Number(w.expectedSalary) || 0;
      });
      const [bookedNow, ratingsGiven, jobsPosted] = await Promise.all([
        Worker.countDocuments({ hiredBy: req.user.id, hiredUntil: { $gt: now } }),
        Review.countDocuments({ employerId: req.user.id }),
        Job.countDocuments({ employerId: req.user.id })
      ]);
      return res.json({
        role: 'employer',
        totalHires: hires.length,
        uniqueWorkers: workerIds.length,
        hiresThisMonth: thisMonth,
        bookedNow,
        ratingsGiven,
        jobsPosted,
        estimatedSpend: estSpend,
        bySkill: Object.entries(bySkill).map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count),
        monthly,
        memberSince: me.createdAt
      });
    }

    const jobsDone = await Job.countDocuments({ workerId: req.user.id });
    res.json({
      role: 'worker',
      totalHires: hires.length,
      uniqueEmployers: new Set(hires.map(h => String(h.callerId))).size,
      hiresThisMonth: thisMonth,
      jobsAccepted: jobsDone,
      rating: me.rating || 0,
      totalRatings: me.totalRatings || 0,
      dailyWage: me.expectedSalary || null,
      estimatedEarnings: hires.length * (Number(me.expectedSalary) || 0),
      isLive: Boolean(me.isLooking && me.availableUntil > now),
      bookedNow: Boolean(me.hiredUntil > now),
      monthly,
      memberSince: me.createdAt
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
