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
  if (workerCount !== undefined) {
    const n = typeof workerCount === 'number' ? workerCount : (typeof workerCount === 'string' ? (/^\d+$/.test(workerCount.trim()) ? Number(workerCount) : NaN) : NaN);
    if (!(Number.isInteger(n) && n >= 1 && n <= 500)) return 'Number of workers must be 1-500';
  }
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
    if (req.io) req.io.to(job.city).emit('new-job', { _id: job._id, jobType: job.jobType, city: job.city, workerCount: job.workerCount, amount: job.amount, date: job.date });

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
      delete j.offers;
      return { ...j, employer: e ? { name: e.name, phone: e.phone, companyName: e.companyName || '' } : null };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /api/jobs/:id - full details for the employer and worker of the job; others see an open job's basics
// ===== Wage counter-offers =====
const wage = (v) => { const n = typeof v === 'number' ? v : (typeof v === 'string' ? (/^\d+$/.test(v.trim()) ? Number(v) : NaN) : NaN); return Number.isInteger(n) ? (n >= 1 ? (n <= 100000 ? n : null) : null) : null; };
// The worker's own offers and what the employer said
router.get('/offers/mine', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ msg: 'Not authorized' });
    const jobs = await Job.find({ 'offers.workerId': req.user.id }).sort({ postedAt: -1 }).limit(50);
    res.json(jobs.map(j => { const o = j.offers.find(x => String(x.workerId) === req.user.id); return { jobId: j._id, jobType: j.jobType, city: j.city, date: j.date, jobAmount: j.amount, jobStatus: j.status, amount: o.amount, status: o.status, at: o.at }; }));
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});
// A worker offers a different daily wage for an open job (replaces their earlier offer)
router.post('/:id/offers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ msg: 'Not authorized' });
    const amount = wage(req.body ? req.body.amount : undefined);
    if (amount === null) return res.status(400).json({ msg: 'Daily wage must be a number from 1 to 100000' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (job.status !== 'pending') return res.status(400).json({ msg: 'This job is no longer open' });
    if (job.date) { if (job.date < istDate(0)) return res.status(400).json({ msg: 'This job date has passed' }); }
    const [worker, employer] = await Promise.all([Worker.findById(req.user.id).select('name phone skill'), Employer.findById(job.employerId).select('phone')]);
    if (!worker) return res.status(404).json({ msg: 'Account not found' });
    if (employer ? employer.phone === worker.phone : false) return res.status(400).json({ msg: 'You cannot make an offer on your own job' });
    const others = (job.offers || []).filter(o => String(o.workerId) !== req.user.id);
    if (others.length >= 30) return res.status(400).json({ msg: 'This job already has many offers' });
    const mine = (job.offers || []).find(o => String(o.workerId) === req.user.id);
    if (mine ? mine.status === 'accepted' : false) return res.status(400).json({ msg: 'Your offer was already accepted - accept the job now' });
    await Job.updateOne({ _id: job._id }, { $pull: { offers: { workerId: worker._id } } });
    await Job.updateOne({ _id: job._id, status: 'pending' }, { $push: { offers: { workerId: worker._id, amount, status: 'pending', at: new Date() } } });
    if (req.io) req.io.to('user-' + job.employerId).emit('job-offer', { jobId: job._id, worker: worker.name, amount });
    res.status(201).json({ ok: true, amount, status: 'pending' });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});
// The employer sees the offers on their job
router.get('/:id/offers', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (req.user.role !== 'employer' ? true : String(job.employerId) !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    const ws = await Worker.find({ _id: { $in: (job.offers || []).map(o => o.workerId) } }).select('name phone skill rating totalRatings experience');
    const byId = Object.fromEntries(ws.map(w => [String(w._id), w]));
    res.json((job.offers || []).filter(o => byId[String(o.workerId)]).map(o => { const w = byId[String(o.workerId)]; return { _id: o._id, amount: o.amount, status: o.status, at: o.at, worker: { _id: w._id, name: w.name, phone: w.phone, skill: w.skill, rating: w.rating, totalRatings: w.totalRatings, experience: w.experience } }; }));
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});
// The employer accepts or declines one offer
router.put('/:id/offers/:offerId', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.offerId)) return res.status(400).json({ msg: 'Invalid offer id' });
    const decision = req.body ? req.body.decision : '';
    if (!['accept', 'decline'].includes(decision)) return res.status(400).json({ msg: 'Choose accept or decline' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (req.user.role !== 'employer' ? true : String(job.employerId) !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    if (job.status !== 'pending') return res.status(400).json({ msg: 'This job is no longer open' });
    const offer = (job.offers || []).find(o => String(o._id) === req.params.offerId);
    if (!offer) return res.status(404).json({ msg: 'Offer not found' });
    if (offer.status !== 'pending') return res.status(400).json({ msg: 'You already answered this offer' });
    const status = decision === 'accept' ? 'accepted' : 'declined';
    const r = await Job.updateOne({ _id: job._id, offers: { $elemMatch: { _id: offer._id, status: 'pending' } } }, { $set: { 'offers.$.status': status } });
    if (!r.modifiedCount) return res.status(400).json({ msg: 'You already answered this offer' });
    if (req.io) req.io.to('user-' + offer.workerId).emit('offer-answered', { jobId: job._id, status, amount: offer.amount });
    res.json({ ok: true, status });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    const involved = [String(job.employerId), String(job.workerId)].includes(req.user.id);
    if (involved) { const o = job.toObject(); if (String(job.employerId) !== req.user.id) delete o.offers; return res.json(o); }
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

    let job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (job.status !== 'pending') return res.status(400).json({ msg: 'Job already accepted' });
    // A worker can't hold two places of the same posting
    if (await Job.exists({ splitFrom: job._id, workerId: req.user.id, status: { $in: ['accepted', 'completed'] } })) return res.status(400).json({ msg: 'You already took a place in this job' });

    const worker = await Worker.findById(req.user.id);
    const employer = await Employer.findById(job.employerId).select('+push_token');
    if (!worker || !employer) return res.status(404).json({ msg: 'Account not found' });
    if (worker.phone === employer.phone) return res.status(400).json({ msg: 'You cannot take your own job' });
    if (job.date && job.date < istDate(0)) return res.status(400).json({ msg: 'This job date has passed' });
    if (job.date) { if (await Call.exists({ receiverId: worker._id, callType: 'assign', 'assignmentData.date': job.date, 'assignmentData.workerResponse': { $nin: ['declined', 'cancelled'] } })) return res.status(400).json({ msg: 'You already have a booking on that day' }); }

    // A job for several workers: this worker takes one place (a job of its own, linked by
    // splitFrom) and the rest stays open
    const myOffer = (job.offers || []).find(o => String(o.workerId) === String(worker._id) ? o.status === 'accepted' : false);
    const myAmount = myOffer ? myOffer.amount : job.amount;
    let split = null;
    if ((job.workerCount || 1) > 1) {
      split = await Job.findOneAndUpdate({ _id: job._id, status: 'pending', workerCount: { $gt: 1 } }, { $inc: { workerCount: -1 } }, { new: true });
    }
    if (split) {
      try {
        job = await new Job({
          employerId: job.employerId, jobType: job.jobType, city: job.city, workerCount: 1, amount: myAmount,
          date: job.date, location: job.location, description: job.description, postedAt: job.postedAt,
          splitFrom: job._id, status: 'accepted', workerId: worker._id, acceptedAt: Date.now()
        }).save();
      } catch (e) {
        await Job.updateOne({ _id: job._id }, { $inc: { workerCount: 1 } });
        if (e.code === 11000) return res.status(400).json({ msg: 'You already took a place in this job' });
        throw e;
      }
      // Requests at the same moment (or before the database rule is built): keep only the first place
      const mine = await Job.find({ splitFrom: job.splitFrom, workerId: worker._id }).sort({ _id: 1 }).select('_id');
      if (mine.length > 1) {
        if (String(mine[0]._id) !== String(job._id)) {
          await Job.deleteOne({ _id: job._id });
          await Job.updateOne({ _id: job.splitFrom }, { $inc: { workerCount: 1 } });
          return res.status(400).json({ msg: 'You already took a place in this job' });
        }
      }
    } else {
      // Only one worker gets it, even when two press Accept at the same moment
      const taken = await Job.findOneAndUpdate({ _id: job._id, status: 'pending' }, { $set: { workerId: worker._id, status: 'accepted', acceptedAt: Date.now(), ...(myOffer ? { amount: myAmount } : {}) } }, { new: true });
      if (!taken) return res.status(400).json({ msg: 'Job already accepted' });
      if (await Job.exists({ splitFrom: job._id, workerId: worker._id })) {
        await Job.updateOne({ _id: job._id, workerId: worker._id }, { $set: { status: 'pending' }, $unset: { workerId: 1, acceptedAt: 1 } });
        return res.status(400).json({ msg: 'You already took a place in this job' });
      }
      Object.assign(job, { workerId: taken.workerId, status: taken.status, acceptedAt: taken.acceptedAt, amount: taken.amount });
    }

    if (job.date) {
      if (await Call.exists({ receiverId: worker._id, callType: 'assign', 'assignmentData.date': job.date, 'assignmentData.workerResponse': { $nin: ['declined', 'cancelled'] } })) {
        if (job.splitFrom) { await Job.deleteOne({ _id: job._id }); await Job.updateOne({ _id: job.splitFrom }, { $inc: { workerCount: 1 } }); }
        else await Job.updateOne({ _id: job._id }, { $set: { status: 'pending' }, $unset: { workerId: 1, acceptedAt: 1 } });
        return res.status(400).json({ msg: 'You already have a booking on that day' });
      }
    }
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
    if (!['accepted', 'in-progress'].includes(job.status)) return res.status(400).json({ msg: 'Only a job a worker has taken can be marked done' });
    if (job.date) { if (job.date > istDate(0)) return res.status(400).json({ msg: 'A job can be marked done on or after its work date' }); }
    if (!job.date) { if (Date.now() - new Date(job.acceptedAt || 0).getTime() < 2 * 3600 * 1000) return res.status(400).json({ msg: 'A job can be marked done 2 hours after a worker took it' }); }
    if (!job.workerId) return res.status(400).json({ msg: 'Only a job a worker has taken can be marked done' });

    const finished = await Job.findOneAndUpdate({ _id: job._id, status: { $in: ['accepted', 'in-progress'] } }, { $set: { status: 'completed', completedAt: Date.now() } }, { new: true });
    if (!finished) return res.status(400).json({ msg: 'Already completed' });
    await Worker.updateOne({ _id: job.workerId }, { $inc: { jobsDone: 1 } });
    return res.json(finished);

    res.json(job);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/jobs/:id/start - the worker who took the job says the work has started (on or after the work date)
router.put('/:id/start', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ msg: 'Not authorized' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (String(job.workerId) !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    if (job.date) { if (job.date > istDate(0)) return res.status(400).json({ msg: 'You can start on the work day' }); }
    const started = await Job.findOneAndUpdate({ _id: job._id, workerId: req.user.id, status: 'accepted' }, { $set: { status: 'in-progress', startedAt: Date.now() } }, { new: true });
    if (!started) return res.status(400).json({ msg: 'This job can not be started' });
    if (req.io) req.io.to('user-' + job.employerId).emit('job-started', { jobId: job._id });
    const o = started.toObject(); delete o.offers; res.json(o);
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// PUT /api/jobs/:id/no-show - the employer reports that the worker did not come (on or after the work date)
router.put('/:id/no-show', auth, async (req, res) => {
  try {
    if (req.user.role !== 'employer') return res.status(403).json({ msg: 'Not authorized' });
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ msg: 'Job not found' });
    if (String(job.employerId) !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });
    if (!job.workerId) return res.status(400).json({ msg: 'No worker took this job' });
    if (job.date) { if (job.date > istDate(0)) return res.status(400).json({ msg: 'You can report this on or after the work day' }); }
    if (!job.date) { if (Date.now() - new Date(job.acceptedAt || 0).getTime() < 2 * 3600 * 1000) return res.status(400).json({ msg: 'You can report this 2 hours after the worker took the job' }); }
    const done = await Job.findOneAndUpdate({ _id: job._id, status: { $in: ['accepted', 'in-progress'] } }, { $set: { status: 'cancelled', noShow: true } }, { new: true });
    if (!done) return res.status(400).json({ msg: 'This job is already finished or cancelled' });
    await Worker.updateOne({ _id: job.workerId }, { $inc: { noShows: 1 } });
    res.json(done);
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
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
    const done = await Job.findOneAndUpdate({ _id: job._id, status: { $in: ['pending', 'accepted'] } }, { $set: { status: 'cancelled' } }, { new: true });
    if (!done) return res.status(400).json({ msg: 'This job is already finished or cancelled' });
    res.json(done);
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
    if (job.date) { if (job.date < istDate(0)) return res.status(400).json({ msg: 'This job can no longer be given back' }); }
    // One place of a job for several workers: remove the place (only one request can) and give it back if the job is still open
    if (job.splitFrom) {
      const removed = await Job.findOneAndDelete({ _id: job._id, workerId: req.user.id, status: 'accepted' });
      if (!removed) return res.status(400).json({ msg: 'This job can no longer be given back' });
      await Worker.updateOne({ _id: req.user.id }, { $pull: { jobHistory: job._id } });
      const parent = await Job.findOneAndUpdate({ _id: job.splitFrom, status: 'pending' }, { $inc: { workerCount: 1 } }, { new: true });
      if (parent) return res.json(parent);
      // The rest was filled meanwhile: the place opens again as a job of its own (not if the job was cancelled)
      const parentNow = await Job.findById(job.splitFrom).select('status');
      if (parentNow ? parentNow.status === 'cancelled' : true) return res.json({ ...removed.toObject(), status: 'cancelled' });
      const again = await new Job({ employerId: removed.employerId, jobType: removed.jobType, city: removed.city, workerCount: 1, amount: removed.amount,
        date: removed.date, location: removed.location, description: removed.description, postedAt: removed.postedAt }).save();
      return res.json(again);
    }
    const reopened = await Job.findOneAndUpdate({ _id: job._id, workerId: req.user.id, status: 'accepted' },
      { $set: { status: 'pending' }, $unset: { workerId: 1, acceptedAt: 1 } }, { new: true });
    if (!reopened) return res.status(400).json({ msg: 'This job can no longer be given back' });
    await Worker.updateOne({ _id: req.user.id }, { $pull: { jobHistory: job._id } });
    res.json(reopened);
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


