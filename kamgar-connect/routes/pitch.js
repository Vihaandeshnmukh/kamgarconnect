// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');

// POST /api/register/worker
router.post('/worker', async (req, res) => {
  try {
    const { name, phone, city, skill, experience, expectedSalary, availabilityDays } = req.body;
    
    // Validate phone
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ msg: 'Please enter a valid 10-digit phone number.' });
    }

    const worker = new Worker({
      name,
      phone,
      city,
      skill,
      experience,
      expectedSalary,
      availabilityDays
    });

    await worker.save();
    res.status(201).json({ msg: 'Success', workerId: worker._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Phone number already registered.' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
});

// POST /api/register/employer
router.post('/employer', async (req, res) => {
  try {
    const { name, companyName, phone, city, workerType, workerCount } = req.body;

    // Validate phone
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ msg: 'Please enter a valid 10-digit phone number.' });
    }

    const employer = new Employer({
      name,
      companyName,
      phone,
      city,
      workerType,
      workerCount
    });

    await employer.save();
    res.status(201).json({ msg: 'Success', employerId: employer._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'Phone number already registered.' });
    }
    res.status(500).json({ msg: 'Server Error' });
  }
});

// GET /api/admin/data
router.get('/admin-data', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  try {
    const workers = await Worker.find().sort({ rating: -1, createdAt: -1 });
    const employers = await Employer.find().sort({ createdAt: -1 });
    res.json({ workers, employers });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;

