// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Call = require('../models/Call');
const mongoose = require('mongoose');
const { cleanText } = require('../utils/sanitize');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// POST /api/reviews - only an employer who really worked with this worker:
// either a completed job (jobId) or a website hire the worker did not turn down (hireId).
// One review per job / hire; the reviewer is taken from the token.
router.post('/', auth, requireRole('employer'), async (req, res) => {
  try {
    const { workerId, jobId, hireId, rating, tags, comment } = req.body;

    if (!mongoose.isValidObjectId(workerId) || !rating) {
      return res.status(400).json({ success: false, msg: 'Worker ID and rating are required' });
    }
    if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ success: false, msg: 'Rating must be between 1 and 5' });
    }
    if (!mongoose.isValidObjectId(jobId) && !mongoose.isValidObjectId(hireId)) {
      return res.status(400).json({ success: false, msg: 'Which job is this review for?' });
    }

    let worked = null;
    if (mongoose.isValidObjectId(jobId)) {
      worked = await Job.findOne({ _id: jobId, employerId: req.user.id, workerId, status: 'completed' });
    } else {
      worked = await Call.findOne({ _id: hireId, callerId: req.user.id, receiverId: workerId, callType: 'assign', 'assignmentData.workerResponse': { $ne: 'declined' } });
    }
    if (!worked) {
      return res.status(403).json({ success: false, msg: 'You can only rate a worker after a finished job with them' });
    }
    const already = await Review.exists(jobId ? { jobId } : { hireId });
    if (already) return res.status(409).json({ success: false, msg: 'This job has already been rated' });

    const review = new Review({
      workerId,
      jobId: jobId || undefined,
      hireId: jobId ? undefined : hireId,
      employerId: req.user.id,
      rating: Number(rating),
      tags: Array.isArray(tags) ? tags.slice(0, 6).map(t => cleanText(t, 30)) : [],
      comment: cleanText(comment || '', 500)
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
    if (!mongoose.isValidObjectId(req.params.workerId)) return res.status(400).json({ success: false, msg: 'Invalid worker id' });
    const reviews = await Review.find({ workerId: req.params.workerId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error('Fetch Reviews Error:', err.message);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
});

module.exports = router;

