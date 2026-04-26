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
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt before saving
CallSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CallSession', CallSessionSchema);

