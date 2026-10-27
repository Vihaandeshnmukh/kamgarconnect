const mongoose = require('mongoose');
const { cleanText } = require('../utils/sanitize');

const TimelineSchema = new mongoose.Schema({
  date: { type: String, required: true, set: v => cleanText(v, 40) },
  title: { type: String, required: true, set: v => cleanText(v, 120) },
  description: { type: String, required: true, set: v => cleanText(v, 1000) },
  category: { type: String, default: 'General', set: v => cleanText(v, 40) },
  status: { type: String, required: true, enum: ['Done', 'In Progress', 'Planned'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timeline', TimelineSchema);
