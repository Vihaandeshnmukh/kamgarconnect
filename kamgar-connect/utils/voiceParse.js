// Turns spoken answers (Twilio speech-to-text, mostly Hindi/Marathi) into
// the values the website and database use.

// Number words in Hindi and Marathi (plus common spelling variants)
const NUMBER_WORDS = {
  'शून्य': 0, 'एक': 1, 'दो': 2, 'दोन': 2, 'तीन': 3, 'चार': 4,
  'पांच': 5, 'पाँच': 5, 'पाच': 5, 'छह': 6, 'छः': 6, 'छे': 6, 'सहा': 6,
  'सात': 7, 'आठ': 8, 'नौ': 9, 'नऊ': 9, 'दस': 10, 'दहा': 10,
  'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16,
  'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20, 'वीस': 20, 'पच्चीस': 25,
  'तीस': 30, 'चालीस': 40, 'पचास': 50, 'पन्नास': 50, 'साठ': 60, 'सत्तर': 70,
  'अस्सी': 80, 'नब्बे': 90, 'सौ': 100, 'शंभर': 100, 'हज़ार': 1000, 'हजार': 1000,
  'डेढ़': 1.5, 'डेढ': 1.5, 'ढाई': 2.5, 'अडीच': 2.5
};

// Reads the first number in a spoken answer: "700", "सात सौ", "पांच साल" → 700, 700, 5
function parseNumber(text) {
  if (!text) return null;
  const digits = text.match(/\d+/);
  if (digits) return parseInt(digits[0], 10);

  let total = 0, current = 0, found = false;
  for (const word of text.split(/[\s,.-]+/)) {
    const n = NUMBER_WORDS[word];
    if (n === undefined) continue;
    found = true;
    if (n === 100) current = (current || 1) * 100;
    else if (n === 1000) { total += (current || 1) * 1000; current = 0; }
    else current += n;
  }
  return found ? total + current : null;
}

// Website city values and the ways people say them
const CITIES = {
  Aurangabad: ['aurangabad', 'औरंगाबाद', 'संभाजीनगर', 'sambhajinagar'],
  Nagpur: ['nagpur', 'नागपुर', 'नागपूर'],
  Pune: ['pune', 'poona', 'पुणे', 'पुने', 'पूना'],
  Nashik: ['nashik', 'nasik', 'नाशिक', 'नासिक'],
  Mumbai: ['mumbai', 'bombay', 'मुंबई', 'बंबई', 'मुम्बई']
};

// Website skill values and the ways people say them
const SKILLS = {
  Mason: ['mason', 'मिस्त्री', 'मिस्तरी', 'राजमिस्त्री', 'गवंडी', 'मेसन'],
  Electrician: ['electrician', 'इलेक्ट्रीशियन', 'इलेक्ट्रिशियन', 'बिजली', 'वायरमैन', 'वायरमन'],
  Plumber: ['plumber', 'प्लंबर', 'प्लम्बर', 'नल'],
  'Domestic Help': ['domestic', 'maid', 'घरेलू', 'घर का काम', 'मेड', 'कामवाली', 'बाई', 'घरकाम'],
  'Factory Worker': ['factory', 'फैक्ट्री', 'फ़ैक्टरी', 'फैक्टरी', 'कारखाना', 'कंपनी'],
  Carpenter: ['carpenter', 'बढ़ई', 'बढई', 'कारपेंटर', 'सुतार'],
  Painter: ['painter', 'पेंटर', 'पुताई', 'रंगकाम', 'रंग'],
  Driver: ['driver', 'ड्राइवर', 'ड्रायव्हर', 'गाड़ी', 'गाडी']
};

// Returns the website value whose synonyms appear in the text, or null
function matchFrom(table, text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [value, words] of Object.entries(table)) {
    if (words.some(w => lower.includes(w))) return value;
  }
  return null;
}

const matchCity = (text) => matchFrom(CITIES, text);
const matchSkill = (text) => matchFrom(SKILLS, text);

// "मेरा नाम रमेश पाटिल है" → "रमेश पाटिल"
function extractName(text) {
  if (!text) return '';
  return text
    .replace(/^(मेरा नाम|मेरा नाम है|माझे नाव|माझं नाव|my name is|i am|मैं)\s*/i, '')
    .replace(/\s*(है|हैं|आहे|जी|ji)[.।!]?\s*$/i, '')
    .replace(/[.।!?]+$/, '')
    .trim();
}

// Last 10 digits of a caller id like "+919812345678"
function localPhone(from) {
  const digits = String(from || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

module.exports = { parseNumber, matchCity, matchSkill, extractName, localPhone };
