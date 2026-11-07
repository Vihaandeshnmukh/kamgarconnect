// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
//
// Hire bookings from the website's HIRE button (the path keeps its old name so the
// website and app don't change). Phone calls are paused for the MVP: booking a
// worker no longer rings them. The full calling system is archived on the git
// branch archive/voice-system (tag voice-system-v1).
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const Call = require('../models/Call');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const { cleanText, cleanName } = require('../utils/sanitize');
const { ACTIVE, istDate, endOfDay, bookingDateError, activeKey } = require('../utils/bookings');

// One employer may book at most this many workers for one day (stops emptying the list)
const MAX_BOOKINGS_PER_DAY = 10;

/* ═══════════════════════════════════════════
   POST /api/calls/assign-job
   Employer books a worker for one day (today or up to 14 days ahead).
   One booking per worker per day. On the work day the worker is taken off the
   search list; a booking for a later day does not hide them before that.
   ═══════════════════════════════════════════ */
router.post('/assign-job', auth, requireRole('employer'), async (req, res) => {
  try {
    const { workerId, location, date, time } = req.body;
    if (!workerId || !location || !date || !time) {
      return res.status(400).json({ success: false, msg: 'workerId, location, date and time are required' });
    }
    if (!mongoose.isValidObjectId(workerId)) {
      return res.status(400).json({ success: false, msg: 'Invalid worker id' });
    }
    if (typeof location !== 'string' || typeof date !== 'string' || typeof time !== 'string') {
      return res.status(400).json({ success: false, msg: 'Location, date and time must be text' });
    }
    if (!cleanText(location, 120)) return res.status(400).json({ success: false, msg: 'Please enter the job location' });
    const dateError = bookingDateError(date, time);
    if (dateError) return res.status(400).json({ success: false, msg: dateError });

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ success: false, msg: 'Worker not found' });
    if (worker.isWithdrawn) return res.status(409).json({ success: false, msg: 'This worker is not available' });

    const employer = await Employer.findById(req.user.id);
    // Same phone has both accounts: you can't hire yourself
    if (employer) { if (employer.phone === worker.phone) return res.status(400).json({ success: false, msg: "You can't hire yourself" }); }

    // One booking per worker per day (also stops double clicks making two bookings)
    const sameDay = await Call.findOne({ receiverId: worker._id, callType: 'assign', 'assignmentData.date': date, 'assignmentData.workerResponse': ACTIVE });
    if (sameDay) {
      const mine = String(sameDay.callerId) === req.user.id;
      return res.status(409).json({ success: false, msg: mine ? 'You have already booked this worker for that day' : 'This worker is already booked for that day' });
    }
    const isToday = date === istDate(0);
    // Booked today by someone else (older records without a matching booking)
    if (isToday) {
      if (worker.hiredUntil > new Date() && String(worker.hiredBy) !== req.user.id) {
        return res.status(409).json({ success: false, msg: 'This worker is already booked for that day' });
      }
    }
    // The worker sees the employer's real (registered) name, not one typed into the form
    const employerName = employer ? employer.name : 'Employer';
    if (await Call.exists({ receiverId: worker._id, callerId: req.user.id, callType: 'assign', 'assignmentData.date': date, 'assignmentData.workerResponse': 'declined' })) {
      return res.status(409).json({ success: false, msg: 'This worker turned down your booking for that day' });
    }
    if (await Job.exists({ workerId: worker._id, date, status: 'accepted' })) return res.status(409).json({ success: false, msg: 'This worker is already booked for that day' });
    const mineThatDay = await Call.countDocuments({ callerId: req.user.id, callType: 'assign', 'assignmentData.date': date, 'assignmentData.workerResponse': ACTIVE });
    if (mineThatDay >= MAX_BOOKINGS_PER_DAY) return res.status(429).json({ success: false, msg: `You can book at most ${MAX_BOOKINGS_PER_DAY} workers for one day` });

    // The hire record (reviews for website hires refer to it); the unique activeKey makes a
    // second booking for the same worker and day fail even when both arrive at once
    const wasLive = worker.isLooking ? worker.availableUntil > new Date() : false;
    let hire;
    try { hire = await new Call({
      callerId: req.user.id,
      receiverId: worker._id,
      callerType: 'employer',
      callType: 'assign',
      status: 'completed',
      assignmentData: {
        location: cleanText(location, 120),
        date,
        time: cleanText(time, 20),
        employerName,
        instructions: typeof req.body.instructions === 'string' ? cleanText(req.body.instructions, 300) : '',
        workerResponse: 'pending',
        activeKey: activeKey(worker._id, date),
        ...(isToday ? (wasLive ? { prevAvailableUntil: worker.availableUntil } : {}) : {})
      }
    }).save(); } catch (e) {
      if (e.code === 11000) return res.status(409).json({ success: false, msg: 'This worker is already booked for that day' });
      throw e;
    }
    // Requests sent at the same moment can all pass the count above: re-check and undo this one if over
    const nowThatDay = await Call.countDocuments({ callerId: req.user.id, callType: 'assign', 'assignmentData.date': date, 'assignmentData.workerResponse': ACTIVE });
    if (nowThatDay > MAX_BOOKINGS_PER_DAY) {
      await Call.deleteOne({ _id: hire._id });
      return res.status(429).json({ success: false, msg: `You can book at most ${MAX_BOOKINGS_PER_DAY} workers for one day` });
    }

    // Work is today: off the search list until the end of the day (nobody else can book them)
    if (isToday) {
      await Worker.findByIdAndUpdate(worker._id, {
        hiredUntil: endOfDay(date),
        hiredBy: req.user.id,
        isLooking: false,
        availableUntil: null
      });
    }

    // The employer gets the worker's number to contact them directly
    res.json({ success: true, msg: 'Worker booked', callRecordId: hire._id, phone: worker.phone });
  } catch (err) {
    console.error('Assign-job error:', err.message);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

/* ═══════════════════════════════════════════
   GET /api/calls/history/:workerId
   Hire history for a worker: the worker sees their own,
   an employer sees only their own hires of that worker
   ═══════════════════════════════════════════ */
router.get('/history/:workerId', auth, async (req, res) => {
  try {
    const { workerId } = req.params;
    if (!mongoose.isValidObjectId(workerId)) return res.status(400).json({ msg: 'Invalid worker id' });
    const filter = { receiverId: workerId };
    if (req.user.role === 'employer') filter.callerId = req.user.id;
    else if (req.user.id !== workerId) return res.status(403).json({ msg: 'Not authorized' });

    const calls = await Call.find(filter).sort({ timestamp: -1 }).limit(50);

    res.json(calls);
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
