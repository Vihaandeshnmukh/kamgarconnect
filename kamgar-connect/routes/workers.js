// WEB VERSION - FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Worker = require('../models/Worker');
const Job = require('../models/Job');

// TODO BEFORE PRODUCTION:
// 1. Add back user type checks
// 2. Workers only see worker dashboard
// 3. Employers only see employer dashboard
// 4. Remove testing mode banner
// 5. Remove self hire capability

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
        hiredUntil: null 
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
        hiredUntil: null
    }).select('-password');
    if (!worker) return res.status(404).json({ msg: 'No available worker found.' });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

router.put('/:id/go-live', async (req, res) => {
    try {
        const { availableUntil } = req.body;
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { isLooking: true, availableUntil: new Date(availableUntil) },
            { new: true }
        ).select('-password');
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.put('/:id/go-offline', async (req, res) => {
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

router.put('/:id/hire', async (req, res) => {
    try {
        const { hiredUntil } = req.body;
        const worker = await Worker.findByIdAndUpdate(
            req.params.id,
            { hiredUntil: new Date(hiredUntil), isLooking: false, availableUntil: null },
            { new: true }
        ).select('-password');
        res.json(worker);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.put('/:id/release', async (req, res) => {
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

router.get('/:id', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).select('-password');
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
