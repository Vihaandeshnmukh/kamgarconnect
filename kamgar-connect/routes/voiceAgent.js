// AI voice agent ("Mitra", ElevenLabs Agents + Gemini) calls.
// When a call ends, ElevenLabs posts the transcript here (post-call webhook).
// We keep it as a call log, let Gemini pull out the registration details and
// register the caller as a worker, so they are on the website straight away.
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const router = express.Router();
const CallLog = require('../models/CallLog');
const Worker = require('../models/Worker');
const adminAuth = require('../middleware/adminAuth');
const { extractRegistration } = require('../utils/callExtraction');
const { localPhone } = require('../utils/voiceParse');

const VISIBLE_MS = 24 * 60 * 60 * 1000; // new/returning callers are shown to employers this long
const SIGNATURE_MAX_AGE_SECS = 30 * 60;

// ElevenLabs-Signature: "t=<unix secs>,v0=<hex HMAC-SHA256 of `${t}.${raw body}`>"
function validSignature(header, rawBody, secret) {
  const parts = Object.fromEntries(String(header || '').split(',').map(p => p.split('=').map(s => s.trim())));
  const t = Number(parts.t);
  if (!parts.v0 || !Number.isFinite(t)) return false;
  if (Math.abs(Date.now() / 1000 - t) > SIGNATURE_MAX_AGE_SECS) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(parts.v0));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// The caller's number: ElevenLabs passes it as a system variable on phone calls
function callerPhone(data) {
  const vars = (data.conversation_initiation_client_data || {}).dynamic_variables || {};
  const phoneCall = (data.metadata || {}).phone_call || {};
  const raw = vars.system__caller_id || phoneCall.external_number || null;
  const phone = raw ? localPhone(raw) : '';
  return /^\d{10}$/.test(phone) ? phone : null;
}

// Turns a call log into a worker (or puts an existing worker back on the list)
async function processCall(log) {
  log.status = 'processing';
  await log.save();
  try {
    const x = await extractRegistration(log.transcript);
    log.extracted = x;
    const phone = log.phone || x.phone;
    if (!phone) { log.status = 'incomplete'; log.note = 'No phone number (caller id missing and none said)'; return; }

    const existing = await Worker.findOne({ phone });
    if (existing) {
      await Worker.updateOne({ _id: existing._id }, { isLooking: true, availableUntil: new Date(Date.now() + VISIBLE_MS), isWithdrawn: false });
      log.workerId = existing._id;
      log.status = 'existing';
      return;
    }
    const missing = ['name', 'city', 'skill'].filter(f => !x[f]);
    if (missing.length || !x.agreed_to_register) {
      log.status = 'incomplete';
      log.note = missing.length ? `Missing: ${missing.join(', ')}` : 'Caller did not agree to register';
      return;
    }
    const worker = await new Worker({
      name: x.name,
      phone,
      city: x.city,
      skill: x.skill,
      experience: x.experience_years || 0,
      expectedSalary: x.expected_salary_per_day || undefined,
      availability: x.availability_days ? [`${x.availability_days} days/week`] : [],
      language: x.language || 'hi',
      // Registering by phone means they want work: employers can find them straight away
      isLooking: true,
      availableUntil: new Date(Date.now() + VISIBLE_MS),
      // Same login rule as website sign-up: the phone number
      password: await bcrypt.hash(phone, await bcrypt.genSalt(10))
    }).save();
    log.workerId = worker._id;
    log.status = 'registered';
  } catch (err) {
    console.error('Voice agent call processing failed:', log.conversationId, err.message);
    log.status = 'error';
    log.note = err.message.slice(0, 200);
  } finally {
    await log.save();
  }
}

// POST /api/voice-agent/webhook - ElevenLabs post-call webhook (raw JSON body, signed)
router.post('/webhook', async (req, res) => {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ msg: 'Voice agent webhook is not configured' });
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!validSignature(req.get('elevenlabs-signature'), raw, secret)) return res.status(401).json({ msg: 'Invalid signature' });

  let event;
  try { event = JSON.parse(raw); } catch { return res.status(400).json({ msg: 'Invalid JSON' }); }
  if (event.type !== 'post_call_transcription' || !event.data || !event.data.conversation_id) return res.json({ ok: true, ignored: event.type });

  const d = event.data;
  try {
    // Retries resend the same call: process each conversation once
    const already = await CallLog.findOne({ conversationId: d.conversation_id });
    if (already) return res.json({ ok: true, duplicate: true });
    const log = await new CallLog({
      conversationId: String(d.conversation_id).slice(0, 100),
      agentId: d.agent_id,
      phone: callerPhone(d),
      startedAt: d.metadata && d.metadata.start_time_unix_secs ? new Date(d.metadata.start_time_unix_secs * 1000) : new Date(),
      durationSecs: d.metadata ? d.metadata.call_duration_secs : undefined,
      transcript: (Array.isArray(d.transcript) ? d.transcript : []).slice(0, 400).map(t => ({
        role: t.role === 'agent' ? 'agent' : 'user',
        message: String(t.message || '').slice(0, 2000),
        timeInCallSecs: t.time_in_call_secs
      })),
      summary: d.analysis && typeof d.analysis.transcript_summary === 'string' ? d.analysis.transcript_summary.slice(0, 2000) : undefined
    }).save();
    res.json({ ok: true }); // answer ElevenLabs at once; Gemini runs after
    processCall(log);
  } catch (err) {
    if (err.code === 11000) return res.json({ ok: true, duplicate: true });
    console.error('Voice agent webhook error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// GET /api/voice-agent/logs - admin: recent call logs (newest first)
router.get('/logs', adminAuth, async (req, res) => {
  const logs = await CallLog.find().sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 50, 200));
  res.json(logs);
});

// POST /api/voice-agent/logs/:id/retry - admin: run Gemini + registration again (e.g. after an error)
router.post('/logs/:id/retry', adminAuth, async (req, res) => {
  const log = await CallLog.findOne({ conversationId: req.params.id });
  if (!log) return res.status(404).json({ msg: 'Not found' });
  await processCall(log);
  res.json(log);
});

module.exports = { router, validSignature, processCall };
