// Cleans text that users type or speak before it is saved, so that names,
// cities etc. can never carry HTML/script and stay a sensible length.

// Plain text: no tags, no control characters, single spaces, at most max chars
function cleanText(value, max = 100) {
  if (value === undefined || value === null) return value;
  return String(value)
    .replace(/[<>"`{}\\]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// A person's name: letters (any script), spaces and . ' ( ) - only
function cleanName(value, max = 60) {
  if (value === undefined || value === null) return value;
  return String(value)
    .replace(/[^\p{L}\p{M}\s.'()-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// True when a name has at least 2 letters after cleaning
function isValidName(value) {
  return typeof value === 'string' && (value.match(/\p{L}/gu) || []).length >= 2;
}

// Indian mobile/landline as the 10 local digits ("+91 98123 45678" -> "9812345678")
function normalizePhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  let digits = String(value).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const isPhone = (digits) => /^\d{10}$/.test(digits);

// Removes keys starting with "$" or containing "." anywhere in an object
// (stops MongoDB operator injection such as {"phone": {"$ne": null}})
function stripOperators(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) delete obj[key];
    else stripOperators(obj[key]);
  }
  return obj;
}

// The service's fixed lists (same values as the website dropdowns)
const CITIES = ['Aurangabad', 'Nagpur', 'Pune', 'Nashik', 'Mumbai'];
const SKILLS = ['Mason', 'Electrician', 'Plumber', 'Domestic Help', 'Factory Worker', 'Carpenter', 'Painter', 'Driver'];

module.exports = { cleanText, cleanName, isValidName, normalizePhone, isPhone, stripOperators, CITIES, SKILLS };
