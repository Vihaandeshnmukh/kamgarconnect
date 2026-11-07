// WEB VERSION - FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { requireRole, requireSelf } = require('../middleware/roles');
const { normalizePhone, isPhone, parseLocation, toPoint } = require('../utils/sanitize');
const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Call = require('../models/Call');
const { ACTIVE, istDate, activateTodaysBookings, freeWorkerFromBooking } = require('../utils/bookings');
const Employer = require('../models/Employer');
const { AREAS, km, nearestArea, hasPoint, roughKm } = require('../utils/areas');

// TODO BEFORE PRODUCTION:
// 1. Workers only see worker dashboard
// 2. Employers only see employer dashboard
// 3. Remove testing mode banner
// (User type checks and the self-hire block are back: only a worker can change
//  their own availability, and only employers can hire or release.)

// Every :id in this router must be a real MongoDB id (400 instead of a 500)
router.param('id', (req, res, next, id) => {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ msg: 'Invalid worker id' });
    next();
});

// Reads the login token if there is one; public routes still work without it.
// A token that is sent but expired/invalid gets 401, so the website can say "Session expired".
const optionalAuth = (req, res, next) => {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        if (token !== 'null') { if (token !== 'undefined') {
            try { req.user = jwt.verify(token, process.env.JWT_SECRET).user; }
            catch (err) { return res.status(401).json({ msg: 'Token is not valid' }); }
        } }
    }
    next();
};

