// WEB VERSION � FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const mongoose = require('mongoose');
const { cleanText } = require('../utils/sanitize');

const JobSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }, // Can be null until accepted
  jobType: { type: String, required: true }, // e.g. Mason, Plumber
  city: { type: String, required: true },
  workerCount: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  postedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  completedAt: { type: Date },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  amount: { type: Number }, // Daily wage offered (₹)
  date: { type: String }, // Work date "YYYY-MM-DD" (India), optional
  location: { type: String, set: v => cleanText(v, 120) }, // Where to report, optional
  description: { type: String, set: v => cleanText(v, 300) }, // Short note from the employer, optional
  isDemo: { type: Boolean }, // only demo-seed.js records (kamgar_demo database)
  splitFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, // One place taken from a job for several workers
  startedAt: { type: Date }, // the worker tapped Start work
  noShow: { type: Boolean }, // the employer reported the worker did not come (job then cancelled)
  // Wage counter-offers from workers on an open job (one per worker; the employer accepts or declines)
  offers: [{ workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }, amount: Number, status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }, at: { type: Date, default: Date.now } }]
});

// A worker holds at most one place of a job for several workers, even for requests at the same moment
JobSchema.index({ splitFrom: 1, workerId: 1 }, { unique: true, partialFilterExpression: { splitFrom: { $type: 'objectId' }, workerId: { $type: 'objectId' } } });

module.exports = mongoose.model('Job', JobSchema);

