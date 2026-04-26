// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer' },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' }, // To track which job this is for
  rating: { type: Number, required: true, min: 1, max: 5 },
  tags: [{ type: String }],
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', ReviewSchema);

