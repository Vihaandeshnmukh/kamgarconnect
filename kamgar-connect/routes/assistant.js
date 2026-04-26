// WEB VERSION � FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio');
const CallSession = require('../models/CallSession');

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

// POST /api/assistant/voice - Initial Voice Webhook
router.post('/voice', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { CallSid, From } = req.body;
    
    let session = await CallSession.findOne({ callSid: CallSid });
    if (!session) {
      session = new CallSession({
        callSid: CallSid,
        phone: From,
        language: 'hindi',
        currentQuestion: 1,
        collectedData: {},
        conversationHistory: []
      });
      await session.save();
    }

    const twiml = new twilio.twiml.VoiceResponse();
    const gather = twiml.gather({
      input: 'speech',
      action: '/api/assistant/gather',
      language: 'hi-IN',
      speechTimeout: 'auto'
    });
    gather.say({ language: 'hi-IN' }, 'नमस्ते! कामगार कनेक्ट में आपका स्वागत है। आपका नाम क्या है?');

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (err) {
    console.error('Voice Webhook Error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/assistant/gather - Subsequent Voice Exchanges
router.post('/gather', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { CallSid, SpeechResult } = req.body;
    let session = await CallSession.findOne({ callSid: CallSid });

    if (!session) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ language: 'hi-IN' }, 'माफ़ कीजिए, एक तकनीकी समस्या है। कृपया फिर से कॉल करें।');
      twiml.hangup();
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    session.conversationHistory.push({ role: 'user', content: SpeechResult });

    let nextPrompt = '';

    if (session.currentQuestion === 1) {
      session.collectedData.name = SpeechResult;
      session.currentQuestion = 2;
      nextPrompt = 'धन्यवाद। आप किस शहर में रहते हैं?';
    } else if (session.currentQuestion === 2) {
      session.collectedData.city = SpeechResult;
      session.currentQuestion = 3;
      nextPrompt = 'आपका काम क्या है? जैसे कि प्लम्बर, इलेक्ट्रीशियन।';
    } else if (session.currentQuestion === 3) {
      session.collectedData.skill = SpeechResult;
      session.currentQuestion = 4;
      nextPrompt = 'आपको कितने साल का अनुभव है?';
    } else if (session.currentQuestion === 4) {
      session.collectedData.experience_years = parseInt(SpeechResult ? SpeechResult.replace(/[^0-9]/g, '') : 0) || 0;
      session.currentQuestion = 5;
      nextPrompt = 'एक दिन की कितनी दिहाड़ी लेते हैं आप?';
    } else if (session.currentQuestion === 5) {
      session.collectedData.expected_salary_per_day = parseInt(SpeechResult ? SpeechResult.replace(/[^0-9]/g, '') : 0) || 0;
      session.currentQuestion = 6;
      nextPrompt = 'हफ़्ते में कितने दिन काम कर सकते हैं?';
    } else if (session.currentQuestion === 6) {
      session.collectedData.availability_days = parseInt(SpeechResult ? SpeechResult.replace(/[^0-9]/g, '') : 0) || 0;
      session.currentQuestion = 7;
      nextPrompt = 'धन्यवाद! आपकी जानकारी रजिस्टर हो गई है। हम आपको जल्द ही काम देंगे।';
    } else {
      nextPrompt = 'आपकी जानकारी रजिस्टर हो गई है। धन्यवाद।';
    }

    session.conversationHistory.push({ role: 'assistant', content: nextPrompt });
    await session.save();

    const twiml = new twilio.twiml.VoiceResponse();
    
    if (session.currentQuestion <= 6) {
      const gather = twiml.gather({
        input: 'speech',
        action: '/api/assistant/gather',
        language: 'hi-IN',
        speechTimeout: 'auto'
      });
      gather.say({ language: 'hi-IN' }, nextPrompt);
    } else {
      twiml.say({ language: 'hi-IN' }, nextPrompt);
      twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (err) {
    console.error('Gather Webhook Error:', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;

