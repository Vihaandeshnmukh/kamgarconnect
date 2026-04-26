// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const Worker = require('../models/Worker');
const Employer = require('../models/Employer');

// POST /api/auth/register-worker
router.post('/register-worker', [
  body('name', 'Name is required').notEmpty(),
  body('phone', 'Please include a valid phone number').isLength({ min: 10 }),
  body('city', 'City is required').notEmpty(),
  body('skill', 'Skill is required').notEmpty(),
  body('aadhaar', 'Valid Aadhaar is required').isLength({ min: 12 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, phone, city, skill, experience, aadhaar } = req.body;

  try {
    let worker = await Worker.findOne({ phone });
    if (worker) return res.status(400).json({ msg: 'User already exists' });

    worker = new Worker({ name, phone, city, skill, experience, aadhaar });
    const salt = await bcrypt.genSalt(10);
    worker.password = await bcrypt.hash(phone, salt);

    await worker.save();

    const payload = { user: { id: worker.id, role: 'worker' } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5 days' }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, user: { id: worker.id, name: worker.name, role: 'worker' } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/auth/register-employer
router.post('/register-employer', [
  body('name', 'Name is required').notEmpty(),
  body('phone', 'Please include a valid phone number').isLength({ min: 10 }),
  body('city', 'City is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, phone, city, companyName } = req.body;

  try {
    let employer = await Employer.findOne({ phone });
    if (employer) return res.status(400).json({ msg: 'User already exists' });

    employer = new Employer({ name, phone, city, companyName });
    const salt = await bcrypt.genSalt(10);
    employer.password = await bcrypt.hash(phone, salt);

    await employer.save();

    const payload = { user: { id: employer.id, role: 'employer' } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5 days' }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, user: { id: employer.id, name: employer.name, role: 'employer' } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('phone', 'Please include a valid phone number').isLength({ min: 10 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phone } = req.body;

  try {
    let user = await Worker.findOne({ phone });
    let role = 'worker';
    
    if (!user) {
      user = await Employer.findOne({ phone });
      role = 'employer';
    }

    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(phone, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = { user: { id: user.id, role } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5 days' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, name: user.name, role } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

