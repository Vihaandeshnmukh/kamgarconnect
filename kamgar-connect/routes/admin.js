// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/data
router.get('/data', adminAuth, async (req, res) => {
  try {
    const workers = await Worker.find().select('+aadhaar').sort({ createdAt: -1 });
    const employers = await Employer.find().sort({ createdAt: -1 });
    res.json({ workers, employers });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

// ===== Admin dashboard =====
const Job = require('../models/Job');
const Call = require('../models/Call');
const mongoose = require('mongoose');
const noDemo = (req) => req.query.hideDemo === '1' ? { isDemo: { $ne: true } } : {};
const mask = (p) => p ? '••••••' + String(p).slice(-4) : '';

// GET /api/admin/summary?hideDemo=1 - totals and sign-ups per day (last 14 days)
router.get('/summary', adminAuth, async (req, res) => {
  try {
    const nd = noDemo(req);
    const since = new Date(Date.now() - 14 * 86400000);
    const perDay = async (M) => (await M.aggregate([{ $match: { ...nd, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }])).map(x => ({ day: x._id, n: x.n }));
    const [workers, employers, liveNow, jobsByStatus, bookings, confirmed, noShows, queue, demoRecords, wDays, eDays] = await Promise.all([
      Worker.countDocuments(nd), Employer.countDocuments(nd),
      Worker.countDocuments({ ...nd, isLooking: true, availableUntil: { $gt: new Date() } }),
      Job.aggregate([{ $match: nd }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Call.countDocuments({ ...nd, callType: 'assign' }),
      Call.countDocuments({ ...nd, callType: 'assign', 'assignmentData.workerResponse': 'confirmed' }),
      Worker.aggregate([{ $match: nd }, { $group: { _id: null, n: { $sum: '$noShows' } } }]),
      Worker.countDocuments({ ...nd, verified: { $ne: true }, verifyRequestedAt: { $exists: true } }),
      Worker.countDocuments({ isDemo: true }),
      perDay(Worker), perDay(Employer)
    ]);
    let reports = 0; try { reports = await mongoose.model('Report').countDocuments({ ...nd, status: 'open' }); } catch (e) { reports = 0; }
    res.json({ workers, employers, liveNow, jobs: Object.fromEntries(jobsByStatus.map(x => [x._id, x.n])), bookings, confirmed,
      noShows: (noShows[0] || {}).n || 0, verifyQueue: queue, openReports: reports, demoWorkers: demoRecords, signups: { workers: wDays, employers: eDays } });
  } catch (err) { res.status(500).json({ msg: 'Server Error' }); }
});

// GET /api/admin/recent?hideDemo=1 - newest 30 sign-ups (phone numbers masked)
router.get('/recent', adminAuth, async (req, res) => {
  try {
    const nd = noDemo(req);
    const [ws, es] = await Promise.all([Worker.find(nd).sort({ createdAt: -1 }).limit(30).select('name phone city skill createdAt isDemo verified'),
      Employer.find(nd).sort({ createdAt: -1 }).limit(30).select('name phone city companyName createdAt isDemo')]);
    const rows = ws.map(w => ({ role: 'worker', _id: w._id, name: w.name, phone: mask(w.phone), city: w.city, skill: w.skill, createdAt: w.createdAt, isDemo: !!w.isDemo, verified: !!w.verified }))
      .concat(es.map(e => ({ role: 'employer', _id: e._id, name: e.name, phone: mask(e.phone), city: e.city, company: e.companyName || '', createdAt: e.createdAt, isDemo: !!e.isDemo })))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);
    res.json(rows);
  } catch (err) { res.status(500).json({ msg: 'Server Error' }); }
});

// Verified-badge queue: workers who asked, oldest first
router.get('/verify-queue', adminAuth, async (req, res) => {
  try {
    const ws = await Worker.find({ ...noDemo(req), verified: { $ne: true }, verifyRequestedAt: { $exists: true } }).sort({ verifyRequestedAt: 1 }).limit(100)
      .select('name phone city skill experience rating totalRatings jobsDone noShows verifyRequestedAt isDemo');
    res.json(ws.map(w => ({ _id: w._id, name: w.name, phone: w.phone, city: w.city, skill: w.skill, experience: w.experience, rating: w.rating, totalRatings: w.totalRatings,
      jobsDone: w.jobsDone || 0, noShows: w.noShows || 0, requestedAt: w.verifyRequestedAt, isDemo: !!w.isDemo })));
  } catch (err) { res.status(500).json({ msg: 'Server Error' }); }
});
// POST /api/admin/workers/:id/verify  { approve: true | false }  (false = remove badge / turn down the request)
router.post('/workers/:id/verify', adminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ msg: 'Invalid worker id' });
    const approve = req.body ? req.body.approve === true : false;
    const r = await Worker.updateOne({ _id: req.params.id }, approve ? { $set: { verified: true } } : { $set: { verified: false }, $unset: { verifyRequestedAt: 1 } });
    if (!r.matchedCount) return res.status(404).json({ msg: 'Worker not found' });
    if (approve) require('../utils/inbox').notify(req.io, req.params.id, 'worker', 'badge_approved', {});
    res.json({ ok: true, verified: approve });
  } catch (err) { res.status(500).json({ msg: 'Server Error' }); }
});

// Reports and deletion requests
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const Report = require('../models/Report');
    const list = await Report.find({ ...noDemo(req), status: req.query.status === 'closed' ? 'closed' : 'open' }).sort({ createdAt: -1 }).limit(100);
    const ids = list.flatMap(r => [r.reporterId, r.targetId]).filter(Boolean);
    const [ws, es] = await Promise.all([Worker.find({ _id: { $in: ids } }).select('name phone'), Employer.find({ _id: { $in: ids } }).select('name phone')]);
    const who = Object.fromEntries(ws.concat(es).map(x => [String(x._id), { name: x.name, phone: x.phone }]));
    res.json(list.map(r => ({ _id: r._id, reason: r.reason, note: r.note, status: r.status, createdAt: r.createdAt,
      reporter: { role: r.reporterRole, ...(who[String(r.reporterId)] || { name: '(deleted)' }) },
      target: r.targetId ? { role: r.targetRole, ...(who[String(r.targetId)] || { name: '(deleted)' }) } : null })));
  } catch (err) { res.status(500).json({ msg: 'Server Error' }); }
});
router.post('/reports/:id/close', adminAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ msg: 'Invalid id' });
    const Report = require('../models/Report');
    const r = await Report.updateOne({ _id: req.params.id }, { $set: { status: 'closed' } });
    if (!r.matchedCount) return res.status(404).json({ msg: 'Report not found' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ msg: 'Server Error' }); }
});

module.exports = router;

