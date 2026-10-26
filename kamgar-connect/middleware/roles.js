// Use after the auth middleware, which sets req.user = { id, role }

// Only users with this role ('worker' or 'employer') may continue
exports.requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ msg: 'Not authorized' });
  }
  next();
};

// Only the user whose id is in req.params[param] may continue
exports.requireSelf = (param = 'id') => (req, res, next) => {
  if (!req.user || req.user.id !== req.params[param]) {
    return res.status(403).json({ msg: 'Not authorized' });
  }
  next();
};
