// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const adminAuth = require('../middleware/adminAuth');
const { cleanName, isValidName, normalizePhone, isPhone, CITIES, SKILLS } = require('../utils/sanitize');

// Same checks as the main sign-up form; returns an error message or null
function signupError({ name, phone, city }) {
  if (!isValidName(cleanName(name))) return 'Please enter your name (letters only).';
  if (!isPhone(phone)) return 'Please enter a valid 10-digit phone number.';
  if (!CITIES.includes(city)) return 'Please select your city.';
  return null;
}

// POST /api/register/worker
router.post('/worker', async (req, res) => {
  try {
    const { name, city, skill } = req.body;
    const phone = normalizePhone(req.body.phone);
    const experience = Number(req.body.experience) || 0;
    const expectedSalary = Number(req.body.expectedSalary) || undefined;

    const invalid = signupError({ name, phone, city }) ||
      (!SKILLS.includes(skill) ? 'Please select your skill.' : null) ||
      (experience < 0 || experience > 60 ? 'Experience must be 0-60 years.' : null) ||
      (expectedSalary !== undefined && (expectedSalary < 100 || expectedSalary > 5000) ? 'Daily wage must be between 100 and 5000.' : null);
    if (invalid) return res.status(400).json({ msg: invalid });

    const worker = new Worker({
      name,
      phone,
      city,
      skill,
      experience,
      expectedSalary,
      // Registering means they want work: shown to employers for 24 hours
      isLooking: true,
      availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
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
    const { name, companyName, city, workerType } = req.body;
    const phone = normalizePhone(req.body.phone);
    const workerCount = Number(req.body.workerCount) || undefined;

    const invalid = signupError({ name, phone, city }) ||
      (workerType && !SKILLS.includes(workerType) ? 'Please select a worker type.' : null) ||
      (workerCount !== undefined && (workerCount < 1 || workerCount > 500) ? 'Number of workers must be 1-500.' : null);
    if (invalid) return res.status(400).json({ msg: invalid });

    const employer = new Employer({
      name,
      companyName,
      phone,
      city,
      workerType: workerType || undefined,
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
router.get('/admin-data', adminAuth, async (req, res) => {
  try {
    const workers = await Worker.find().select('+aadhaar').sort({ rating: -1, createdAt: -1 });
    const employers = await Employer.find().sort({ createdAt: -1 });
    res.json({ workers, employers });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;

