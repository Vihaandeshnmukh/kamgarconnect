// Live phone conversations with "Mitra" (ElevenLabs Agent): bridges Exotel's
// Voicebot audio stream to the ElevenLabs Agents WebSocket and back.
//
//   caller <-> Exotel Voicebot applet <-> wss://api.kamgar.de/api/voice-bridge/exotel?key=...
//                                       <-> ElevenLabs agent (Gemini + expressive voice)
//
// Both sides use 16-bit PCM at 8 kHz (the agent is configured for pcm_8000), so audio
// is only re-packaged: Exotel wants chunks of 3200-100000 bytes in multiples of 320.
// When the call ends, ElevenLabs posts the transcript to /api/voice-agent/webhook.
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const CallLog = require('../models/CallLog');
const { localPhone } = require('./voiceParse');

const PATH = '/api/voice-bridge/exotel';
const CHUNK = 3200; // smallest chunk Exotel accepts (200 ms at 8 kHz)
const FLUSH_MS = 120; // send a partial (padded) chunk if no more agent audio arrives

// --- G.711 mu-law <-> 16-bit PCM (only used if Exotel streams mu-law instead of PCM) ---
function muLawToPcm(buf) {
  const out = Buffer.alloc(buf.length * 2);
  for (let i = 0; i < buf.length; i++) {
    const u = ~buf[i] & 0xff;
    let t = ((u & 0x0f) << 3) + 0x84;
    t <<= (u & 0x70) >> 4;
    out.writeInt16LE(u & 0x80 ? 0x84 - t : t - 0x84, i * 2);
  }
  return out;
}
function pcmToMuLaw(buf) {
  const out = Buffer.alloc(buf.length >> 1);
  for (let i = 0; i < out.length; i++) {
    let s = buf.readInt16LE(i * 2);
    const sign = s < 0 ? 0x80 : 0;
    if (s < 0) s = -s;
    s = Math.min(s, 32635) + 0x84;
    let exp = 7;
    for (let mask = 0x4000; (s & mask) === 0 && exp > 0; mask >>= 1) exp--;
    out[i] = ~(sign | (exp << 4) | ((s >> (exp + 3)) & 0x0f)) & 0xff;
  }
  return out;
}

