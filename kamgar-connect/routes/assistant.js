// WEB VERSION — FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio');
const CallSession = require('../models/CallSession');
const Worker = require('../models/Worker');
const bcrypt = require('bcryptjs');
const twilioWebhook = require('../middleware/twilioWebhook');
const { parseNumber, matchCity, matchSkill, extractName, localPhone } = require('../utils/voiceParse');

// ── Rate Limiter: 60 requests per minute per IP ──
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 60;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap.get(ip).filter(t => now - t < windowMs);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  if (timestamps.length > maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }
  next();
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const filtered = timestamps.filter(t => now - t < 60000);
    if (filtered.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, filtered);
    }
  }
}, 300000);

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  systemInstruction: `You are Mitra, a friendly assistant for Kamgar Connect, a job platform for daily wage workers in Indian cities. Always reply in the same language the user is speaking — English, Hindi, or Marathi. Keep all answers very short and simple — many users have low literacy. Help with: registering as a worker, finding workers, posting jobs, understanding payments, tracking jobs. Never use complex words. Always be warm and encouraging.`
});

// POST /api/assistant/chat
router.post('/chat', rateLimit, async (req, res) => {
  try {
    const { message, history } = req.body;
    
    const chat = model.startChat({ 
      history: history || [] 
    });
    
    const result = await chat.sendMessage(message);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error('Gemini API Error:', err.message);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// POST /api/assistant/tts (ElevenLabs Proxy)
router.post('/tts', rateLimit, async (req, res) => {
  try {
    const { text, language } = req.body;
    
    // Map voice IDs based on requested language
    // Rachel (default) = 21m00Tcm4TlvDq8ikWAM, Matilda = XrExE9yKIg1WjnnlVkGX
    let voiceId = '21m00Tcm4TlvDq8ikWAM'; 
    if (language === 'hi' || language === 'hindi') {
      voiceId = 'XrExE9yKIg1WjnnlVkGX';
    } else if (language === 'mr' || language === 'marathi') {
      // Use Web Speech API for Marathi fallback
      return res.status(400).json({ msg: 'Marathi uses client fallback' });
    }

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    // If no key provided, fallback to client synthesis
    if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY === 'your_elevenlabs_api_key_here') {
      return res.status(400).json({ msg: 'Using client fallback' });
    }

    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs Error: ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length
    });
    
    res.send(buffer);
  } catch (err) {
    console.error('TTS Proxy Error:', err.message);
    // Explicit 400 so frontend knows to use fallback Synthesis
    res.status(400).json({ error: 'Failed to proxy audio' });
  }
});

// ── Phone registration call (Twilio speech, Hindi) ──
// A caller answers 6 questions; when done, a worker profile is created
// with their phone number, so they can also log in on the website.
const QUESTIONS = [
  null,
  'आपका नाम क्या है?',
  'आप किस शहर में रहते हैं?',
  'आपका काम क्या है? जैसे कि प्लम्बर, इलेक्ट्रीशियन, मिस्त्री।',
  'आपको कितने साल का अनुभव है?',
  'एक दिन की कितनी दिहाड़ी लेते हैं आप?',
  'हफ़्ते में कितने दिन काम कर सकते हैं?'
];
const LAST_QUESTION = QUESTIONS.length - 1;
const VOICE = { voice: 'Polly.Aditi', language: 'hi-IN' };
const MAX_SILENT_TURNS = 2;

// Speaks the text and listens for the caller's answer
function ask(twiml, text) {
  const gather = twiml.gather({ input: 'speech', action: '/api/assistant/gather', language: 'hi-IN', speechTimeout: 'auto' });
  gather.say(VOICE, text);
  // If the caller says nothing, Twilio continues here: counts as a silent turn
  twiml.redirect({ method: 'POST' }, '/api/assistant/gather');
}

function sayAndHangUp(twiml, text) {
  twiml.say(VOICE, text);
  twiml.hangup();
}

