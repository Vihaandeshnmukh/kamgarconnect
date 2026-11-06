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

const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) ? !isNaN(new Date(`${s}T00:00:00+05:30`).getTime()) : false;
const endOfDay = (s) => new Date(`${s}T23:59:59+05:30`);

// Error message for a work date + reporting time, or null when fine
function bookingDateError(date, time) {
  if (!isDay(date)) return 'Please choose a date';
  if (date < istDate(0)) return 'Please choose today or a future date';
  if (date > istDate(MAX_DAYS_AHEAD)) return `You can book at most ${MAX_DAYS_AHEAD} days ahead`;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(time || ''));
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
    await Worker.updateOne(
      { _id: c.receiverId, $or: [{ hiredUntil: null }, { hiredUntil: { $lt: new Date() } }] },
      { $set: { hiredUntil: until, hiredBy: c.callerId, isLooking: false, availableUntil: null } }
    );
  }
}

module.exports = { ACTIVE, MAX_DAYS_AHEAD, istDate, isDay, endOfDay, bookingDateError, activateTodaysBookings };
