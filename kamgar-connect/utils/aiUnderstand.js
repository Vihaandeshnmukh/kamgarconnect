// Uses Gemini to understand a spoken answer on the registration call when the
// simple rules in voiceParse.js can't (e.g. "मैं घरों में बर्तन-सफाई करती हूं").
// Optional: without GEMINI_API_KEY, or if Gemini is slow or fails, returns null
// and the call carries on with the rule-based value.
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const TIMEOUT_MS = 5000; // Twilio waits ~15s for each answer, keep well under it

const CITIES = ['Aurangabad', 'Nagpur', 'Pune', 'Nashik', 'Mumbai'];
const SKILLS = ['Mason', 'Electrician', 'Plumber', 'Domestic Help', 'Factory Worker', 'Carpenter', 'Painter', 'Driver'];

// What we ask Gemini for each question, and how to check its answer
const FIELDS = {
  name: { ask: "the caller's name only (no words like 'my name is')", check: v => typeof v === 'string' && v.trim() ? v.trim() : null },
  city: { ask: `the city, as one of ${CITIES.join(', ')} (Chhatrapati Sambhajinagar is Aurangabad), or null if none fits`, check: v => CITIES.includes(v) ? v : null },
  skill: { ask: `the type of work, as one of ${SKILLS.join(', ')}, or null if none fits`, check: v => SKILLS.includes(v) ? v : null },
  experience_years: { ask: 'years of work experience as a whole number', check: v => Number.isFinite(Number(v)) ? Math.round(Number(v)) : null },
  expected_salary_per_day: { ask: 'expected daily wage in rupees as a whole number', check: v => Number.isFinite(Number(v)) ? Math.round(Number(v)) : null },
  availability_days: { ask: 'how many days per week they can work, a whole number from 1 to 7', check: v => Number(v) >= 1 ? Math.min(7, Math.round(Number(v))) : null }
};

let model = null;
function getModel() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!model) {
    model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel(
      { model: MODEL, generationConfig: { responseMimeType: 'application/json', temperature: 0 } },
      { timeout: TIMEOUT_MS }
    );
  }
  return model;
}

// Returns the cleaned value for this field from the caller's words, or null
async function aiUnderstand(field, speech) {
  const spec = FIELDS[field];
  const m = getModel();
  if (!spec || !m || !speech) return null;
  const prompt = `A daily wage worker in Maharashtra, India is registering by phone and answered in Hindi or Marathi: "${speech}".
Extract ${spec.ask}. Reply with JSON only: {"value": ...}. Use null if the answer does not contain it.`;
  try {
    const result = await m.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    return spec.check(parsed.value);
  } catch (err) {
    console.error('aiUnderstand failed:', field, err.message);
    return null;
  }
}

module.exports = { aiUnderstand };
