// Cached phone audio: each phrase is generated once with ElevenLabs, stored in
// MongoDB (VoiceClip) and kept in memory, then stitched into WAV files for calls.
const VoiceClip = require('../../models/VoiceClip');
const { textFor } = require('./phrases');

const SAMPLE_RATE = 8000; // phone audio
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_v3'; // the only ElevenLabs model that speaks Marathi
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'XrExE9yKIg1WjnnlVkGX';
const GAP = Buffer.alloc(Math.round(SAMPLE_RATE * 0.15) * 2); // 150 ms of silence between stitched clips

const memory = new Map(); // key -> PCM buffer
const pending = new Map(); // key -> Promise, so one clip is never generated twice at once

async function generate(key, text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
  const lang = key.split('.')[0];
  const body = { text, model_id: MODEL };
  if (['hi', 'mr', 'en'].includes(lang)) body.language_code = lang;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=pcm_${SAMPLE_RATE}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

// PCM audio for one clip key: memory, then MongoDB, then ElevenLabs (saved for next time)
async function getPcm(key) {
  if (memory.has(key)) return memory.get(key);
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    const text = textFor(key);
    if (!text) throw new Error(`Unknown voice clip: ${key}`);
    let clip = await VoiceClip.findOne({ key });
    if (!clip || clip.text !== text) {
      const pcm = await generate(key, text);
      clip = await VoiceClip.findOneAndUpdate({ key }, { key, text, model: MODEL, voiceId: VOICE_ID, pcm, createdAt: new Date() }, { upsert: true, returnDocument: 'after' });
    }
    memory.set(key, clip.pcm);
    return clip.pcm;
  })();
  pending.set(key, job);
  try { return await job; } finally { pending.delete(key); }
}

// 44-byte WAV header for 16-bit mono PCM
function wavHeader(dataLength) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + dataLength, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SAMPLE_RATE, 24); h.writeUInt32LE(SAMPLE_RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(dataLength, 40);
  return h;
}

// One WAV file made of the given clips, in order
async function buildWav(keys) {
  const parts = [];
  for (const [i, key] of keys.entries()) {
    if (i > 0) parts.push(GAP);
    parts.push(await getPcm(key));
  }
  const data = Buffer.concat(parts);
  return Buffer.concat([wavHeader(data.length), data]);
}

module.exports = { getPcm, buildWav, wavHeader, SAMPLE_RATE };
