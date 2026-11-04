// Exotel phone line (Indian number). The flow is built in Exotel's App Bazaar:
//
//   Passthru  GET /api/exotel/start   200 = new caller -> Voicemail (record name) -> Passthru (async) GET /api/exotel/name
//                                     302 = known worker ------------------------------------------------------------┐
//   Programmable Gather  GET /api/exotel/gather   (we say what to play and how many keys to collect)  <-------------┘<-┐
//   Passthru  GET /api/exotel/answer  302 = ask the next question (back to Gather), 200 = done -> Hangup             ──┘
//
// Exotel does not sign its requests, so every URL carries ?key=EXOTEL_WEBHOOK_KEY.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const CallSession = require('../models/CallSession');
const Worker = require('../models/Worker');
const adminAuth = require('../middleware/adminAuth');
const rateLimit = require('../middleware/rateLimit');
const registration = require('../utils/keypadRegistration');
const { buildWav, getPcm } = require('../utils/voice/clips');
const { allKeys, textFor } = require('../utils/voice/phrases');
const { transcribeName } = require('../utils/aiUnderstand');
const { localPhone } = require('../utils/voiceParse');
const telephony = require('../utils/telephony');

const baseUrl = (req) => process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

// Only requests that know the webhook key (set in the Exotel flow URLs)
function exotelOnly(req, res, next) {
  const expected = process.env.EXOTEL_WEBHOOK_KEY;
  if (!expected) return res.status(503).json({ msg: 'Exotel is not configured' });
  const given = Buffer.from(String(req.query.key || ''));
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return res.status(403).json({ msg: 'Forbidden' });
  next();
}

// The caller's session for this call (created on the first request)
async function sessionFor(req) {
  const callSid = String(req.query.CallSid || '').slice(0, 100);
  if (!callSid) return null;
  let session = await CallSession.findOne({ callSid });
  if (!session) {
    // Incoming: From is the caller. Outgoing API calls: From is the person we dialled.
    session = new CallSession({ callSid, phone: localPhone(req.query.From || req.query.CallFrom), provider: 'exotel', language: 'hi' });
    await registration.begin(session);
    await session.save();
  }
  return session;
}

