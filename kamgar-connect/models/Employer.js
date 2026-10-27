// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const mongoose = require('mongoose');
const { cleanText, cleanName } = require('../utils/sanitize');

const EmployerSchema = new mongoose.Schema({
  name: { type: String, required: true, set: v => cleanName(v) }, // letters only: never HTML
  phone: { type: String, required: true, unique: true },
  password: { type: String, select: false }, // Optional for pitch; never returned unless asked with select('+password')
  city: { type: String, required: true, set: v => cleanText(v, 40) },
  companyName: { type: String, set: v => cleanText(v, 80) },
  workerType: { type: String, set: v => cleanText(v, 40) },
  workerCount: { type: Number },
  jobsPosted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  push_token: { type: String, default: null, select: false },
  email: { type: String, select: false }, // From "Sign in with Google" (private)
  googleId: { type: String, index: true, sparse: true, select: false }, // Google account linked for one-tap login
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employer', EmployerSchema);

