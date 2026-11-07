// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Job = require('../models/Job');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Call = require('../models/Call');
const Review = require('../models/Review');
const { sendPushNotification } = require('../utils/notifications');
const mongoose = require('mongoose');
const { CITIES, SKILLS, cleanText } = require('../utils/sanitize');
const { istDate, isDay } = require('../utils/bookings');

// Every :id must be a real MongoDB id (400 instead of a 500)
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ msg: 'Invalid job id' });
  next();
});

// Checks a new job's fields; returns an error message or null
function jobError({ jobType, city, workerCount, amount, date, location, description }) {
  if (!SKILLS.includes(jobType)) return 'Please choose a worker type';
  if (!CITIES.includes(city)) return 'Please choose a city';
  if (workerCount !== undefined && !(Number.isInteger(Number(workerCount)) && workerCount >= 1 && workerCount <= 500)) return 'Number of workers must be 1-500';
  if (amount !== undefined && amount !== null && amount !== '') {
    const n = typeof amount === 'number' ? amount : (typeof amount === 'string' ? (/^\d+$/.test(amount.trim()) ? Number(amount) : NaN) : NaN);
    if (!(n >= 1 && n <= 100000)) return 'Daily wage must be a number from 1 to 100000';
  }
  // Optional work date: today up to 30 days ahead
  if (date !== undefined && date !== null && date !== '') {
    if (!isDay(date)) return 'Please choose a date';
    if (date < istDate(0)) return 'Please choose today or a future date';
    if (date > istDate(30)) return 'Choose a date within the next 30 days';
  }
  if (location !== undefined && location !== null && typeof location !== 'string') return 'Invalid location';
  if (description !== undefined && description !== null && typeof description !== 'string') return 'Invalid description';
  return null;
}

// The new job's fields from a request body (optional ones only when given)
function jobFields(b) {
  const out = { jobType: b.jobType, city: b.city };
  if (b.workerCount !== undefined) out.workerCount = Number(b.workerCount);
  if (b.amount !== undefined && b.amount !== null && b.amount !== '') out.amount = Number(b.amount);
  if (typeof b.date === 'string' && b.date) out.date = b.date;
  if (typeof b.location === 'string') { const v = cleanText(b.location, 120); if (v) out.location = v; }
  if (typeof b.description === 'string') { const v = cleanText(b.description, 300); if (v) out.description = v; }
  return out;
}

// Open jobs whose work date has not passed (or that have none)
const notPast = () => ({ $or: [{ date: { $exists: false } }, { date: null }, { date: { $gte: istDate(0) } }] });

// What workers browsing open jobs may see (no employer id)
const OPEN_JOB_FIELDS = 'jobType city workerCount amount postedAt status date location description';

