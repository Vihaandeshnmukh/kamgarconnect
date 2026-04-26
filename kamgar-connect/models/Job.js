// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const mongoose = require('mongoose');

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
  amount: { type: Number } // Negotiated or fixed amount
});

module.exports = mongoose.model('Job', JobSchema);

