const twilio = require('twilio');

// Twilio webhooks: once TWILIO_AUTH_TOKEN is set, reject requests that were
// not signed by Twilio (stops anyone else from faking call events).
// Without the token (Twilio not set up yet) requests pass through.
module.exports = function (req, res, next) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return next();

  const url = (process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`) + req.originalUrl;
  const valid = twilio.validateRequest(token, req.header('X-Twilio-Signature') || '', url, req.body || {});
  if (!valid) return res.status(403).type('text/plain').send('Invalid Twilio signature');
  next();
};