// POST /api/jobs - Employer posts a job
router.post('/', auth, async (req, res) => {
  try {
    // Only employers can post jobs
    if (req.user.role !== 'employer') return res.status(403).json({ msg: 'Not authorized' });
    const invalid = jobError(req.body);
    if (invalid) return res.status(400).json({ msg: invalid });

    const job = new Job({ employerId: req.user.id, ...jobFields(req.body) });

    await job.save();

    // Token of a deleted employer account: the job is saved, just not listed on a profile
    await Employer.updateOne({ _id: req.user.id }, { $push: { jobsPosted: job._id } });

    // Emit Socket.IO event to all matching workers in that city
    if (req.io) req.io.to(job.city).emit('new-job', job);

    res.status(201).json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/jobs - your own jobs (employer: posted, worker: accepted)
router.get('/', auth, async (req, res) => {
  try {
    const isEmp = req.user.role === 'employer';
    const filter = isEmp ? { employerId: req.user.id } : { workerId: req.user.id };
    const jobs = (await Job.find(filter).sort({ postedAt: -1 }).limit(100)).map(j => j.toObject());
    // The other side of each job: an employer sees who took it, a worker who posted it
    if (isEmp) {
      const ids = [...new Set(jobs.filter(j => j.workerId).map(j => String(j.workerId)))];
      const ws = await Worker.find({ _id: { $in: ids } }).select('name phone skill rating totalRatings');
      const byId = Object.fromEntries(ws.map(w => [String(w._id), w]));
      const rated = new Set((await Review.find({ jobId: { $in: jobs.map(j => j._id) } }).select('jobId')).map(r => String(r.jobId)));
      return res.json(jobs.map(j => {
        const w = j.workerId ? byId[String(j.workerId)] : null;
        return { ...j, rated: rated.has(String(j._id)), worker: w ? { _id: w._id, name: w.name, phone: w.phone, skill: w.skill, rating: w.rating, totalRatings: w.totalRatings } : null };
      }));
    }
    const es = await Employer.find({ _id: { $in: [...new Set(jobs.map(j => String(j.employerId)))] } }).select('name phone companyName');
    const byE = Object.fromEntries(es.map(e => [String(e._id), e]));
    res.json(jobs.map(j => {
      const e = byE[String(j.employerId)];
      return { ...j, employer: e ? { name: e.name, phone: e.phone, companyName: e.companyName || '' } : null };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/jobs/:id - full details for the employer and worker of the job; others see an open job's basics
router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    const involved = [String(job.employerId), String(job.workerId)].includes(req.user.id);
    if (involved) return res.json(job);
    if (job.status !== 'pending') return res.status(404).json({ msg: 'Job not found' });
    res.json(await Job.findById(job._id).select(OPEN_JOB_FIELDS));
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/jobs/:id/accept - Worker accepts a job
router.put('/:id/accept', auth, async (req, res) => {
  try {
    // Only workers can accept jobs
    if (req.user.role !== 'worker') return res.status(403).json({ msg: 'Not authorized' });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (job.status !== 'pending') return res.status(400).json({ msg: 'Job already accepted' });

    const worker = await Worker.findById(req.user.id);
    const employer = await Employer.findById(job.employerId).select('+push_token');
    if (!worker || !employer) return res.status(404).json({ msg: 'Account not found' });
    if (worker.phone === employer.phone) return res.status(400).json({ msg: 'You cannot take your own job' });
    if (job.date && job.date < istDate(0)) return res.status(400).json({ msg: 'This job date has passed' });

    // Only one worker gets it, even when two press Accept at the same moment
    const taken = await Job.findOneAndUpdate({ _id: job._id, status: 'pending' }, { $set: { workerId: worker._id, status: 'accepted', acceptedAt: Date.now() } }, { new: true });
    if (!taken) return res.status(400).json({ msg: 'Job already accepted' });
    Object.assign(job, { workerId: taken.workerId, status: taken.status, acceptedAt: taken.acceptedAt });

    worker.jobHistory.push(job.id);
    await worker.save();

    // Socket Emit to Employer
    if (req.io) req.io.to(`user-${employer.id}`).emit('job-accepted', { job, worker: { _id: worker._id, name: worker.name, skill: worker.skill } });


    // Log pending call session automatically
    const pendingCall = new Call({
      callerId: employer.id,
      receiverId: worker.id,
      callerType: 'employer',
      jobId: job.id
    });
    await pendingCall.save();

    // Push Notification to Employer
    if (employer.push_token) {
      await sendPushNotification(
        employer.push_token,
        'Worker Confirmed!',
        `${worker.name} accepted. Arriving at ${job.city} on ${new Date(job.postedAt).toLocaleDateString()}.`,
        { jobId: job.id, workerId: worker.id }
      );
    }

    res.json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/jobs/:id/complete - Employer marks job as completed
router.put('/:id/complete', auth, async (req, res) => {
  try {
    // Only the employer who posted the job can complete it
    if (req.user.role !== 'employer') return res.status(403).json({ msg: 'Not authorized' });

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (String(job.employerId) !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    if (job.status === 'completed') return res.status(400).json({ msg: 'Already completed' });
    if (job.status !== 'accepted') return res.status(400).json({ msg: 'Only a job a worker has taken can be marked done' });
    if (!job.workerId) return res.status(400).json({ msg: 'Only a job a worker has taken can be marked done' });

    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    res.json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/jobs/available/:city
router.get('/available/:city', async (req, res) => {
  try {
    // ?skill=Mason shows only that work type
    const filter = { city: String(req.params.city), status: 'pending', ...notPast() };
    if (typeof req.query.skill === 'string' ? SKILLS.includes(req.query.skill) : false) filter.jobType = req.query.skill;
    const jobs = await Job.find(filter).select(OPEN_JOB_FIELDS).sort({ postedAt: -1 }).limit(50);
    res.json(jobs);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/jobs/:id/cancel - the employer takes the job down (open or taken, not finished)
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    if (req.user.role !== 'employer') return res.status(403).json({ msg: 'Not authorized' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (String(job.employerId) !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    if (!['pending', 'accepted'].includes(job.status)) return res.status(400).json({ msg: 'This job is already finished or cancelled' });
    job.status = 'cancelled';
    await job.save();
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/jobs/:id/leave - the worker who took a job gives it back (it opens again)
router.put('/:id/leave', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ msg: 'Not authorized' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (String(job.workerId) !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    if (job.status !== 'accepted') return res.status(400).json({ msg: 'This job can no longer be given back' });
    job.status = 'pending';
    job.workerId = undefined;
    job.acceptedAt = undefined;
    await job.save();
    await Worker.updateOne({ _id: req.user.id }, { $pull: { jobHistory: job._id } });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/jobs/post (alias for mobile app)
router.post('/post', auth, async (req, res) => {
  try {
    if (req.user.role !== 'employer') return res.status(403).json({ msg: 'Not authorized' });
    const invalid = jobError(req.body);
    if (invalid) return res.status(400).json({ msg: invalid });
    const job = new Job({ employerId: req.user.id, ...jobFields(req.body) });
    await job.save();
    res.status(201).json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;


