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
const { cleanText, cleanName } = require('../utils/sanitize');

// ── Helper: end of the work day (India time) for a "YYYY-MM-DD" hire date, or null ──
function endOfHireDay(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return null;
  const end = new Date(`${date}T23:59:59+05:30`);
  return isNaN(end.getTime()) ? null : end;
}

/* ═══════════════════════════════════════════
   POST /api/calls/assign-job
   Employer hires a worker for a day: the booking is recorded and the worker
   is taken off the search list until the end of that day.
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
    const hiredUntil = endOfHireDay(date);
    if (!hiredUntil || hiredUntil < new Date()) {
      return res.status(400).json({ success: false, msg: 'Please choose today or a future date' });
    }
    if (!/^\d{1,2}:\d{2}/.test(String(time))) {
      return res.status(400).json({ success: false, msg: 'Please choose a reporting time' });
    }

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ success: false, msg: 'Worker not found' });
    if (worker.isWithdrawn) return res.status(409).json({ success: false, msg: 'This worker is not available' });
    // Booked by another employer: no double-hire
    if (worker.hiredUntil > new Date() && String(worker.hiredBy) !== req.user.id) {
      return res.status(409).json({ success: false, msg: 'This worker is already hired' });
    }

    const employer = await Employer.findById(req.user.id);
    const employerName = cleanName(req.body.employerName) || (employer ? employer.name : 'Employer');

    // The hire record (reviews for website hires refer to it)
    const hire = await new Call({
      callerId: req.user.id,
      receiverId: worker._id,
      callerType: 'employer',
      callType: 'assign',
      status: 'completed',
      assignmentData: {
        location: cleanText(location, 120),
        date: cleanText(date, 20),
        time: cleanText(time, 20),
        employerName,
        instructions: cleanText(req.body.instructions || '', 300),
        workerResponse: 'pending'
      }
    }).save();

    // Book the worker for that day (off the search list; nobody else can hire them)
    await Worker.findByIdAndUpdate(worker._id, {
      hiredUntil,
      hiredBy: req.user.id,
      isLooking: false,
      availableUntil: null
    });

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
