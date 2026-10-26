const crypto = require('crypto');

// Admin-only routes: the Authorization header must equal ADMIN_PASSWORD.
// If ADMIN_PASSWORD is not set, admin access stays closed instead of open.
module.exports = function (req, res, next) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(503).json({ msg: 'Admin access is not configured' });
  }

  const given = Buffer.from(req.header('Authorization') || '');
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return res.status(401).json({ msg: 'Unauthorized' });
  }
  next();
};