const keyOk = (given) => {
  const expected = process.env.EXOTEL_WEBHOOK_KEY;
  if (!expected || !given) return false;
  const a = Buffer.from(String(given)), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// A one-time URL to start a conversation with our (private) agent
async function signedAgentUrl() {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId || !process.env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_AGENT_ID / ELEVENLABS_API_KEY not set');
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.signed_url) throw new Error(`signed url ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  return body.signed_url;
}

// One phone call: Exotel socket <-> ElevenLabs socket
function bridgeCall(exotel) {
  let streamSid = null, callSid = null, phone = null, muLaw = false;
  let agent = null, agentReady = false;
  const pendingAudio = []; // caller audio received before the agent socket opened
  let out = Buffer.alloc(0), flushTimer = null;
  let closed = false;

  const sendToExotel = (msg) => { if (exotel.readyState === WebSocket.OPEN) exotel.send(JSON.stringify(msg)); };
  const playChunk = (pcm) => sendToExotel({ event: 'media', stream_sid: streamSid, media: { payload: (muLaw ? pcmToMuLaw(pcm) : pcm).toString('base64') } });

  // Agent audio -> Exotel, in 3200-byte multiples (the tail is padded with silence)
  const flush = (all) => {
    clearTimeout(flushTimer);
    const whole = Math.floor(out.length / CHUNK) * CHUNK;
    if (whole > 0) { playChunk(out.subarray(0, whole)); out = out.subarray(whole); }
    if (all && out.length > 0) { playChunk(Buffer.concat([out, Buffer.alloc(CHUNK - out.length)])); out = Buffer.alloc(0); }
  };
  const queueAgentAudio = (pcm) => {
    out = Buffer.concat([out, pcm]);
    if (out.length >= CHUNK) flush(false);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => flush(true), FLUSH_MS);
  };

  const endAll = (why) => {
    if (closed) return;
    closed = true;
    clearTimeout(flushTimer);
    console.log('Voice bridge closed:', callSid, why);
    try { if (agent && agent.readyState === WebSocket.OPEN) agent.close(); } catch {}
    // Closing Exotel's socket ends the Voicebot applet; the flow moves on (Hangup)
    try { if (exotel.readyState === WebSocket.OPEN) exotel.close(); } catch {}
  };

  const sendCallerAudio = (pcm) => {
    const msg = JSON.stringify({ user_audio_chunk: pcm.toString('base64') });
    if (agentReady) agent.send(msg); else if (pendingAudio.length < 100) pendingAudio.push(msg);
  };

  async function connectAgent() {
    try {
      agent = new WebSocket(await signedAgentUrl());
    } catch (err) {
      console.error('Voice bridge: agent unavailable:', err.message);
      return endAll('agent unavailable');
    }
    agent.on('open', () => {
      agent.send(JSON.stringify({ type: 'conversation_initiation_client_data' }));
      agentReady = true;
      while (pendingAudio.length) agent.send(pendingAudio.shift());
    });
    agent.on('message', async (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.type === 'audio' && m.audio_event && m.audio_event.audio_base_64) {
        queueAgentAudio(Buffer.from(m.audio_event.audio_base_64, 'base64'));
        if (m.audio_event.is_final) flush(true);
      } else if (m.type === 'agent_response_complete') {
        flush(true);
      } else if (m.type === 'interruption') {
        // Caller spoke over the agent: drop what hasn't played yet
        out = Buffer.alloc(0); clearTimeout(flushTimer);
        sendToExotel({ event: 'clear', stream_sid: streamSid });
      } else if (m.type === 'ping' && m.ping_event) {
        agent.send(JSON.stringify({ type: 'pong', event_id: m.ping_event.event_id }));
      } else if (m.type === 'conversation_initiation_metadata' && m.conversation_initiation_metadata_event) {
        // Remember who called, so the post-call webhook can register the right number
        const conversationId = m.conversation_initiation_metadata_event.conversation_id;
        try {
          await CallLog.updateOne({ conversationId }, { $setOnInsert: { conversationId, provider: 'exotel-voicebot', phone, status: 'in-call', startedAt: new Date() } }, { upsert: true });
        } catch (err) { console.error('Voice bridge: call log failed:', err.message); }
      }
    });
    agent.on('close', () => { flush(true); setTimeout(() => endAll('agent ended'), 1500); });
    agent.on('error', (err) => { console.error('Voice bridge: agent socket error:', err.message); endAll('agent error'); });
  }

  exotel.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.event === 'start' && m.start) {
      streamSid = m.stream_sid || m.start.stream_sid;
      callSid = m.start.call_sid;
      const p = localPhone(m.start.from);
      phone = /^\d{10}$/.test(p) ? p : null;
      muLaw = /mulaw|ulaw/i.test(String((m.start.media_format || {}).encoding || ''));
      console.log('Voice bridge started:', callSid, muLaw ? 'mu-law' : 'pcm');
      connectAgent();
    } else if (m.event === 'media' && m.media && m.media.payload) {
      const audio = Buffer.from(m.media.payload, 'base64');
      sendCallerAudio(muLaw ? muLawToPcm(audio) : audio);
    } else if (m.event === 'stop') {
      endAll('caller/Exotel stopped');
    }
  });
  exotel.on('close', () => endAll('exotel closed'));
  exotel.on('error', (err) => { console.error('Voice bridge: exotel socket error:', err.message); endAll('exotel error'); });
}

// Adds the bridge to the HTTP server (WebSocket upgrade on PATH, key required)
function attach(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== PATH) return; // other upgrades (Socket.io) are handled elsewhere
    if (!keyOk(url.searchParams.get('key'))) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); return socket.destroy(); }
    wss.handleUpgrade(req, socket, head, (ws) => bridgeCall(ws));
  });
}

module.exports = { attach, muLawToPcm, pcmToMuLaw, PATH };
