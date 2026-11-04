// Phone registration by keypad (used with Exotel, whose menus take key presses only).
// Provider-independent: the call route asks prompt() what to play, then passes the
// digits the caller pressed to answer(), which moves the CallSession to the next step.
//
// Steps: lang -> city -> skill -> exp -> wage -> days -> confirm -> saved
// Message-only steps (saved, existing, booked, bye, error) end the call after playing.
const bcrypt = require('bcryptjs');
const Worker = require('../models/Worker');
const { CITIES, SKILLS, numberKeys } = require('./voice/phrases');

const VISIBLE_MS = 24 * 60 * 60 * 1000; // new/returning callers are shown to employers this long
const MAX_RETRIES = 2; // an invalid answer is asked again twice, then a safe default is used
const MAX_SILENT = 2; // turns with no key press before we say goodbye
const END_STEPS = ['saved', 'existing', 'booked', 'bye', 'error'];

const langOf = (code) => (['hi', 'mr', 'en'].includes(code) ? code : 'hi');

// What a step asks for: the clips to play and how many digits to collect
const ASK = {
  lang: () => ({ keys: ['all.language_menu'], maxDigits: 1 }),
  city: (l) => ({ keys: [`${l}.city_menu`], maxDigits: 1 }),
  skill: (l) => ({ keys: [`${l}.skill_menu`], maxDigits: 1 }),
  exp: (l) => ({ keys: [`${l}.exp_q`], maxDigits: 2, finishOnKey: '#', timeout: 6 }),
  wage: (l) => ({ keys: [`${l}.wage_q`], maxDigits: 4, finishOnKey: '#', timeout: 6 }),
  days: (l) => ({ keys: [`${l}.days_q`], maxDigits: 1 }),
  confirm: (l, d) => ({ keys: [...readBack(l, d), `${l}.confirm`], maxDigits: 1, timeout: 6 })
};

// Each answer step: turns the digits into a value (null = invalid) and stores it
const READ = {
  city: (d) => CITIES[Number(d) - 1] || null,
  skill: (d) => SKILLS[Number(d) - 1] || null,
  exp: (d) => (/^\d{1,2}$/.test(d) && Number(d) <= 60 ? Number(d) : null),
  wage: (d) => (/^\d{3,4}$/.test(d) && Number(d) >= 100 && Number(d) <= 5000 ? Number(d) : null),
  days: (d) => (/^[1-7]$/.test(d) ? Number(d) : null)
};
const FIELD = { city: 'city', skill: 'skill', exp: 'experience_years', wage: 'expected_salary_per_day', days: 'availability_days' };
// Used when an answer is still invalid after the re-asks
const FALLBACK = { city: 'Aurangabad', skill: 'Other', exp: 0, wage: null, days: null };
const NEXT = { city: 'skill', skill: 'exp', exp: 'wage', wage: 'days', days: 'confirm' };

// "You told us: Pune, plumber, experience 5 years, daily wage 650 rupees, available 6 days a week."
function readBack(l, d) {
  const keys = [`${l}.rb_intro`];
  if (d.city) keys.push(`${l}.city.${d.city}`);
  if (d.skill) keys.push(`${l}.skill.${d.skill}`);
  if (d.experience_years !== null && d.experience_years !== undefined) keys.push(`${l}.rb_exp`, ...numberKeys(l, d.experience_years), `${l}.rb_years`);
  if (d.expected_salary_per_day) keys.push(`${l}.rb_wage`, ...numberKeys(l, d.expected_salary_per_day), `${l}.rb_rupees`);
  if (d.availability_days) keys.push(`${l}.rb_week`, ...numberKeys(l, d.availability_days), `${l}.rb_days`);
  return keys;
}

