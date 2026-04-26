// WEB VERSION � FULLY TESTED AND WORKING
// This code is the final base for the mobile app
// Do not change core logic when converting to React Native
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const twilio = require('twilio');
const Call = require('../models/Call');
const Worker = require('../models/Worker');
const Employer = require('../models/Employer');
const { sendPushNotification } = require('../utils/notifications');

let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// ── Helper: format Indian phone number for Twilio ──
function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return '+' + digits;
  if (digits.length === 10) return '+91' + digits;
  if (digits.startsWith('+')) return digits;
  return '+91' + digits;
}

// ── Helper: get base URL for Twilio webhooks ──
function getBaseUrl(req) {
  // In production use the BACKEND_URL env or the request host
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  return `${req.protocol}://${req.get('host')}`;
}

/* ═══════════════════════════════════════════
   POST /api/calls/notify/:workerId
   Admin clicks CALL → simple Hindi notification
   ═══════════════════════════════════════════ */
router.post('/notify/:workerId', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.workerId);
    if (!worker) return res.status(404).json({ success: false, msg: 'Worker not found' });

    const baseUrl = getBaseUrl(req);
    let callSid = 'MOCK_SID_' + Date.now();

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const call = await twilioClient.calls.create({
          url: `${baseUrl}/api/calls/twiml-notify?workerId=${worker._id}`,
          to: formatPhone(worker.phone),
          from: process.env.TWILIO_PHONE_NUMBER,
          statusCallback: `${baseUrl}/api/calls/webhook`,
          statusCallbackEvent: ['answered', 'completed', 'failed', 'no-answer', 'busy']
        });
        callSid = call.sid;
      } catch (twilioErr) {
        console.error('Twilio notify call failed:', twilioErr.message);
        // Update worker status even on failure
        await Worker.findByIdAndUpdate(worker._id, {
          last_called_at: new Date(),
          call_status: 'failed'
        });
        return res.status(500).json({ success: false, msg: 'Twilio call failed: ' + twilioErr.message });
      }
    }

    // Save call record
    const callRecord = new Call({
      receiverId: worker._id,
      callerType: 'admin',
      callType: 'notify',
      callSid,
      status: 'initiated'
    });
    await callRecord.save();

    // Update worker
    await Worker.findByIdAndUpdate(worker._id, {
      last_called_at: new Date(),
      call_status: 'called'
    });

    res.json({ success: true, msg: 'Call initiated', callSid });
  } catch (err) {
    console.error('Notify error:', err.message);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

/* ═══════════════════════════════════════════
   POST /api/calls/twiml-notify
   TwiML for the simple notification call
   ═══════════════════════════════════════════ */
router.post('/twiml-notify', express.urlencoded({ extended: false }), (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  twiml.say(
    { voice: 'Polly.Aditi', language: 'hi-IN' },
    'Namaste! Yeh Kamgar Connect hai. Aapko kal kaam milega. Kripya samay par pahunchein. Dhanyavaad.'
  );

  twiml.pause({ length: 1 });
  twiml.hangup();

  res.type('text/xml');
  res.send(twiml.toString());
});

/* ═══════════════════════════════════════════
   POST /api/calls/assign-job
   Admin clicks    // Save call record first so TwiML webhook can look it up
    const callRecord = new Call({
      receiverId: worker._id,
      callerType: 'admin',
      callType: 'assign',
      callSid, 
      status: 'initiated',
      assignmentData: {
        location,
        date,
        time,
        employerName,
        instructions: req.body.instructions || '',
        workerResponse: 'pending'
      }
    });
    await callRecord.save();

    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const lang = worker.language || 'hi';
        const call = await twilioClient.calls.create({
          url: `${baseUrl}/api/calls/twiml-assign?callRecordId=${callRecord._id}&lang=${lang}`,
          to: formatPhone(worker.phone),
          from: process.env.TWILIO_PHONE_NUMBER,
          statusCallback: `${baseUrl}/api/calls/webhook`,
          statusCallbackEvent: ['answered', 'completed', 'failed', 'no-answer', 'busy']
        });
        callSid = call.sid;
        callRecord.callSid = callSid;
        await callRecord.save();
      } catch (twilioErr) {
        console.error('Twilio assign call failed:', twilioErr.message);
        callRecord.status = 'failed';
        callRecord.assignmentData.workerResponse = 'declined';
        await callRecord.save();

        await Worker.findByIdAndUpdate(worker._id, {
          last_called_at: new Date(),
          call_status: 'assign-failed'
        });

        return res.status(500).json({ success: false, msg: 'Twilio call failed: ' + twilioErr.message });
      }
    }

    // Update worker
    await Worker.findByIdAndUpdate(worker._id, {
      last_called_at: new Date(),
      call_status: 'assign-pending'
    });

    res.json({ success: true, msg: 'Assignment call initiated', callSid, callRecordId: callRecord._id });
  } catch (err) {
    console.error('Assign-job error:', err.message);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

/* ═══════════════════════════════════════════
   POST /api/calls/twiml-assign
   TwiML for the assign job call with Gather
   ═══════════════════════════════════════════ */
router.post('/twiml-assign', express.urlencoded({ extended: false }), async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  try {
    const callRecordId = req.query.callRecordId;
    const lang = req.query.lang || 'hi';

    const callRecord = await Call.findById(callRecordId);
    if (!callRecord || !callRecord.assignmentData) {
      twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Kshama karein, kuch gadbad ho gayi.');
      twiml.hangup();
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const worker = await Worker.findById(callRecord.receiverId);
    const name = worker ? worker.name : 'Worker';
    const skill = worker ? worker.skill : 'Kaam';
    const { location, date, time, employerName } = callRecord.assignmentData;

    const baseUrl = getBaseUrl(req);

    const gather = twiml.gather({
      numDigits: 1,
      action: `${baseUrl}/api/calls/job-response?callRecordId=${callRecordId}`,
      method: 'POST',
      timeout: 10
    });

    if (lang === 'en') {
      gather.say(
        { voice: 'Polly.Raveena', language: 'en-IN' },
        `Hello ${name}! You have been hired by ${employerName}. Please report to ${location} on ${date} at ${time}. Your job is ${skill} work. Press 1 to confirm, press 2 to decline.`
      );
    } else if (lang === 'mr') {
      gather.say(
        { voice: 'Polly.Aditi', language: 'hi-IN' },
        `Namaskar ${name}! ${employerName} ne tumhala hire kele ahe. Tumhi ${location} yethey ${date} roji ${time} vajta yayche ahe. Kaam aahe: ${skill}. Yaayche asel tar 1 daba, nahi yet asel tar 2 daba.`
      );
    } else {
      // Hindi
      gather.say(
        { voice: 'Polly.Aditi', language: 'hi-IN' },
        `Namaste ${name}! ${employerName} ne aapko hire kiya hai. Aapko ${location} par ${date} ko ${time} baje pahunchna hai. Kaam hai: ${skill}. Agar aap aa sakte hain toh 1 dabayein, nahi aa sakte toh 2 dabayein.`
      );
    }

    twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Koi jawab nahi aaya. Dhanyavaad.');
    twiml.hangup();

  } catch (err) {
    console.error('TwiML assign error:', err.message);
    twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Kshama karein, kuch gadbad ho gayi.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

/* ═══════════════════════════════════════════
   POST /api/calls/job-response
   Twilio webhook when worker presses 1 or 2
   ═══════════════════════════════════════════ */
router.post('/job-response', express.urlencoded({ extended: false }), async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();

  try {
    const digit = req.body.Digits;
    const callRecordId = req.query.callRecordId;

    const callRecord = await Call.findById(callRecordId);
    if (!callRecord) return res.status(404).send('Not Found');

    const worker = await Worker.findById(callRecord.receiverId);
    const workerName = worker ? worker.name : 'Worker';
    const workerPhone = worker ? worker.phone : '';
    const { location, date, time, employerName } = callRecord.assignmentData;

    if (digit === '1') {
      callRecord.assignmentData.workerResponse = 'confirmed';
      callRecord.status = 'completed';
      await callRecord.save();

      if (worker) await Worker.findByIdAndUpdate(worker._id, { call_status: 'job-confirmed' });

      twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Dhanyavaad! Aapka kaam confirm ho gaya hai.');

      if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        // SMS to employer
        try {
          const employer = await Employer.findOne({ name: { $regex: new RegExp(employerName, 'i') } });
          const toPhone = employer ? employer.phone : null;
          if (toPhone) {
            await twilioClient.messages.create({
              body: `${workerName} confirmed! They will arrive at ${location} on ${date} at ${time}. Contact: ${workerPhone}`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: formatPhone(toPhone)
            });
          }
        } catch (e) {}

        // SMS to worker
        try {
          if (workerPhone) {
            await twilioClient.messages.create({
              body: `Tumhara kaam confirm ho gaya. ${location} par ${date} ko ${time} baje pahuncho. — Kamgar Connect`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: formatPhone(workerPhone)
            });
          }
        } catch (e) {}
      }

    } else {
      callRecord.assignmentData.workerResponse = 'declined';
      callRecord.status = 'completed';
      await callRecord.save();

      if (worker) await Worker.findByIdAndUpdate(worker._id, { call_status: 'job-declined' });

      twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, 'Theek hai, dhanyavaad.');

      if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        // SMS to employer
        try {
          const employer = await Employer.findOne({ name: { $regex: new RegExp(employerName, 'i') } });
          const toPhone = employer ? employer.phone : null;
          if (toPhone) {
            await twilioClient.messages.create({
              body: `${workerName} is unavailable. Please search for another worker.`,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: formatPhone(toPhone)
            });
          }
        } catch (e) {}
      }
    }

    twiml.hangup();
  } catch (err) {
    console.error('Job-response error:', err.message);
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

/* ═══════════════════════════════════════════
   POST /api/calls/twiml  (existing bridge call)
   ═══════════════════════════════════════════ */
router.post('/twiml', express.urlencoded({ extended: false }), (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const toNumber = req.query.toNumber;
  if (toNumber) {
    twiml.dial({ callerId: process.env.TWILIO_PHONE_NUMBER }, toNumber);
  } else {
    twiml.say('Sorry, an error occurred routing the call.');
  }
  res.type('text/xml');
  res.send(twiml.toString());
});

/* ═══════════════════════════════════════════
   POST /api/calls/webhook  (Twilio status updates)
   ═══════════════════════════════════════════ */
router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    const callRecord = await Call.findOne({ callSid: CallSid });
    if (callRecord) {
      callRecord.status = CallStatus;
      if (CallDuration) callRecord.duration = parseInt(CallDuration);

      // If call failed/no-answer for an assignment, mark as declined
      if (['failed', 'no-answer', 'busy', 'canceled'].includes(CallStatus) && callRecord.callType === 'assign') {
        callRecord.assignmentData.workerResponse = 'declined';
        // Update worker
        await Worker.findByIdAndUpdate(callRecord.receiverId, { call_status: 'no-answer' });
      }

      await callRecord.save();
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ═══════════════════════════════════════════
   POST /api/calls/initiate  (existing employer→worker bridge)
   ═══════════════════════════════════════════ */
router.post('/initiate', auth, async (req, res) => {
  try {
    const { receiverId, jobId } = req.body;

    const employer = await Employer.findById(req.user.id);
    const worker = await Worker.findById(receiverId);

    if (!employer || !worker) return res.status(404).json({ msg: 'User not found' });

    let call;
    try {
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        const baseUrl = getBaseUrl(req);
        call = await twilioClient.calls.create({
          url: `${baseUrl}/api/calls/twiml?toNumber=${encodeURIComponent(formatPhone(worker.phone))}`,
          to: formatPhone(employer.phone),
          from: process.env.TWILIO_PHONE_NUMBER,
          statusCallback: `${baseUrl}/api/calls/webhook`,
          statusCallbackEvent: ['answered', 'completed']
        });
      }
    } catch (twilioErr) {
      console.error('Twilio Call Initiation Failed', twilioErr.message);
    }

    const callRecord = new Call({
      callerId: employer.id,
      receiverId: worker.id,
      callerType: 'employer',
      jobId,
      callSid: call ? call.sid : 'MOCK_SID_' + Date.now(),
      status: 'initiated'
    });

    await callRecord.save();

    // Socket notification
    if (req.io) {
      req.io.to(`user-${worker.id}`).emit('incoming-call', {
        callerName: employer.name,
        jobId
      });
    }

    res.json(callRecord);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

/* ═══════════════════════════════════════════
   GET /api/calls/history/:workerId
   Call history for a specific worker
   ═══════════════════════════════════════════ */
router.get('/history/:workerId', async (req, res) => {
  try {
    const calls = await Call.find({
      receiverId: req.params.workerId
    }).sort({ timestamp: -1 }).limit(50);

    res.json(calls);
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;

