// WEB VERSION � FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  callerId: { type: mongoose.Schema.Types.ObjectId },
  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  callerType: { type: String, enum: ['worker', 'employer', 'admin'], default: 'admin' },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  callSid: { type: String }, // Twilio Call SID
  duration: { type: Number, default: 0 }, // In seconds
  callType: { type: String, enum: ['notify', 'assign'], default: 'notify' },
  assignmentData: {
    location: String,
    date: String,
    time: String,
    employerName: String,
    instructions: String,
    workerResponse: { type: String, enum: ['pending', 'confirmed', 'declined', 'cancelled'], default: 'pending' },
    prevAvailableUntil: Date, // the worker was live until then when the booking started (put back if it ends early)
    activeKey: String // "<workerId>:<date>" while the booking counts; removed when it ends (unique)
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'canceled'],
    default: 'initiated'
  },
  timestamp: { type: Date, default: Date.now }
});

// One booking that counts per worker per day, even for two requests at the same moment
CallSchema.index({ 'assignmentData.activeKey': 1 }, { unique: true, partialFilterExpression: { 'assignmentData.activeKey': { $type: 'string' } } });

module.exports = mongoose.model('Call', CallSchema);

