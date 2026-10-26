// WEB VERSION - FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireRole, requireSelf } = require('../middleware/roles');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

// TODO BEFORE PRODUCTION:
// 1. Workers only see worker dashboard
// 2. Employers only see employer dashboard
// 3. Remove testing mode banner
// (User type checks and the self-hire block are back: only a worker can change
//  their own availability, and only employers can hire or release.)

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
            { $set: { hiredUntil: null } }
        );
    } catch (err) {
        console.error('Auto-expire failed:', err.message);
    }
};

router.get('/', async (req, res) => {
  try {
    await autoExpireAvailability();
    const { city, skill } = req.query;
    let query = {
        isLooking: true,
        availableUntil: { $gt: new Date() },
        hiredUntil: null,
        isWithdrawn: { $ne: true }
    };
    if (city) query.city = city;
    if (skill) query.skill = skill;
    const workers = await Worker.find(query).sort({ rating: -1, createdAt: -1 }).select('-password');
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    await autoExpireAvailability();
    const { lat, lng, skill, maxDistance } = req.query;
    if (!lat || !lng) return res.status(400).json({ msg: 'Coordinates required' });
    let query = {
      isLooking: true,
      availableUntil: { $gt: new Date() },
      hiredUntil: null,
      isWithdrawn: { $ne: true },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance) || 10000 
        }
      }
    };
    if (skill) query.skill = skill;
    const workers = await Worker.find(query).limit(20).select('-password');
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/phone/:phone', async (req, res) => {
  try {
    await autoExpireAvailability();
    const worker = await Worker.findOne({ 
        phone: req.params.phone,
        hiredUntil: null,
        isWithdrawn: { $ne: true }
    }).select('-password');
    if (!worker) return res.status(404).json({ msg: 'No available worker found.' });
    res.json(worker);
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
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ msg: 'Invalid worker id' });
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
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ msg: 'Invalid worker id' });
        const hiredUntil = parseDate(req.body.hiredUntil);
        if (!hiredUntil) return res.status(400).json({ msg: 'Valid hiredUntil date is required' });
        const target = await Worker.findById(req.params.id).select('isWithdrawn');
        if (target && target.isWithdrawn) return res.status(409).json({ msg: 'This worker is not available' });
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { hiredUntil, isLooking: false, availableUntil: null },
            { new: true }
        ).select('-password');
        if (!worker) return res.status(404).json({ msg: 'Worker not found' });
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.put('/:id/release', auth, requireRole('employer'), async (req, res) => {
    try {
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { hiredUntil: null },
            { new: true }
        ).select('-password');
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.get('/:id/jobs', async (req, res) => {
    try {
        const jobs = await Job.find({ workerId: req.params.id }).sort({ date: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.get('/check/:phone', async (req, res) => {
  try {
    const worker = await Worker.findOne({ phone: req.params.phone }).select('-password');
    if (!worker) return res.status(404).json({ exists: false, msg: 'Worker not found' });
    res.json({ exists: true, worker });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).select('-password');
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
