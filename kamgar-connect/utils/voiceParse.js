// Turns spoken answers (Twilio speech-to-text, mostly Hindi/Marathi) into
// the values the website and database use.

// Same letters can be typed two ways (ढ़ as one or two characters): compare in one form
const norm = (text) => String(text).normalize('NFC').toLowerCase();
const normKeys = (table) => Object.fromEntries(Object.entries(table).map(([k, v]) => [norm(k), v]));

// Number words in Hindi, Marathi and English (plus common spelling variants)
const NUMBER_WORDS = {
  'शून्य': 0, 'एक': 1, 'दो': 2, 'दोन': 2, 'तीन': 3, 'चार': 4,
  'पांच': 5, 'पाँच': 5, 'पाच': 5, 'छह': 6, 'छः': 6, 'छे': 6, 'सहा': 6,
  'सात': 7, 'आठ': 8, 'नौ': 9, 'नऊ': 9, 'दस': 10, 'दहा': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16,
  'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20, 'वीस': 20,
  'इक्कीस': 21, 'बाईस': 22, 'तेईस': 23, 'चौबीस': 24, 'पच्चीस': 25, 'पंचवीस': 25,
  'छब्बीस': 26, 'सत्ताईस': 27, 'अट्ठाईस': 28, 'उनतीस': 29,
  'तीस': 30, 'पैंतीस': 35, 'चालीस': 40, 'पैंतालीस': 45, 'पचास': 50, 'पन्नास': 50,
  'पचपन': 55, 'साठ': 60, 'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90,
  'सौ': 100, 'शंभर': 100, 'हज़ार': 1000, 'हजार': 1000,
  // Marathi hundreds are one word: पाचशे = 500
  'दोनशे': 200, 'तीनशे': 300, 'चारशे': 400, 'पाचशे': 500, 'सहाशे': 600,
  'सातशे': 700, 'आठशे': 800, 'नऊशे': 900,
  'डेढ़': 1.5, 'डेढ': 1.5, 'दीड': 1.5, 'ढाई': 2.5, 'अडीच': 2.5,
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
  'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'twelve': 12, 'fifteen': 15,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60,
  'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000
};

// "साढ़े छह सौ" = 6.5 x 100, "सवा", "पौने": a fraction added to the next number
const FRACTION_WORDS = {
  'साढ़े': 0.5, 'साढे': 0.5, 'साडे': 0.5,
  'सवा': 0.25, 'सव्वा': 0.25,
  'पौने': -0.25, 'पावणे': -0.25
};

Object.assign(NUMBER_WORDS, normKeys(NUMBER_WORDS));
Object.assign(FRACTION_WORDS, normKeys(FRACTION_WORDS));

// Reads the number in a spoken answer: "700", "सात सौ", "साढ़े छह सौ", "पाचशे" → 700, 700, 650, 500.
// Returns null for no number or a negative one ("minus 5", "-5").
function parseNumber(text) {
  if (!text) return null;
  const clean = norm(text).replace(/(\d),(\d)/g, '$1$2');
  if (/(^|\s)[-−]\s*\d|minus|माइनस|ऋण/.test(clean)) return null;

  let total = 0, current = 0, fraction = 0, found = false;
  for (const word of clean.split(/[\s,.!?।-]+/)) {
    if (FRACTION_WORDS[word] !== undefined) { fraction = FRACTION_WORDS[word]; continue; }
    const n = /^\d+(\.\d+)?$/.test(word) ? parseFloat(word) : NUMBER_WORDS[word];
    if (n === undefined) continue;
    found = true;
    if (n === 100) {
      // "सौ सौ" is not 10000: a second hundred is ignored
      if (current < 100) current = (current || 1) * 100;
    } else if (n === 1000) {
      total += (current || 1) * 1000; current = 0;
    } else {
      // A fraction goes with this number: साढ़े + छह = 6.5, साडे + पाचशे = 550
      current += n + fraction * (n >= 100 ? 100 : 1);
      fraction = 0;
    }
  }
  return found ? total + current : null;
}

// "रोज़", "पूरा हफ्ता", "every day" all mean 7 days a week
const WHOLE_WEEK = ['पूरा हफ्ता', 'पूरा हफ़्ता', 'पूरे हफ्ते', 'पूरे हफ़्ते', 'हर दिन', 'रोज', 'रोज़', 'सातों दिन',
  'सब दिन', 'पूर्ण आठवडा', 'सगळे दिवस', 'सर्व दिवस', 'दररोज', 'every day', 'everyday', 'all days', 'whole week', 'full week', 'daily'];

// Days per week (1-7) from an answer, or null
function parseDays(text) {
  if (!text) return null;
  const lower = norm(text);
  if (WHOLE_WEEK.some(w => lower.includes(norm(w)))) return 7;
  const n = parseNumber(lower);
  return n >= 1 && n <= 7 ? Math.round(n) : null;
}

