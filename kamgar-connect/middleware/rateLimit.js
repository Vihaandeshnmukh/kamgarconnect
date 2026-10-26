// In-memory rate limiter: at most maxRequests per IP within windowMs
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
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
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
