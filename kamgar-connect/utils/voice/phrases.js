// Everything the keypad phone line says, in Hindi, Marathi and English.
// Each entry becomes one cached audio clip (key "<lang>.<name>"), generated
// once with ElevenLabs. Numbers are cached too ("<lang>.num.<n>") so read-backs
// like "650 rupees" are stitched from clips and cost no characters per call.

const CITIES = ['Aurangabad', 'Nagpur', 'Pune', 'Nashik', 'Mumbai'];
const SKILLS = ['Mason', 'Electrician', 'Plumber', 'Domestic Help', 'Factory Worker', 'Carpenter', 'Painter', 'Driver'];

const NAMES = {
  hi: {
    city: { Aurangabad: 'औरंगाबाद', Nagpur: 'नागपुर', Pune: 'पुणे', Nashik: 'नाशिक', Mumbai: 'मुंबई' },
    skill: { Mason: 'मिस्त्री', Electrician: 'इलेक्ट्रीशियन', Plumber: 'प्लंबर', 'Domestic Help': 'घरेलू काम', 'Factory Worker': 'फैक्ट्री का काम', Carpenter: 'बढ़ई', Painter: 'पेंटर', Driver: 'ड्राइवर', Other: 'दूसरा काम' }
  },
  mr: {
    city: { Aurangabad: 'औरंगाबाद', Nagpur: 'नागपूर', Pune: 'पुणे', Nashik: 'नाशिक', Mumbai: 'मुंबई' },
    skill: { Mason: 'गवंडी', Electrician: 'इलेक्ट्रिशियन', Plumber: 'प्लंबर', 'Domestic Help': 'घरकाम', 'Factory Worker': 'कारखान्याचे काम', Carpenter: 'सुतार', Painter: 'पेंटर', Driver: 'ड्रायव्हर', Other: 'दुसरे काम' }
  },
  en: {
    city: Object.fromEntries(CITIES.map(c => [c, c])),
    skill: { ...Object.fromEntries(SKILLS.map(s => [s, s])), 'Domestic Help': 'domestic help', 'Factory Worker': 'factory work', Other: 'other work' }
  }
};

const menu = (lang, list, kind, item) => list.map((v, i) => item(NAMES[lang][kind][v], i + 1)).join(', ');

const TEXT = {
  hi: {
    welcome: 'कामगार कनेक्ट में आपका स्वागत है।',
    city_menu: 'आप किस शहर में काम करते हैं? ' + menu('hi', CITIES, 'city', (n, d) => `${n} के लिए ${d}`) + ' दबाइए।',
    skill_menu: 'आपका काम क्या है? ' + menu('hi', SKILLS, 'skill', (n, d) => `${n} के लिए ${d}`) + ' दबाइए।',
    exp_q: 'आपको कितने साल का अनुभव है? साल का नंबर दबाइए, फिर हैश दबाइए।',
    wage_q: 'एक दिन की दिहाड़ी कितने रुपये लेते हैं? रकम दबाइए, फिर हैश दबाइए।',
    days_q: 'हफ़्ते में कितने दिन काम कर सकते हैं? एक से सात के बीच एक नंबर दबाइए।',
    unclear: 'माफ़ कीजिए, यह जवाब सही नहीं था।',
    no_input: 'कोई बटन नहीं दबाया गया।',
    rb_intro: 'आपने बताया:',
    rb_exp: 'अनुभव', rb_years: 'साल,',
    rb_wage: 'दिहाड़ी', rb_rupees: 'रुपये,',
    rb_week: 'हफ़्ते में', rb_days: 'दिन।',
    confirm: 'सही है तो 1 दबाइए। फिर से भरने के लिए 2 दबाइए।',
    restart: 'ठीक है, फिर से शुरू करते हैं।',
    saved: 'धन्यवाद! आपका रजिस्ट्रेशन हो गया है। अगले 24 घंटे आप काम देने वालों को दिखेंगे। काम मिलने पर हम आपको कॉल करेंगे।',
    existing: 'नमस्ते! आप पहले से कामगार कनेक्ट पर रजिस्टर हैं। अगले 24 घंटे आप फिर से काम की लिस्ट में हैं। धन्यवाद।',
    booked: 'नमस्ते! आपका काम पहले से बुक है। धन्यवाद।',
    bye_silent: 'हमें कोई जवाब नहीं मिला। कृपया बाद में फिर से कॉल करें। धन्यवाद।',
    error: 'माफ़ कीजिए, एक तकनीकी समस्या है। कृपया थोड़ी देर बाद फिर से कॉल करें।'
  },
  mr: {
    welcome: 'कामगार कनेक्टमध्ये आपले स्वागत आहे.',
    city_menu: 'तुम्ही कोणत्या शहरात काम करता? ' + menu('mr', CITIES, 'city', (n, d) => `${n} साठी ${d}`) + ' दाबा.',
    skill_menu: 'तुम्ही कोणते काम करता? ' + menu('mr', SKILLS, 'skill', (n, d) => `${n} साठी ${d}`) + ' दाबा.',
    exp_q: 'तुम्हाला किती वर्षांचा अनुभव आहे? वर्षांचा नंबर दाबा, मग हॅश दाबा.',
    wage_q: 'एका दिवसाची मजुरी किती रुपये घेता? रक्कम दाबा, मग हॅश दाबा.',
    days_q: 'आठवड्यातून किती दिवस काम करू शकता? एक ते सात मधील एक नंबर दाबा.',
    unclear: 'माफ करा, हे उत्तर बरोबर नव्हते.',
    no_input: 'कोणतेही बटण दाबले नाही.',
    rb_intro: 'तुम्ही सांगितले:',
    rb_exp: 'अनुभव', rb_years: 'वर्षे,',
    rb_wage: 'मजुरी', rb_rupees: 'रुपये,',
    rb_week: 'आठवड्यातून', rb_days: 'दिवस.',
    confirm: 'बरोबर असेल तर 1 दाबा. पुन्हा भरण्यासाठी 2 दाबा.',
    restart: 'ठीक आहे, पुन्हा सुरू करूया.',
    saved: 'धन्यवाद! तुमची नोंदणी झाली आहे. पुढचे 24 तास तुम्ही काम देणाऱ्यांना दिसाल. काम मिळाल्यावर आम्ही तुम्हाला कॉल करू.',
    existing: 'नमस्कार! तुमची कामगार कनेक्टवर आधीच नोंदणी आहे. पुढचे 24 तास तुम्ही पुन्हा कामाच्या यादीत आहात. धन्यवाद.',
    booked: 'नमस्कार! तुमचे काम आधीच बुक आहे. धन्यवाद.',
    bye_silent: 'आम्हाला उत्तर मिळाले नाही. कृपया नंतर पुन्हा कॉल करा. धन्यवाद.',
    error: 'माफ करा, तांत्रिक अडचण आहे. कृपया थोड्या वेळाने पुन्हा कॉल करा.'
  },
  en: {
    welcome: 'Welcome to Kamgar Connect.',
    city_menu: 'Which city do you work in? ' + menu('en', CITIES, 'city', (n, d) => `press ${d} for ${n}`) + '.',
    skill_menu: 'What work do you do? ' + menu('en', SKILLS, 'skill', (n, d) => `press ${d} for ${n}`) + '.',
    exp_q: 'How many years of experience do you have? Type the number, then press hash.',
    wage_q: 'How many rupees do you charge for one day? Type the amount, then press hash.',
    days_q: 'How many days a week can you work? Press a number from one to seven.',
    unclear: 'Sorry, that answer was not valid.',
    no_input: 'No button was pressed.',
    rb_intro: 'You told us:',
    rb_exp: 'experience', rb_years: 'years,',
    rb_wage: 'daily wage', rb_rupees: 'rupees,',
    rb_week: 'available', rb_days: 'days a week.',
    confirm: 'If this is correct, press 1. To enter it again, press 2.',
    restart: 'Okay, let us start again.',
    saved: 'Thank you! You are registered. Employers can see you for the next 24 hours. We will call you when there is work.',
    existing: 'Hello! You are already registered with Kamgar Connect. You are on the work list again for the next 24 hours. Thank you.',
    booked: 'Hello! You already have work booked. Thank you.',
    bye_silent: 'We did not get an answer. Please call again later. Thank you.',
    error: 'Sorry, there is a technical problem. Please call again in a little while.'
  }
};

