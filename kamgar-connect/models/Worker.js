// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for pitch
  city: { type: String, required: true },
  skill: { type: String, required: true }, // Plumber, Mason, etc.
  experience: { type: Number, required: true, default: 0 },
  aadhaar: { type: String }, // Optional for pitch
  expectedSalary: { type: Number },
  hiredUntil: { type: Date, default: null }, // Timestamp until which the worker is currently booked
  availability: { type: [String], default: [] }, // ['monday', 'wednesday'] or ['24/7']
  isLooking: { type: Boolean, default: false }, // Whether the worker is currently seeking jobs
  availableUntil: { type: Date, default: null }, // Timestamp until which the worker is available
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  language: { type: String, enum: ['en', 'hi', 'mr'], default: 'hi' },
  last_called_at: { type: Date },
  call_status: { type: String },
  isAvailable: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  jobHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  push_token: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

WorkerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Worker', WorkerSchema);

