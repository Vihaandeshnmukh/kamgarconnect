// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('../middleware/rateLimit');
const { verifyGoogleCredential } = require('../utils/googleAuth');

const Worker = require('../models/Worker');
const Employer = require('../models/Employer');

// Slow down phone-number guessing on register/login.
// Kept generous because many mobile users in India share one carrier IP.
router.use(rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 40, message: 'Too many attempts. Please try again in a few minutes.' }));

// Signs a 5-day JWT for this user
const issueToken = (user, role) => new Promise((resolve, reject) => {
  jwt.sign({ user: { id: user.id, role } }, process.env.JWT_SECRET, { expiresIn: '5 days' }, (err, token) => {
    if (err) reject(err); else resolve(token);
  });
});

// The fields the website and app need about the logged-in user
const publicUser = (user, role) => ({
  id: user.id,
  name: user.name,
  role,
  phone: user.phone,
  city: user.city,
  skill: role === 'worker' ? user.skill : user.workerType
});

// POST /api/auth/register-worker
router.post('/register-worker', [
  body('name', 'Name is required').notEmpty(),
  body('phone', 'Please include a valid phone number').isLength({ min: 10 }),
  body('city', 'City is required').notEmpty(),
  body('skill', 'Skill is required').notEmpty(),
  body('aadhaar', 'Aadhaar must be 12 digits').optional({ values: 'falsy' }).matches(/^\d{12}$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, phone, city, skill, experience, aadhaar, availability } = req.body;
  // The website sends `salary`, the app sends `expectedSalary`
  const expectedSalary = req.body.expectedSalary ?? req.body.salary;

  try {
    let worker = await Worker.findOne({ phone });
    if (worker) return res.status(400).json({ msg: 'User already exists' });

    worker = new Worker({
      name, phone, city, skill,
      experience: Number(experience) || 0,
      expectedSalary: Number(expectedSalary) || undefined,
      availability: Array.isArray(availability) ? availability.map(String) : undefined,
      aadhaar: aadhaar || undefined
    });
    // Signed up after "Sign in with Google": link that Google account for one-tap login
    const google = await verifyGoogleCredential(req.body.googleCredential);
    if (google) { worker.googleId = google.googleId; worker.email = google.email; }

    const salt = await bcrypt.genSalt(10);
    worker.password = await bcrypt.hash(phone, salt);

    await worker.save();

    const token = await issueToken(worker, 'worker');
    res.status(201).json({ token, user: publicUser(worker, 'worker') });
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
  // The website sends workerTypeNeeded / workerCountNeeded
  const workerType = req.body.workerType ?? req.body.workerTypeNeeded;
  const workerCount = req.body.workerCount ?? req.body.workerCountNeeded;

  try {
    let employer = await Employer.findOne({ phone });
    if (employer) return res.status(400).json({ msg: 'User already exists' });

    employer = new Employer({
      name, phone, city, companyName,
      workerType: workerType || undefined,
      workerCount: Number(workerCount) || undefined
    });
    const google = await verifyGoogleCredential(req.body.googleCredential);
    if (google) { employer.googleId = google.googleId; employer.email = google.email; }

    const salt = await bcrypt.genSalt(10);
    employer.password = await bcrypt.hash(phone, salt);

    await employer.save();

    const token = await issueToken(employer, 'employer');
    res.status(201).json({ token, user: publicUser(employer, 'employer') });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
// NOTE: until OTP verification exists, knowing the phone number is enough to log in
router.post('/login', [
  body('phone', 'Please include a valid phone number').isLength({ min: 10 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phone } = req.body;

  try {
    let user = await Worker.findOne({ phone }).select('+password');
    let role = 'worker';

    if (!user) {
      user = await Employer.findOne({ phone }).select('+password');
      role = 'employer';
    }

    if (!user) return res.status(404).json({ exists: false, msg: 'User not found' });

    // Accounts created by the old pitch form have no password yet
    if (!user.password) {
      user.password = await bcrypt.hash(phone, await bcrypt.genSalt(10));
      await user.save();
    }

    const isMatch = await bcrypt.compare(phone, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const token = await issueToken(user, role);
    res.json({ token, user: publicUser(user, role) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/google-config - the website shows the Google button only when this has a clientId
router.get('/google-config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
});

// POST /api/auth/google - "Sign in with Google"
// Linked account (by Google id, or same email) -> logged in.
// Unknown account -> 404 with the Google name/email so the site can finish sign-up (phone still needed).
router.post('/google', async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ msg: 'Google sign-in is not configured' });
  try {
    const google = await verifyGoogleCredential(req.body.credential);
    if (!google) return res.status(401).json({ msg: 'Google sign-in failed' });

    const find = async (Model) =>
      (await Model.findOne({ googleId: google.googleId }).select('+googleId')) ||
      (await Model.findOne({ email: google.email }).select('+googleId +email'));

    let user = await find(Worker);
    let role = 'worker';
    if (!user) { user = await find(Employer); role = 'employer'; }

    if (!user) return res.status(404).json({ exists: false, profile: { name: google.name, email: google.email } });

    // First Google login on an account matched by email: remember the Google id
    if (!user.googleId) { user.googleId = google.googleId; await user.save(); }

    const token = await issueToken(user, role);
    res.json({ token, user: publicUser(user, role) });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