// Creates the worker profile from a finished registration call (only once)
async function saveWorkerFromCall(session) {
  if (session.workerId || !session.phone) return;
  const existing = await Worker.findOne({ phone: session.phone });
  if (existing) { session.workerId = existing._id; return; }

  const d = session.collectedData;
  const worker = new Worker({
    name: d.name || 'Caller',
    phone: session.phone,
    city: d.city || 'Unknown',
    skill: d.skill || 'Unknown',
    experience: d.experience_years || 0,
    expectedSalary: d.expected_salary_per_day || undefined,
    availability: d.availability_days ? [`${d.availability_days} days/week`] : [],
    // Same login rule as website sign-up: the phone number
    password: await bcrypt.hash(session.phone, await bcrypt.genSalt(10))
  });
  await worker.save();
  session.workerId = worker._id;
}

// POST /api/assistant/voice - Twilio calls this when someone rings the number
router.post('/voice', twilioWebhook, express.urlencoded({ extended: false }), async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  try {
    const { CallSid, From } = req.body;
    const phone = localPhone(From);

    // Already registered: greet by name instead of registering again
    const existing = phone ? await Worker.findOne({ phone }) : null;
    if (existing) {
      sayAndHangUp(twiml, `नमस्ते ${existing.name}! आप पहले से कामगार कनेक्ट पर रजिस्टर हैं। काम मिलने पर हम आपको कॉल करेंगे। धन्यवाद।`);
    } else {
      let session = await CallSession.findOne({ callSid: CallSid });
      if (!session) {
        session = new CallSession({ callSid: CallSid, phone, currentQuestion: 1 });
        await session.save();
      }
      ask(twiml, 'नमस्ते! कामगार कनेक्ट में आपका स्वागत है। ' + QUESTIONS[1]);
    }
  } catch (err) {
    console.error('Voice Webhook Error:', err);
    sayAndHangUp(twiml, 'माफ़ कीजिए, एक तकनीकी समस्या है। कृपया फिर से कॉल करें।');
  }
  res.type('text/xml').send(twiml.toString());
});

// POST /api/assistant/gather - each answer the caller speaks
router.post('/gather', twilioWebhook, express.urlencoded({ extended: false }), async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  try {
    const { CallSid } = req.body;
    const speech = (req.body.SpeechResult || '').trim();
    const session = await CallSession.findOne({ callSid: CallSid });

    if (!session) {
      sayAndHangUp(twiml, 'माफ़ कीजिए, एक तकनीकी समस्या है। कृपया फिर से कॉल करें।');
    } else if (session.currentQuestion > LAST_QUESTION) {
      sayAndHangUp(twiml, 'आपकी जानकारी रजिस्टर हो गई है। धन्यवाद।');
    } else if (!speech) {
      session.silentTurns += 1;
      await session.save();
      if (session.silentTurns > MAX_SILENT_TURNS) {
        sayAndHangUp(twiml, 'हमें आपकी आवाज़ नहीं सुनाई दी। कृपया बाद में फिर से कॉल करें। धन्यवाद।');
      } else {
        ask(twiml, 'माफ़ कीजिए, आवाज़ नहीं आई। ' + QUESTIONS[session.currentQuestion]);
      }
    } else {
      session.silentTurns = 0;
      session.conversationHistory.push({ role: 'user', content: speech });

      const data = session.collectedData;
      switch (session.currentQuestion) {
        case 1: data.name = extractName(speech) || speech; break;
        case 2: data.city = matchCity(speech) || speech; break;
        case 3: data.skill = matchSkill(speech) || speech; break;
        case 4: data.experience_years = parseNumber(speech) || 0; break;
        case 5: data.expected_salary_per_day = parseNumber(speech) || 0; break;
        case 6: data.availability_days = parseNumber(speech) || 0; break;
      }
      session.currentQuestion += 1;

      if (session.currentQuestion <= LAST_QUESTION) {
        const next = 'धन्यवाद। ' + QUESTIONS[session.currentQuestion];
        session.conversationHistory.push({ role: 'assistant', content: next });
        await session.save();
        ask(twiml, next);
      } else {
        await saveWorkerFromCall(session);
        const done = 'धन्यवाद! आपकी जानकारी रजिस्टर हो गई है। काम मिलने पर हम आपको कॉल करेंगे।';
        session.conversationHistory.push({ role: 'assistant', content: done });
        await session.save();
        sayAndHangUp(twiml, done);
      }
    }
  } catch (err) {
    console.error('Gather Webhook Error:', err);
    sayAndHangUp(twiml, 'माफ़ कीजिए, एक तकनीकी समस्या है। कृपया फिर से कॉल करें।');
  }
  res.type('text/xml').send(twiml.toString());
});

module.exports = router;

