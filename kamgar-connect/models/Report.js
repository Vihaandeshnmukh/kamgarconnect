// A report from a worker or employer about the other side (the team reviews it in the admin dashboard),
// or a request to delete one's own account (reason 'delete_account').
const mongoose = require('mongoose');
const { cleanText } = require('../utils/sanitize');

const REASONS = ['no_show', 'rude', 'unsafe', 'fake', 'payment', 'other', 'delete_account'];
const ReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reporterRole: { type: String, enum: ['worker', 'employer'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId }, // empty for delete_account
  targetRole: { type: String, enum: ['worker', 'employer'] },
  reason: { type: String, enum: REASONS, required: true },
  note: { type: String, maxlength: 300, set: v => cleanText(v, 300) },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  createdAt: { type: Date, default: Date.now },
  isDemo: { type: Boolean }
});
module.exports = mongoose.model('Report', ReportSchema);
module.exports.REASONS = REASONS;