// First turn of a call: a known worker is put back on the list; a new caller picks a language
async function begin(session) {
  const worker = session.phone ? await Worker.findOne({ phone: session.phone }) : null;
  if (worker) {
    session.language = langOf(worker.language);
    session.workerId = worker._id;
    if (worker.hiredUntil > new Date()) {
      session.step = 'booked';
    } else {
      await Worker.updateOne({ _id: worker._id }, { isLooking: true, availableUntil: new Date(Date.now() + VISIBLE_MS), isWithdrawn: false });
      session.step = 'existing';
    }
  } else {
    session.step = 'lang';
  }
  session.notice = [];
}

// What to play now: { keys, maxDigits, finishOnKey, timeout }
function prompt(session) {
  const l = langOf(session.language);
  const notice = session.notice || [];
  if (END_STEPS.includes(session.step)) {
    const msg = { saved: 'saved', existing: 'existing', booked: 'booked', bye: 'bye_silent', error: 'error' }[session.step];
    return { keys: [...notice, `${l}.${msg}`], maxDigits: 1, timeout: 1 };
  }
  const ask = ASK[session.step](l, session.collectedData || {});
  return { ...ask, keys: [...notice, ...ask.keys] };
}

// Creates the worker profile from a confirmed registration (once)
async function saveWorker(session) {
  if (session.workerId || !session.phone) return;
  const existing = await Worker.findOne({ phone: session.phone });
  if (existing) { session.workerId = existing._id; return; }
  const d = session.collectedData;
  const worker = new Worker({
    name: session.spokenName || 'Worker',
    phone: session.phone,
    city: d.city || 'Aurangabad',
    skill: d.skill || 'Other',
    experience: d.experience_years || 0,
    expectedSalary: d.expected_salary_per_day || undefined,
    availability: d.availability_days ? [`${d.availability_days} days/week`] : [],
    language: langOf(session.language),
    // Registering by phone means they want work: employers can find them straight away
    isLooking: true,
    availableUntil: new Date(Date.now() + VISIBLE_MS),
    // Same login rule as website sign-up: the phone number
    password: await bcrypt.hash(session.phone, await bcrypt.genSalt(10))
  });
  await worker.save();
  session.workerId = worker._id;
}

// Handles the digits pressed for the current step. Returns 'continue' or 'finish'.
async function answer(session, digits) {
  digits = String(digits || '').replace(/[^0-9*#]/g, '').replace(/#$/, '');
  const l = () => langOf(session.language);
  session.notice = [];

  if (END_STEPS.includes(session.step)) return 'finish';

  if (!digits) {
    session.silentTurns += 1;
    if (session.silentTurns > MAX_SILENT) session.step = 'bye';
    else session.notice = [`${l()}.no_input`];
    return 'continue';
  }
  session.silentTurns = 0;
  session.conversationHistory.push({ step: session.step, digits });

  if (session.step === 'lang') {
    session.language = { 1: 'hi', 2: 'mr', 3: 'en' }[digits] || 'hi';
    session.step = 'city';
    session.notice = [`${l()}.welcome`];
    return 'continue';
  }

  if (session.step === 'confirm') {
    if (digits === '1' || session.retries >= MAX_RETRIES) {
      await saveWorker(session);
      session.retries = 0;
      session.step = 'saved';
    } else if (digits === '2') {
      session.collectedData = {};
      session.retries = 0;
      session.step = 'city';
      session.notice = [`${l()}.restart`];
    } else {
      session.retries += 1;
      session.notice = [`${l()}.unclear`];
    }
    return 'continue';
  }

  const step = session.step;
  let value = READ[step](digits);
  if (value === null && session.retries < MAX_RETRIES) {
    session.retries += 1;
    session.notice = [`${l()}.unclear`];
    return 'continue';
  }
  if (value === null) value = FALLBACK[step];
  session.collectedData[FIELD[step]] = value;
  session.markModified('collectedData');
  session.retries = 0;
  session.step = NEXT[step];
  return 'continue';
}

module.exports = { begin, prompt, answer, END_STEPS };
