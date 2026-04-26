// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Job = require('../models/Job');

router.get('/public', async (req, res) => {
  try {
    const [
      total_workers,
      total_employers,
      total_jobs_posted,
      total_jobs_completed,
      cities_covered,
      skills_available
    ] = await Promise.all([
      Worker.countDocuments(),
      Employer.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ status: 'completed' }),
      Worker.distinct('city'),
      Worker.distinct('skill')
    ]);

    res.json({
      total_workers,
      total_employers,
      total_jobs_posted,
      total_jobs_completed,
      cities_covered,
      skills_available,
      last_updated: new Date()
    });
  } catch (err) {
    console.error('Error fetching public stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

