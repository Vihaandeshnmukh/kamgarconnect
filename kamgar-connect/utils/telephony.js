// Telephony layer: one way to place calls, whichever provider runs the number.
// TELEPHONY_PROVIDER picks the provider for outbound calls ('exotel' or 'twilio').
// The call flows themselves live in routes/exotel.js (keypad) and routes/assistant.js
// (Twilio speech); both save workers the same way, so switching provider is an
// env change, not a rewrite.
const twilio = require('twilio');

// +91XXXXXXXXXX for a real Indian mobile, or null (demo numbers are never dialled)
function indianMobile(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? '+91' + digits : null;
}

const providers = {
  exotel: {
    configured: () => Boolean(process.env.EXOTEL_SID && process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN && process.env.EXOTEL_CALLER_ID),
    helpline: () => process.env.EXOTEL_CALLER_ID || null,
    // Connects the person to an Exotel flow (built in App Bazaar). CustomField reaches the flow's applets.
    async call({ to, flow, customField, statusCallback }) {
      const flowUrl = { registration: process.env.EXOTEL_REGISTRATION_FLOW_URL, job: process.env.EXOTEL_JOB_FLOW_URL }[flow];
      if (!flowUrl) throw new Error(`No Exotel flow URL set for "${flow}"`);
      const host = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
      const form = new URLSearchParams({ From: to, CallerId: process.env.EXOTEL_CALLER_ID, Url: flowUrl, CallType: 'trans', TimeLimit: '900', TimeOut: '30' });
      if (customField) form.set('CustomField', customField);
      if (statusCallback) { form.set('StatusCallback', statusCallback); form.append('StatusCallbackEvents[0]', 'terminal'); }
      const auth = Buffer.from(`${process.env.EXOTEL_API_KEY}:${process.env.EXOTEL_API_TOKEN}`).toString('base64');
      const res = await fetch(`https://${host}/v1/Accounts/${process.env.EXOTEL_SID}/Calls/connect.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.Call) throw new Error(`Exotel ${res.status}: ${JSON.stringify(data.RestException || data).slice(0, 200)}`);
      return { sid: data.Call.Sid, provider: 'exotel' };
    }
  },
  twilio: {
    configured: () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    helpline: () => process.env.TWILIO_PHONE_NUMBER || null,
    async call({ to, flow, baseUrl, statusCallback }) {
      const url = { registration: `${baseUrl}/api/assistant/voice` }[flow];
      if (!url) throw new Error(`No Twilio flow for "${flow}"`);
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const call = await client.calls.create({ url, to, from: process.env.TWILIO_PHONE_NUMBER, statusCallback, statusCallbackEvent: ['completed'] });
      return { sid: call.sid, provider: 'twilio' };
    }
  }
};

function current() {
  const name = process.env.TELEPHONY_PROVIDER || (providers.exotel.configured() ? 'exotel' : 'twilio');
  return { name, ...providers[name] };
}

// Places an outbound call into one of our flows; throws if no provider is set up
async function placeCall({ to, flow, customField, baseUrl, statusCallback }) {
  const provider = current();
  if (!provider.configured()) throw new Error(`Telephony provider "${provider.name}" is not configured`);
  return provider.call({ to, flow, customField, baseUrl, statusCallback });
}

module.exports = { placeCall, current, indianMobile };