// Exotel wraps gathered digits in quotes: "\"12\"" -> "12"
const cleanDigits = (value) => String(value || '').replace(/["\s]/g, '').slice(0, 8);

// GET /api/exotel/start - first applet: 200 = new caller (record their name), 302 = already registered
router.get('/start', exotelOnly, async (req, res) => {
  try {
    const session = await sessionFor(req);
    if (!session) return res.status(200).send('');
    res.status(session.step === 'lang' ? 200 : 302).send('');
  } catch (err) {
    console.error('Exotel start error:', err.message);
    res.status(200).send('');
  }
});

// Downloads an Exotel recording (public URL, or with our API key if Exotel asks for it)
async function download(url) {
  let res = await fetch(url);
  if (res.status === 401 || res.status === 403) {
    const auth = Buffer.from(`${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}`).toString('base64');
    res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  }
  if (!res.ok) throw new Error(`recording download ${res.status}`);
  return { audio: Buffer.from(await res.arrayBuffer()), mimeType: (res.headers.get('content-type') || 'audio/mpeg').split(';')[0] };
}

// GET /api/exotel/name - async Passthru after the Voicemail applet: transcribe the spoken name
router.get('/name', exotelOnly, async (req, res) => {
  res.status(200).send(''); // async applet: Exotel doesn't wait for us
  try {
    const url = String(req.query.RecordingUrl || '');
    if (!/^https?:\/\//.test(url)) return;
    const { audio, mimeType } = await download(url);
    const name = await transcribeName(audio, mimeType);
    if (!name) return;
    const session = await CallSession.findOneAndUpdate({ callSid: String(req.query.CallSid || '') }, { $set: { spokenName: name } }, { returnDocument: 'after' });
    // Registration already finished: replace the placeholder name
    if (session && session.workerId) await Worker.updateOne({ _id: session.workerId, name: 'Worker' }, { $set: { name } });
  } catch (err) {
    console.error('Exotel name error:', err.message);
  }
});

// GET /api/exotel/gather - Programmable Gather: what to play and how many keys to collect
router.get('/gather', exotelOnly, async (req, res) => {
  try {
    const session = await sessionFor(req);
    if (!session) throw new Error('no CallSid');
    const p = registration.prompt(session);
    session.turn += 1;
    session.promptKeys = p.keys;
    await session.save();
    buildWav(p.keys).catch(err => console.error('Exotel audio prepare failed:', err.message)); // warm the cache before Exotel fetches it
    res.json({
      gather_prompt: { audio_url: `${baseUrl(req)}/api/exotel/audio/${encodeURIComponent(session.callSid)}/${session.turn}.wav?key=${encodeURIComponent(req.query.key)}` },
      max_input_digits: p.maxDigits,
      finish_on_key: p.finishOnKey || '',
      input_timeout: p.timeout || 5,
      repeat_menu: 1
    });
  } catch (err) {
    console.error('Exotel gather error:', err.message);
    res.json({ gather_prompt: { audio_url: `${baseUrl(req)}/api/exotel/clip/hi.error.wav?key=${encodeURIComponent(req.query.key)}` }, max_input_digits: 1, input_timeout: 1 });
  }
});

// GET /api/exotel/answer - Passthru after the Gather: 302 = ask the next question, 200 = finished
router.get('/answer', exotelOnly, async (req, res) => {
  try {
    const session = await sessionFor(req);
    if (!session) return res.status(200).send('');
    const next = await registration.answer(session, cleanDigits(req.query.digits));
    await session.save();
    res.status(next === 'finish' ? 200 : 302).send('');
  } catch (err) {
    console.error('Exotel answer error:', err.message);
    res.status(200).send(''); // end the call rather than loop on an error
  }
});

// GET /api/exotel/audio/:callSid/:turn.wav - the prompt for that turn (stitched cached clips)
router.get('/audio/:callSid/:turn.wav', exotelOnly, async (req, res) => {
  try {
    const session = await CallSession.findOne({ callSid: req.params.callSid }).select('promptKeys');
    const keys = session && session.promptKeys.length ? session.promptKeys : ['hi.error'];
    res.type('audio/wav').send(await buildWav(keys));
  } catch (err) {
    console.error('Exotel audio error:', err.message);
    res.status(500).send('');
  }
});

// GET /api/exotel/clip/:key.wav - one fixed phrase (e.g. the name prompt for the Voicemail applet)
router.get('/clip/:key.wav', exotelOnly, async (req, res) => {
  try {
    if (!textFor(req.params.key)) return res.status(404).send('');
    res.type('audio/wav').send(await buildWav([req.params.key]));
  } catch (err) {
    console.error('Exotel clip error:', err.message);
    res.status(500).send('');
  }
});

// POST/GET /api/exotel/status - StatusCallback when a call we placed ends
router.all('/status', exotelOnly, async (req, res) => {
  const p = { ...req.query, ...req.body };
  console.log('Exotel call status:', p.CallSid, p.Status || p.CallStatus, p.ConversationDuration || p.Duration || '');
  res.status(200).send('OK');
});

// POST /api/exotel/call-me - website "Call me" button: our number rings the visitor
// and runs the registration flow. Open to visitors, so tightly limited.
const callMeLimit = rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 3, message: 'Too many call requests. Please try again in a few minutes.' });
const lastCalled = new Map(); // phone -> time of our last call to it
const callDay = { date: '', count: 0 };
router.post('/call-me', callMeLimit, async (req, res) => {
  try {
    const to = telephony.indianMobile(req.body.phone);
    if (!to) return res.status(400).json({ msg: 'Please enter a valid 10-digit Indian mobile number' });
    const last = lastCalled.get(to) || 0;
    if (Date.now() - last < 10 * 60 * 1000) return res.status(429).json({ msg: 'We called this number a few minutes ago. Please wait before trying again.' });
    const today = new Date().toISOString().slice(0, 10);
    if (callDay.date !== today) { callDay.date = today; callDay.count = 0; }
    if (callDay.count >= (Number(process.env.CALL_ME_DAILY_LIMIT) || 50)) return res.status(429).json({ msg: 'Our phone line is busy today. Please call us instead.' });

    const key = encodeURIComponent(process.env.EXOTEL_WEBHOOK_KEY || '');
    const call = await telephony.placeCall({ to, flow: 'registration', customField: 'call-me', baseUrl: baseUrl(req), statusCallback: `${baseUrl(req)}/api/exotel/status?key=${key}` });
    lastCalled.set(to, Date.now());
    callDay.count += 1;
    res.json({ success: true, msg: 'Calling you now', provider: call.provider });
  } catch (err) {
    console.error('Call-me error:', err.message);
    res.status(502).json({ msg: 'Could not place the call right now. Please call our helpline instead.' });
  }
});

// GET /api/exotel/helpline - the number the website shows (the active provider's number)
router.get('/helpline', (req, res) => {
  res.json({ number: telephony.current().helpline(), provider: telephony.current().name });
});

// POST /api/exotel/prepare-audio - admin: generate every phone phrase once (runs in the background)
const prep = { running: false, done: 0, total: 0, failed: [], chars: 0 };
router.post('/prepare-audio', adminAuth, (req, res) => {
  if (!prep.running) {
    const keys = allKeys();
    Object.assign(prep, { running: true, done: 0, total: keys.length, failed: [], chars: 0 });
    (async () => {
      const queue = [...keys];
      const worker = async () => {
        while (queue.length) {
          const k = queue.shift();
          try { await getPcm(k); prep.chars += textFor(k).length; } catch (err) { prep.failed.push(`${k}: ${err.message.slice(0, 80)}`); }
          prep.done += 1;
        }
      };
      await Promise.all([worker(), worker()]); // ElevenLabs free plan allows 2 requests at once
      prep.running = false;
    })();
  }
  res.status(202).json(prep);
});
router.get('/prepare-audio', adminAuth, (req, res) => res.json(prep));

module.exports = router;
