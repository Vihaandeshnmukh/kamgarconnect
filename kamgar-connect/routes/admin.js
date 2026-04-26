// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');

// GET /api/admin/data
router.get('/data', async (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    const employers = await Employer.find().sort({ createdAt: -1 });
    res.json({ workers, employers });
  } catch (err) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;

