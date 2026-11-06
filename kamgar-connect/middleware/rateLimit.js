// In-memory rate limiter: at most maxRequests per visitor IP within windowMs

// The visitor's real IP. kamgar-api runs behind Cloudflare (Render's edge), which always
// overwrites CF-Connecting-IP with the real address; X-Forwarded-For can be faked by the
// visitor, so it is only the fallback (local runs and tests have no Cloudflare).
const visitorIp = (req) => req.header('cf-connecting-ip') || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';

module.exports = function rateLimit({ windowMs = 60000, maxRequests = 60, message = 'Too many requests. Please wait a minute.' } = {}) {
  const hits = new Map();

  // Clean up old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const filtered = timestamps.filter(t => now - t < windowMs);
      if (filtered.length === 0) hits.delete(ip);
      else hits.set(ip, filtered);
    }
  }, 300000).unref();

  return function (req, res, next) {
    const ip = visitorIp(req);
    const now = Date.now();
    const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs);
    timestamps.push(now);
    hits.set(ip, timestamps);

    if (timestamps.length > maxRequests) {
      return res.status(429).json({ error: message });
    }
    next();
  };
};

module.exports.visitorIp = visitorIp;
