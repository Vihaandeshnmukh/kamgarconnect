// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Worker = require('../models/Worker');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// POST /api/reviews - only logged-in employers; the reviewer is taken from the token
router.post('/', auth, requireRole('employer'), async (req, res) => {
  try {
    const { workerId, jobId, rating, tags, comment } = req.body;

    if (!workerId || !rating) {
      return res.status(400).json({ success: false, msg: 'Worker ID and rating are required' });
    }
    if (!(Number(rating) >= 1 && Number(rating) <= 5)) {
      return res.status(400).json({ success: false, msg: 'Rating must be between 1 and 5' });
    }

    const review = new Review({
      workerId,
      jobId,
      employerId: req.user.id,
      rating,
      tags,
      comment
    });
    
    await review.save();

    // Update worker rating
    const worker = await Worker.findById(workerId);
    if (worker) {
      const currentTotal = worker.totalRatings || 0;
      const currentAvg = worker.rating || 0;
      
      const newTotal = currentTotal + 1;
      const newRating = ((currentAvg * currentTotal) + Number(rating)) / newTotal;
      
      worker.rating = newRating;
      worker.totalRatings = newTotal;
      await worker.save();
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error('Review Save Error:', err.message);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

// GET /api/reviews/worker/:workerId
router.get('/worker/:workerId', async (req, res) => {
  try {
    const reviews = await Review.find({ workerId: req.params.workerId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error('Fetch Reviews Error:', err.message);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

module.exports = router;

