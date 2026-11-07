// Adds a message to someone's in-app inbox (and pings their open website over the socket).
// Never throws: a failed message must not break the action that caused it.
const Notification = require('../models/Notification');

const TYPES = ['booking_new', 'booking_confirmed', 'booking_declined', 'booking_cancelled', 'booking_noshow',
  'job_taken', 'job_left', 'job_started', 'job_done', 'job_noshow', 'job_cancelled', 'offer_new', 'offer_accepted', 'offer_declined', 'review_new'];

async function notify(io, userId, role, type, data = {}) {
  try {
    if (!userId || !TYPES.includes(type)) return;
    const clean = {};
    for (const k of ['name', 'date', 'time', 'jobType']) if (typeof data[k] === 'string') clean[k] = data[k].slice(0, k === 'name' ? 80 : 40);
    for (const k of ['amount', 'rating']) if (typeof data[k] === 'number' && Number.isFinite(data[k])) clean[k] = data[k];
    await Notification.create({ userId, role, type, data: clean });
    if (io) io.to(`user-${userId}`).emit('inbox', { type });
  } catch (e) { console.error('inbox:', e.message); }
}
module.exports = { notify, TYPES };
