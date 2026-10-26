// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const mongoose = require('mongoose');

const CallSessionSchema = new mongoose.Schema({
  callSid: { type: String, required: true, unique: true },
  phone: { type: String },
  language: { type: String, default: 'hindi' },
  currentQuestion: { type: Number, default: 0 },
  collectedData: {
    name: { type: String, default: null },
    city: { type: String, default: null },
    skill: { type: String, default: null },
    experience_years: { type: Number, default: null },
    availability_days: { type: Number, default: null },
    expected_salary_per_day: { type: Number, default: null }
  },
  conversationHistory: { type: Array, default: [] },
  silentTurns: { type: Number, default: 0 }, // consecutive answers with no speech
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null }, // profile created from this call
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt before saving
// (Mongoose 9 no longer passes next() to pre hooks)
CallSessionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('CallSession', CallSessionSchema);

