// Website bookings ("assign" call records): dates are India dates "YYYY-MM-DD".
// A booking only takes the worker off the search list ON its work day.
const Call = require('../models/Call');
const Worker = require('../models/Worker');

const IST_MS = 330 * 60000;
// How far ahead an employer may book
const MAX_DAYS_AHEAD = 14;
// Bookings that still count (not turned down by the worker or cancelled by the employer)
const ACTIVE = { $nin: ['declined', 'cancelled'] };

// "YYYY-MM-DD" in India, n days from today
const istDate = (n = 0) => new Date(Date.now() + IST_MS + n * 86400000).toISOString().slice(0, 10);
// Minutes since midnight, India time
const istMinutesNow = () => { const d = new Date(Date.now() + IST_MS); return d.getUTCHours() * 60 + d.getUTCMinutes(); };

// A real calendar day "YYYY-MM-DD" (2026-11-31 is not)
const isDay = (s) => {
  if (typeof s !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) ? false : d.toISOString().slice(0, 10) === s;
};
const endOfDay = (s) => new Date(`${s}T23:59:59+05:30`);

// Error message for a work date + reporting time, or null when fine
function bookingDateError(date, time) {
  if (!isDay(date)) return 'Please choose a date';
  if (date < istDate(0)) return 'Please choose today or a future date';
  if (date > istDate(MAX_DAYS_AHEAD)) return `You can book at most ${MAX_DAYS_AHEAD} days ahead`;
  if (typeof time !== 'string') return 'Please choose a reporting time';
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return 'Please choose a reporting time';
  const mins = Number(m[1]) * 60 + Number(m[2]);
  if (Number(m[1]) > 23 || Number(m[2]) > 59) return 'Please choose a reporting time';
  // Today: the reporting time may not be more than an hour ago
  if (date === istDate(0) && mins < istMinutesNow() - 60) return 'That time has already passed today';
  return null;
}

// Workers booked for today are taken off the search list (bookings made earlier for today
// start here). Called before every search, like the other expiry checks.
async function activateTodaysBookings() {
  const today = istDate(0);
  const calls = await Call.find({ callType: 'assign', 'assignmentData.date': today, 'assignmentData.workerResponse': ACTIVE })
    .select('callerId receiverId').limit(1000);
  const until = endOfDay(today);
  for (const c of calls) {
    const w = await Worker.findOneAndUpdate(
      { _id: c.receiverId, $or: [{ hiredUntil: null }, { hiredUntil: { $lt: new Date() } }] },
      { $set: { hiredUntil: until, hiredBy: c.callerId, isLooking: false, availableUntil: null } }
    ).select('isLooking availableUntil');
    // Remember whether they were live, to put them back if the booking ends early
    if (w) { if (w.isLooking) { if (w.availableUntil > new Date()) await Call.updateOne({ _id: c._id }, { $set: { 'assignmentData.prevAvailableUntil': w.availableUntil } }); } }
  }
}

// A booking for today ended early (declined, cancelled, released): free the worker and,
// if they were live before it, put them back on the list until their old time
async function freeWorkerFromBooking(call) {
  const a = call.assignmentData || {};
  if (a.date !== istDate(0)) return;
  const prev = a.prevAvailableUntil ? new Date(a.prevAvailableUntil) : null;
  const back = prev ? prev > new Date() : false;
  await Worker.updateOne({ _id: call.receiverId, hiredBy: call.callerId },
    { $set: back ? { hiredUntil: null, hiredBy: null, isLooking: true, availableUntil: prev } : { hiredUntil: null, hiredBy: null } });
}

// The key that makes "one booking per worker per day" hold even for requests at the same moment
const activeKey = (workerId, date) => `${workerId}:${date}`;

module.exports = { ACTIVE, MAX_DAYS_AHEAD, istDate, isDay, endOfDay, bookingDateError, activateTodaysBookings, freeWorkerFromBooking, activeKey };
