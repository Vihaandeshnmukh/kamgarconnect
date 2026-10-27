// WEB VERSION - FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { requireRole, requireSelf } = require('../middleware/roles');
const { normalizePhone, isPhone } = require('../utils/sanitize');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

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

// Reads the login token if there is one; public routes still work without it
const optionalAuth = (req, res, next) => {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
        try { req.user = jwt.verify(token, process.env.JWT_SECRET).user; } catch (err) { /* treat as logged out */ }
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
        availableUntil: w.availableUntil,
        hiredUntil: w.hiredUntil,
        ...(showPhone ? { phone: w.phone } : {})
    };
};

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
    const workers = await Worker.find(query).sort({ rating: -1, createdAt: -1 }).limit(200);
    res.json(workers.map(w => publicWorker(w, req.user)));
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
    const maxDistance = Math.min(parseInt(req.query.maxDistance, 10) || 10000, 50000);
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
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            // Going live means the worker wants work again, so show them in search
            { isLooking: true, availableUntil, isWithdrawn: false },
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

router.put('/:id/hire', auth, requireRole('employer'), async (req, res) => {
    try {
        const hiredUntil = parseDate(req.body.hiredUntil);
        if (!hiredUntil) return res.status(400).json({ msg: 'Valid hiredUntil date is required' });
        const target = await Worker.findById(req.params.id).select('isWithdrawn hiredUntil hiredBy');
        if (!target) return res.status(404).json({ msg: 'Worker not found' });
        if (target.isWithdrawn) return res.status(409).json({ msg: 'This worker is not available' });
        // Already booked by someone else: no double-hire
        if (target.hiredUntil > new Date() && String(target.hiredBy) !== req.user.id) {
            return res.status(409).json({ msg: 'This worker is already hired' });
        }
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { hiredUntil, hiredBy: req.user.id, isLooking: false, availableUntil: null },
            { new: true }
        );
        res.json(publicWorker(worker, req.user));
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Only the employer who hired the worker can release them
router.put('/:id/release', auth, requireRole('employer'), async (req, res) => {
    try {
        const target = await Worker.findById(req.params.id).select('hiredBy');
        if (!target) return res.status(404).json({ msg: 'Worker not found' });
        if (String(target.hiredBy) !== req.user.id) return res.status(403).json({ msg: 'Only the employer who hired this worker can release them' });
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { hiredUntil: null, hiredBy: null },
            { new: true }
        );
        res.json(publicWorker(worker, req.user));
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Past jobs for the "Previous jobs" view: type, city and dates only (no employer or pay)
router.get('/:id/jobs', async (req, res) => {
    try {
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
