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
const { ACTIVE, istDate } = require('../utils/bookings');

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
    // Exactly one of jobId / hireId, and it must be a real id
    const given = (v) => v !== undefined && v !== null && v !== '';
    const byJob = given(jobId);
    if (byJob ? !mongoose.isValidObjectId(jobId) : !(given(hireId) && mongoose.isValidObjectId(hireId))) {
      return res.status(400).json({ success: false, msg: 'Which job is this review for?' });
    }

    let worked = null;
    if (byJob) {
      worked = await Job.findOne({ _id: jobId, employerId: req.user.id, workerId, status: 'completed' });
    } else {
      // A website booking counts once its work day has come (not before), unless it was turned down or cancelled
      worked = await Call.findOne({ _id: hireId, callerId: req.user.id, receiverId: workerId, callType: 'assign',
        'assignmentData.workerResponse': ACTIVE, 'assignmentData.date': { $lte: istDate(0) } });
    }
    if (!worked) {
      return res.status(403).json({ success: false, msg: 'You can rate a worker on or after the day they worked for you' });
    }
    const already = await Review.exists(byJob ? { jobId } : { hireId });
    if (already) return res.status(409).json({ success: false, msg: 'This job has already been rated' });

    const review = new Review({
      workerId,
      jobId: byJob ? jobId : undefined,
      hireId: byJob ? undefined : hireId,
      employerId: req.user.id,
      rating: Number(rating),
      tags: Array.isArray(tags) ? tags.slice(0, 6).map(t => cleanText(t, 30)) : [],
      comment: cleanText(comment || '', 500)
    });
    
    await review.save();

    // Worker rating = average of each employer's LATEST rating, so one employer who books
    // the same worker many times can't push the rating up or down on their own
    const perEmployer = await Review.aggregate([
      { $match: { workerId: new mongoose.Types.ObjectId(String(workerId)) } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: { $ifNull: ['$employerId', '$_id'] }, rating: { $first: '$rating' } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }
    ]);
    const agg = perEmployer[0] || { avg: 0, n: 0 };
    await Worker.updateOne({ _id: workerId }, { $set: { rating: agg.avg, totalRatings: agg.n } });

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

