const mongoose = require('mongoose');

// One phone conversation with the AI voice agent (ElevenLabs), kept as a call log:
// the full transcript, what Gemini extracted from it, and what we did with it.
const CallLogSchema = new mongoose.Schema({
  provider: { type: String, default: 'elevenlabs' },
  conversationId: { type: String, required: true, unique: true },
  agentId: { type: String },
  phone: { type: String, default: null }, // caller's 10-digit number, when known
  startedAt: { type: Date },
  durationSecs: { type: Number },
  transcript: [{ role: String, message: String, timeInCallSecs: Number, _id: false }],
  summary: { type: String }, // ElevenLabs' own one-paragraph summary, if sent
  extracted: { type: Object, default: null }, // fields Gemini pulled out of the transcript
  // received -> processing -> registered | existing | incomplete | error
  status: { type: String, default: 'received' },
  note: { type: String }, // why a call ended up incomplete/error
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CallLog', CallLogSchema);
