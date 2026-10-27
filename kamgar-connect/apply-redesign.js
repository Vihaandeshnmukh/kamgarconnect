// Applies "Redesign v2" to a copy of the Kamgar Connect page.
// Usage: node apply-redesign.js <input.html> <output.html> <redesign-v2.css>
// Each edit must match exactly once, otherwise nothing is written.
const fs = require('fs');

const [input, output, cssFile] = process.argv.slice(2);
let s = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(cssFile, 'utf8').replace(/\r\n/g, '\n');

const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const loose = (t) => new RegExp(t.trim().split(/\s+/).map(esc).join('\\s+'), 'g');

const CALL_CARD = `
  <section class="container call-register">
    <div class="call-card">
      <div class="call-icon"><i class="fas fa-phone-volume"></i></div>
      <div>
        <h3>No smartphone? Register by phone call</h3>
        <p>फ़ोन करें और हिंदी में 6 सवालों के जवाब दें, आपका प्रोफ़ाइल बन जाएगा।</p>
      </div>
      <a class="btn btn-primary call-btn" href="tel:+18148215946"><i class="fas fa-phone"></i> +1 814 821 5946</a>
    </div>
  </section>

`;

const edits = [
  ['redesign stylesheet', loose('@media (max-width: 768px) { .gps-row, .selector-grid { grid-template-columns: 1fr; } } </style>'),
    '@media (max-width: 768px) { .gps-row, .selector-grid { grid-template-columns: 1fr; } }\n' + css + '  </style>'],
  ['phone-call card', /(<\/section>\s*)(<section class="mission-section" id="mission-section">)/g, (m, a, b) => a + CALL_CARD.trimStart() + '  ' + b],
  ['remove video section', /\s*<section class="container video-section">[\s\S]*?<\/section>\n/g, '\n'],
  ['remove video URLs', /\n\s*CHOWK_VIDEO:[^\n]*\n\s*HOME_VIDEO:[^\n]*/g, ''],
  ['remove loadVideos() call', /\n\s*loadVideos\(\);/g, ''],
  ['remove loadVideos/startScrub functions', /\n    function loadVideos\(\) \{[\s\S]*?\n    function startScrub\([\s\S]*?\n    \}\n/g, '\n'],
  ['friendlier server message', /Backend not connected[^<]*/g, 'Server is waking up, please wait a minute and refresh']
];

const report = [];
for (const [name, re, rep] of edits) {
  const n = (s.match(re) || []).length;
  report.push(`${name}: ${n}`);
  if (n !== 1) { console.log(report.join('\n')); console.log(`ABORT: "${name}" matched ${n} times`); process.exit(1); }
  s = s.replace(re, rep);
}
fs.writeFileSync(output, s);
console.log(report.join('\n'));
console.log('written:', output, s.length, 'chars');