// "कोई अनुभव नहीं", "no experience", "नया हूं" → 0 years
const NO_EXPERIENCE = ['कोई अनुभव नहीं', 'अनुभव नहीं', 'कोई नहीं', 'नया', 'पहली बार', 'अनुभव नाही', 'नवीन', 'no experience', 'none', 'fresher'];

// Years of experience (0-60) from an answer, or null.
// "2020 से काम कर रहा हूं" (a year) → years since then.
function parseExperience(text) {
  if (!text) return null;
  const lower = norm(text);
  let n = parseNumber(lower);
  if (n === null) return NO_EXPERIENCE.some(w => lower.includes(norm(w))) ? 0 : null;
  const year = new Date().getFullYear();
  if (n >= 1960 && n <= year) n = year - n;
  n = Math.round(n);
  return n >= 0 && n <= 60 ? n : null;
}

// Daily wage in rupees (100-5000), or null
function parseWage(text) {
  const n = parseNumber(text);
  return n >= 100 && n <= 5000 ? Math.round(n) : null;
}

// Website city values and the ways people say them
const CITIES = {
  Aurangabad: ['aurangabad', 'औरंगाबाद', 'संभाजीनगर', 'sambhajinagar', 'chhatrapati', 'छत्रपती', 'छत्रपति',
    'waluj', 'वालुज', 'वाळूज', 'cidco', 'सिडको'],
  Nagpur: ['nagpur', 'नागपुर', 'नागपूर'],
  Pune: ['pune', 'poona', 'पुणे', 'पुने', 'पूना'],
  Nashik: ['nashik', 'nasik', 'नाशिक', 'नासिक'],
  Mumbai: ['mumbai', 'bombay', 'मुंबई', 'बंबई', 'मुम्बई']
};

// Website skill values and the ways people say them
const SKILLS = {
  Mason: ['mason', 'मिस्त्री', 'मिस्तरी', 'राजमिस्त्री', 'गवंडी', 'मेसन', 'बांधकाम', 'construction'],
  Electrician: ['electrician', 'इलेक्ट्रीशियन', 'इलेक्ट्रिशियन', 'बिजली', 'वायरमैन', 'वायरमन', 'वायरिंग', 'wiring'],
  Plumber: ['plumber', 'प्लंबर', 'प्लम्बर', 'नल', 'पाइप', 'पाईप', 'plumbing', 'pipe'],
  'Domestic Help': ['domestic', 'maid', 'घरेलू', 'घर का काम', 'घरों में', 'मेड', 'कामवाली', 'बाई', 'घरकाम',
    'बर्तन', 'भांडी', 'सफाई', 'साफसफाई', 'झाड़ू', 'झाडू', 'पोछा', 'खाना बनाना', 'स्वयंपाक', 'cook', 'cleaning', 'house work', 'housework'],
  'Factory Worker': ['factory', 'फैक्ट्री', 'फ़ैक्टरी', 'फैक्टरी', 'फॅक्टरी', 'कारखाना', 'कंपनी', 'company'],
  Carpenter: ['carpenter', 'बढ़ई', 'बढई', 'कारपेंटर', 'सुतार', 'फर्नीचर', 'फर्निचर', 'furniture', 'लकड़ी'],
  Painter: ['painter', 'पेंटर', 'पुताई', 'रंगकाम', 'रंगाई', 'पेंटिंग', 'painting', 'रंग'],
  Driver: ['driver', 'ड्राइवर', 'ड्रायव्हर', 'गाड़ी', 'गाडी', 'चालक', 'ड्राइविंग', 'driving']
};

// Returns the website value whose synonyms appear in the text, or null
function matchFrom(table, text) {
  if (!text) return null;
  const lower = norm(text);
  for (const [value, words] of Object.entries(table)) {
    if (words.some(w => lower.includes(norm(w)))) return value;
  }
  return null;
}

const matchCity = (text) => matchFrom(CITIES, text);
const matchSkill = (text) => matchFrom(SKILLS, text);

// "मेरा नाम रमेश पाटिल है" → "रमेश पाटिल"
function extractName(text) {
  if (!text) return '';
  return text
    .replace(/^(मेरा नाम है|मेरा नाम|माझे नाव|माझं नाव|my name is|i am|मैं)\s*/i, '')
    .replace(/\s*(है|हैं|आहे|जी|ji)[.।!]?\s*$/i, '')
    .replace(/[.।!?]+$/, '')
    .trim();
}

// A believable spoken name: letters and spaces only, 2-40 chars, at most 4 words
function isLikelyName(name) {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  return /^[\p{L}\p{M}][\p{L}\p{M} .]{1,39}$/u.test(n) && n.split(/\s+/).length <= 4;
}

// Last 10 digits of a caller id like "+919812345678"
function localPhone(from) {
  const digits = String(from || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

module.exports = {
  parseNumber, parseDays, parseExperience, parseWage, matchCity, matchSkill,
  extractName, isLikelyName, localPhone, CITY_LIST: Object.keys(CITIES), SKILL_LIST: Object.keys(SKILLS)
};