// Played once at the start of a new caller's call, before the language choice
const SHARED = {
  'all.language_menu': 'नमस्ते! कामगार कनेक्ट। हिंदी के लिए 1 दबाइए। मराठीसाठी 2 दाबा। For English, press 3.',
  'all.name_prompt': 'नमस्ते, कामगार कनेक्ट में आपका स्वागत है। बीप के बाद अपना नाम बोलिए। बीपनंतर आपले नाव सांगा। After the beep, please say your name.'
};

// Numbers spoken by the read-back: 0-99, the hundreds and 1000-5000 are cached;
// anything up to 5999 is stitched (e.g. 650 = "600" + "50")
const NUMBER_CLIPS = [...Array(100).keys(), 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 5000];

function numberKeys(lang, n) {
  n = Math.round(Number(n));
  if (!Number.isFinite(n) || n < 0 || n > 5999) return [];
  const keys = [];
  if (n >= 1000) { keys.push(`${lang}.num.${Math.floor(n / 1000) * 1000}`); n %= 1000; }
  if (n >= 100) { keys.push(`${lang}.num.${Math.floor(n / 100) * 100}`); n %= 100; }
  if (n > 0 || keys.length === 0) keys.push(`${lang}.num.${n}`);
  return keys;
}

// The text for a clip key (null if the key is unknown)
function textFor(key) {
  if (SHARED[key]) return SHARED[key];
  const [lang, kind, ...rest] = key.split('.');
  const name = rest.join('.');
  if (!TEXT[lang]) return null;
  if (kind === 'num' && NUMBER_CLIPS.includes(Number(name))) return name;
  if (kind === 'city') return NAMES[lang].city[name] || null;
  if (kind === 'skill') return NAMES[lang].skill[name] || null;
  return TEXT[lang][kind] || null;
}

// Every clip the phone line can play (for pre-generating them all once)
function allKeys() {
  const keys = Object.keys(SHARED);
  for (const lang of Object.keys(TEXT)) {
    keys.push(...Object.keys(TEXT[lang]).map(k => `${lang}.${k}`));
    keys.push(...CITIES.map(c => `${lang}.city.${c}`));
    keys.push(...Object.keys(NAMES[lang].skill).map(s => `${lang}.skill.${s}`));
    keys.push(...NUMBER_CLIPS.map(n => `${lang}.num.${n}`));
  }
  return keys;
}

module.exports = { CITIES, SKILLS, TEXT, textFor, numberKeys, allKeys };