// What others may see about a worker. No GPS location or call details ever;
// the phone number only for logged-in employers (and the worker themself).
const publicWorker = (w, viewer) => {
    const isSelf = viewer && viewer.id === String(w._id);
    const showPhone = viewer && (viewer.role === 'employer' || isSelf);
    return {
        _id: w._id,
        name: w.name,
        city: w.city,
        skill: w.skill,
        experience: w.experience,
        expectedSalary: w.expectedSalary,
        availability: w.availability,
        rating: w.rating,
        totalRatings: w.totalRatings,
        isLooking: w.isLooking,
        verified: !!w.verified,
        // Reliability: share of finished work vs. reported no-shows, once there are at least 3 of them
        reliability: ((w.jobsDone || 0) + (w.noShows || 0)) >= 3 ? Math.round(100 * (w.jobsDone || 0) / ((w.jobsDone || 0) + (w.noShows || 0))) : null,
        availableUntil: w.availableUntil,
        hiredUntil: w.hiredUntil,
        ...(showPhone ? { phone: w.phone } : {}),
        // Rough area name for employers ("CIDCO N-5"); never the GPS position
        ...(showPhone ? { area: (nearestArea(w.location) || {}).name || null } : {})
    };
};
// Numbers from the query string, kept inside sensible limits (anything else is ignored)
const num = (v, lo, hi) => { const n = Number(v); return typeof v === 'string' && v !== '' && Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const availableNow = (w) => !!(w.isLooking && w.availableUntil > new Date() && !w.hiredUntil && !w.isWithdrawn);

// Workers employers may find: looking for work, not booked, not hidden
const visibleNow = () => ({
    isLooking: true,
    availableUntil: { $gt: new Date() },
    hiredUntil: null,
    isWithdrawn: { $ne: true }
});

const autoExpireAvailability = async () => {
    try {
        const now = new Date();
        // Expire isLooking
        await Worker.updateMany(
            { isLooking: true, availableUntil: { $lt: now } },
            { $set: { isLooking: false, availableUntil: null } }
        );
        // Expire hiredUntil
        await Worker.updateMany(
            { hiredUntil: { $lt: now, $ne: null } },
            { $set: { hiredUntil: null, hiredBy: null } }
        );
        // Bookings made earlier for today start now
        await activateTodaysBookings();
    } catch (err) {
        console.error('Auto-expire failed:', err.message);
    }
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    await autoExpireAvailability();
    const query = visibleNow();
    // Plain strings only (never objects/operators)
    if (typeof req.query.city === 'string' && req.query.city) query.city = req.query.city;
    if (typeof req.query.skill === 'string' && req.query.skill) query.skill = req.query.skill;
    // Filters: daily wage range, minimum rating, minimum experience, distance from a point
    const minWage = num(req.query.minWage, 0, 100000), maxWage = num(req.query.maxWage, 0, 100000);
    if (minWage !== null || maxWage !== null) query.expectedSalary = { ...(minWage !== null ? { $gte: minWage } : {}), ...(maxWage !== null ? { $lte: maxWage } : {}) };
    const minRating = num(req.query.minRating, 0, 5); if (minRating) query.rating = { $gte: minRating };
    const minExp = num(req.query.minExp, 0, 60); if (minExp) query.experience = { $gte: minExp };
    const lat = num(req.query.lat, -90, 90), lng = num(req.query.lng, -180, 180), radius = num(req.query.radiusKm, 0.5, 50);
    const here = (lat !== null ? lng !== null : false) ? [lng, lat] : null;
    if (here) { if (radius) query.location = { $geoWithin: { $centerSphere: [here, radius / 6378.1] } }; }
    if (req.user ? req.user.role === 'employer' : false) {
      const me = await Employer.findById(req.user.id).select('blocked');
      query._id = { $nin: (me ? me.blocked || [] : []) };
      query.blocked = { $ne: req.user.id };
    }
    const sortBy = { wage: { expectedSalary: 1, rating: -1 }, experience: { experience: -1, rating: -1 } }[req.query.sort] || { rating: -1, createdAt: -1 };
    const workers = await Worker.find(query).sort(sortBy).limit(200);
    let list = workers.map(w => {
        const pw = publicWorker(w, req.user);
        if (here) { if (hasPoint(w.location)) pw.distanceKm = roughKm(km(here, w.location.coordinates)); }
        return pw;
    });
    if (req.query.sort === 'distance') list = list.sort((a, b) => (a.distanceKm == null ? 999 : a.distanceKm) - (b.distanceKm == null ? 999 : b.distanceKm));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    await autoExpireAvailability();
    const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ msg: 'Coordinates required' });
    }
    // 100 m to 50 km (default 10 km)
    const asked = parseInt(req.query.maxDistance, 10);
    const maxDistance = asked > 0 ? Math.min(Math.max(asked, 100), 50000) : 10000;
    const query = {
      ...visibleNow(),
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: maxDistance
        }
      }
    };
    if (typeof req.query.skill === 'string' && req.query.skill) query.skill = req.query.skill;
    const workers = await Worker.find(query).limit(20);
    res.json(workers.map(w => publicWorker(w, req.user)));
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Map view: how many visible workers are near each named area (area centres only, never worker positions)
router.get('/map/areas', optionalAuth, async (req, res) => {
  try {
    await autoExpireAvailability();
    const query = visibleNow();
    if (typeof req.query.skill === 'string' && req.query.skill) query.skill = req.query.skill;
    const workers = await Worker.find(query).select('location skill').limit(1000);
    const counts = {};
    for (const w of workers) { const a = nearestArea(w.location); if (a) counts[a.name] = (counts[a.name] || 0) + 1; }
    res.json(AREAS.filter(a => counts[a.name]).map(a => ({ name: a.name, lat: a.lat, lng: a.lng, count: counts[a.name] })));
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// Saved ("favourite") workers of the logged-in employer
router.get('/favorites/mine', auth, requireRole('employer'), async (req, res) => {
  try {
    const e = await Employer.findById(req.user.id).select('favorites');
    if (!e) return res.status(404).json({ msg: 'Employer not found' });
    const workers = await Worker.find({ _id: { $in: e.favorites || [] } });
    res.json(workers.map(w => ({ ...publicWorker(w, req.user), availableNow: availableNow(w) })));
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});
router.put('/:id/favorite', auth, requireRole('employer'), async (req, res) => {
  try {
    if (!(await Worker.exists({ _id: req.params.id }))) return res.status(404).json({ msg: 'Worker not found' });
    const e = await Employer.findById(req.user.id).select('favorites');
    if (!e) return res.status(404).json({ msg: 'Employer not found' });
    const already = (e.favorites || []).some(f => String(f) === req.params.id);
    if (!already) { if ((e.favorites || []).length >= 100) return res.status(400).json({ msg: 'You can save up to 100 workers' }); }
    await Employer.updateOne({ _id: req.user.id }, { $addToSet: { favorites: req.params.id } });
    res.json({ ok: true, saved: true });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});
router.delete('/:id/favorite', auth, requireRole('employer'), async (req, res) => {
  try {
    await Employer.updateOne({ _id: req.user.id }, { $pull: { favorites: req.params.id } });
    res.json({ ok: true, saved: false });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});
// Workers this employer booked most recently (up to 10, newest first)
router.get('/recent/mine', auth, requireRole('employer'), async (req, res) => {
  try {
    const calls = await Call.find({ callerId: req.user.id, callType: 'assign' }).sort({ timestamp: -1 }).limit(60).select('receiverId');
    const ids = [];
    for (const c of calls) { const id = String(c.receiverId); if (!ids.includes(id)) { if (ids.length < 10) ids.push(id); } }
    const workers = await Worker.find({ _id: { $in: ids } });
    const byId = Object.fromEntries(workers.map(w => [String(w._id), w]));
    res.json(ids.filter(id => byId[id]).map(id => ({ ...publicWorker(byId[id], req.user), availableNow: availableNow(byId[id]) })));
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET /api/workers/phone/:phone - employer's "search by phone" (logged-in employers only)
router.get('/phone/:phone', auth, requireRole('employer'), async (req, res) => {
  try {
    await autoExpireAvailability();
    const phone = normalizePhone(req.params.phone);
    if (!isPhone(phone)) return res.status(400).json({ msg: 'Enter a 10-digit phone number' });
    const worker = await Worker.findOne({
        phone,
        hiredUntil: null,
        isWithdrawn: { $ne: true }
    });
    if (!worker) return res.status(404).json({ exists: false, msg: 'No available worker found.' });
    res.json({ exists: true, worker: publicWorker(worker, req.user) });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// Returns a valid Date for value, or null if it is missing/unparseable
const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
};

router.put('/:id/go-live', auth, requireRole('worker'), requireSelf(), async (req, res) => {
    try {
        const availableUntil = parseDate(req.body.availableUntil);
        if (!availableUntil) return res.status(400).json({ msg: 'Valid availableUntil date is required' });
        // Live for a few hours at a time (the website uses 4 h; at most 24 h)
        const ms = availableUntil - Date.now();
        if (!(ms > 0 && ms <= 24 * 3600 * 1000 + 60000)) return res.status(400).json({ msg: 'You can go live for up to 24 hours' });
        await activateTodaysBookings();
        const me = await Worker.findById(req.params.id).select('hiredUntil');
        if (me) { if (me.hiredUntil > new Date()) return res.status(409).json({ msg: 'You are booked today. You can go live again after this booking.' }); }
        // Going live means the worker wants work again, so show them in search.
        // With a location, "Find nearest worker" can find them too.
        const update = { isLooking: true, availableUntil, isWithdrawn: false };
        const loc = parseLocation(req.body.location);
        if (loc) update.location = toPoint(loc);
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true }
        ).select('-password');
        if (!worker) return res.status(404).json({ msg: 'Worker not found' });
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.put('/:id/go-offline', auth, requireRole('worker'), requireSelf(), async (req, res) => {
    try {
        // Chose to be offline: an ending booking must not put them back live
        await Call.updateMany({ receiverId: req.params.id, 'assignmentData.date': istDate(0) }, { $unset: { 'assignmentData.prevAvailableUntil': 1 } });
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { isLooking: false, availableUntil: null },
            { new: true }
        ).select('-password');
        if (!worker) return res.status(404).json({ msg: 'Worker not found' });
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT /api/workers/:id/withdraw - worker removes themselves from search results (reversible)
router.put('/:id/withdraw', auth, requireRole('worker'), requireSelf(), async (req, res) => {
    try {
        await Call.updateMany({ receiverId: req.params.id, 'assignmentData.date': istDate(0) }, { $unset: { 'assignmentData.prevAvailableUntil': 1 } });
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { isWithdrawn: true, isLooking: false, availableUntil: null },
            { new: true }
        ).select('-password');
        if (!worker) return res.status(404).json({ msg: 'Worker not found' });
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT /api/workers/:id/rejoin - worker shows up in search results again
router.put('/:id/rejoin', auth, requireRole('worker'), requireSelf(), async (req, res) => {
    try {
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { isWithdrawn: false },
            { new: true }
        ).select('-password');
        if (!worker) return res.status(404).json({ msg: 'Worker not found' });
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// PUT /:id/hire (book until any date) was removed: it let an employer hide a worker
// for years. Bookings go through POST /api/calls/assign-job (one day, max 14 days ahead).
router.put('/:id/hire', auth, (req, res) => {
    res.status(410).json({ msg: 'Use the HIRE NOW button (POST /api/calls/assign-job)' });
});

// Only the employer who hired the worker can release them (cancels today's booking)
router.put('/:id/release', auth, requireRole('employer'), async (req, res) => {
    try {
        const target = await Worker.findById(req.params.id).select('hiredBy');
        if (!target) return res.status(404).json({ msg: 'Worker not found' });
        if (String(target.hiredBy) !== req.user.id) return res.status(403).json({ msg: 'Only the employer who hired this worker can release them' });
        const todays = await Call.find({ receiverId: req.params.id, callerId: req.user.id, callType: 'assign', 'assignmentData.date': istDate(0), 'assignmentData.workerResponse': ACTIVE });
        for (const c of todays) {
            if (await require('../models/Review').exists({ hireId: c._id })) continue;
            c.assignmentData.workerResponse = 'cancelled';
            c.assignmentData.activeKey = undefined;
            await c.save();
            await freeWorkerFromBooking(c);
        }
        await Worker.updateOne({ _id: req.params.id, hiredBy: req.user.id }, { $set: { hiredUntil: null, hiredBy: null } });
        const worker = await Worker.findById(req.params.id);
        res.json(publicWorker(worker, req.user));
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Past jobs for the "Previous jobs" view: type, city and dates only (no employer or pay)
router.get('/:id/jobs', async (req, res) => {
    try {
        const w = await Worker.findById(req.params.id).select('isWithdrawn');
        if (!w) return res.status(404).json({ msg: 'Worker not found' });
        if (w.isWithdrawn) return res.status(404).json({ msg: 'Worker not found' });
        const jobs = await Job.find({ workerId: req.params.id })
            .select('jobType city status acceptedAt completedAt')
            .sort({ completedAt: -1 })
            .limit(50);
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Is this phone number registered? (yes/no only, no profile)
router.get('/check/:phone', async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    if (!isPhone(phone)) return res.status(400).json({ msg: 'Enter a 10-digit phone number' });
    const exists = await Worker.exists({ phone });
    if (!exists) return res.status(404).json({ exists: false, msg: 'Worker not found' });
    res.json({ exists: true });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// A worker's own full profile (with their token), or the public card of a
// worker who has not hidden themselves
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const isSelf = req.user ? req.user.id === req.params.id : false;
    const worker = await Worker.findById(req.params.id).select('-password');
    if (!worker) return res.status(404).json({ msg: 'Worker not found' });
    if (isSelf) return res.json(worker);
    if (worker.isWithdrawn) return res.status(404).json({ msg: 'Worker not found' });
    res.json(publicWorker(worker, req.user));
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
