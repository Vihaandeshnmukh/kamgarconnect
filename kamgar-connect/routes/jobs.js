// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const twilio = require('twilio');
const Job = require('../models/Job');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const Call = require('../models/Call');
const { sendPushNotification } = require('../utils/notifications');
const mongoose = require('mongoose');
const { CITIES, SKILLS } = require('../utils/sanitize');

// Every :id must be a real MongoDB id (400 instead of a 500)
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ msg: 'Invalid job id' });
  next();
});

// Checks a new job's fields; returns an error message or null
function jobError({ jobType, city, workerCount, amount }) {
  if (!SKILLS.includes(jobType)) return 'Please choose a worker type';
  if (!CITIES.includes(city)) return 'Please choose a city';
  if (workerCount !== undefined && !(Number.isInteger(Number(workerCount)) && workerCount >= 1 && workerCount <= 500)) return 'Number of workers must be 1-500';
  if (amount !== undefined && !(Number(amount) >= 0 && Number(amount) <= 100000)) return 'Invalid amount';
  return null;
}

// What workers browsing open jobs may see (no employer id)
const OPEN_JOB_FIELDS = 'jobType city workerCount amount postedAt status';

let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// POST /api/jobs - Employer posts a job
router.post('/', auth, async (req, res) => {
  try {
    const { jobType, city, workerCount, amount } = req.body;
    
    // Only employers can post jobs
    if (req.user.role !== 'employer') return res.status(403).json({ msg: 'Not authorized' });
    const invalid = jobError(req.body);
    if (invalid) return res.status(400).json({ msg: invalid });

    const job = new Job({
      employerId: req.user.id,
      jobType,
      city,
      workerCount,
      amount
    });

    await job.save();

    const employer = await Employer.findById(req.user.id);
    employer.jobsPosted.push(job.id);
    await employer.save();

    // Emit Socket.IO event to all matching workers in that city
    if (req.io) req.io.to(city).emit('new-job', job);

    res.status(201).json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/jobs - your own jobs (employer: posted, worker: accepted)
router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'employer' ? { employerId: req.user.id } : { workerId: req.user.id };
    const jobs = await Job.find(filter).sort({ postedAt: -1 }).limit(100);
    res.json(jobs);
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

    job.workerId = worker.id;
    job.status = 'accepted';
    job.acceptedAt = Date.now();
    await job.save();

    worker.jobHistory.push(job.id);
    await worker.save();

    // Socket Emit to Employer
    if (req.io) req.io.to(`user-${employer.id}`).emit('job-accepted', { job, worker: { _id: worker._id, name: worker.name, skill: worker.skill } });

    // Twilio SMS
    try {
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_PHONE_NUMBER !== 'your_twilio_number') {
        await twilioClient.messages.create({
          body: `नमस्ते ${worker.name}! You have a new job from ${employer.name} in ${job.city}. They will call you shortly. - Kamgar Connect`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: worker.phone
        });

        await twilioClient.messages.create({
          body: `Your worker ${worker.name} (${worker.skill}) has accepted your job. Login to call them now.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: employer.phone
        });
      }
    } catch (smsErr) {
      console.error('Twilio SMS error:', smsErr.message);
      // Fails silently if trial account limits prevent sms
    }

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

    job.status = 'completed';
    job.completedAt = Date.now();
    await job.save();

    const worker = await Worker.findById(job.workerId);
    const employer = await Employer.findById(job.employerId);

    // Auto SMS to employer asking for a review
    if (worker && employer && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        // The website opens a rating box for this job (employer must be logged in)
        const reviewUrl = `https://kamgar.de/?review=${job.id}&worker=${worker.id}`;
        await twilioClient.messages.create({
          body: `Kamgar Connect: Job complete! Please rate ${worker.name} at ${reviewUrl}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: employer.phone
        });
      } catch (smsErr) {
        console.error('Twilio SMS review error:', smsErr.message);
      }
    }

    res.json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/jobs/available/:city
router.get('/available/:city', async (req, res) => {
  try {
    const jobs = await Job.find({ city: String(req.params.city), status: 'pending' }).select(OPEN_JOB_FIELDS).sort({ postedAt: -1 }).limit(50);
    res.json(jobs);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/jobs/post (alias for mobile app)
router.post('/post', auth, async (req, res) => {
  try {
    if (req.user.role !== 'employer') return res.status(403).json({ msg: 'Not authorized' });
    const invalid = jobError(req.body);
    if (invalid) return res.status(400).json({ msg: invalid });
    const { jobType, city, workerCount, amount } = req.body;
    const job = new Job({
      employerId: req.user.id,
      jobType,
      city,
      workerCount,
      amount
    });
    await job.save();
    res.status(201).json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;


