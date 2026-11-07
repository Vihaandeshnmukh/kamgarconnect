// In-app inbox: one row per message to a worker or an employer. The website turns `type` + `data`
// into text in the reader's language. Old messages disappear after 60 days.
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, enum: ['worker', 'employer'], required: true },
  type: { type: String, required: true, maxlength: 40 }, // booking_new, booking_confirmed, job_taken, offer_new, ...
  data: { // small, display-only details (names, dates, amounts); never phone numbers
    name: { type: String, maxlength: 80 },
    date: { type: String, maxlength: 10 },
    time: { type: String, maxlength: 5 },
    amount: Number,
    jobType: { type: String, maxlength: 40 },
    rating: Number
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  isDemo: { type: Boolean }
});
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });

module.exports = mongoose.model('Notification', NotificationSchema);
