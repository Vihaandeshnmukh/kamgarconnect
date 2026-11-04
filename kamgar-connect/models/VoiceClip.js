const mongoose = require('mongoose');

// A short spoken phrase generated once with ElevenLabs and reused on every call
// (saves free-tier characters). Audio is raw 16-bit mono PCM at 8 kHz, the
// format phone calls use; it is wrapped as WAV when served.
const VoiceClipSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. "hi.city_menu", "mr.num.50"
  text: { type: String, required: true },
  model: { type: String },
  voiceId: { type: String },
  pcm: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VoiceClip', VoiceClipSchema);
