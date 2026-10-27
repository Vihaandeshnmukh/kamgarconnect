// Merges the Google Stitch landing layout into the working Kamgar Connect page.
// Usage: node apply-stitch.js <input.html> <output.html> <stitch-landing.css>
// Each edit must match exactly once, otherwise nothing is written.
// Written without "&&" in the page markup/code: WordPress turns it into &#038;&#038;.
const fs = require('fs');
const [input, output, cssFile] = process.argv.slice(2);
let s = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');
const css = fs.readFileSync(cssFile, 'utf8').replace(/\r\n/g, '\n');

const HERO = `<section class="hero st-hero">
    <canvas id="hero-canvas"></canvas>
    <div class="hero-content">
      <div class="st-badge"><i class="fas fa-location-dot"></i> Aurangabad (Chhatrapati Sambhajinagar) &amp; Marathwada</div>
      <h1 class="glitch" data-text="Dignity, Not Chowks." data-i18n="hero_title">Dignity, Not Chowks.</h1>
      <p class="st-hi">चौक पर खड़े रहने की ज़रूरत नहीं, सम्मान से काम पाएं।</p>
      <p data-i18n="hero_subtitle">The marketplace connecting India's workforce instantly using AI and GPS.</p>
      <div class="st-cta">
        <button class="btn btn-primary" onclick="handleFindWorkClick()"><i class="fas fa-helmet-safety"></i><span><span data-i18n="btn_worker">I am a Worker</span><small>मैं कामगार हूँ / मी कामगार आहे</small></span></button>
        <button class="btn st-employer" onclick="handleHireClick()"><i class="fas fa-user-tie"></i><span><span data-i18n="btn_employer">I Need a Worker</span><small>मुझे कामगार चाहिए / मला कामगार हवा</small></span></button>
      </div>
      <div class="st-chips">
        <span><i class="fas fa-handshake"></i> Direct contact, no middlemen / थेट संपर्क</span>
        <span><i class="fas fa-microphone"></i> Hindi voice registration</span>
        <span><i class="fas fa-location-crosshairs"></i> GPS-based matching</span>
      </div>
    </div>
  </section>`;

const CALL_CARD = `<section class="container call-register">
    <div class="call-card">
      <div class="call-icon"><i class="fas fa-phone-volume"></i></div>
      <div style="flex:1; min-width:240px;">
        <h3>No smartphone? Register by phone call</h3>
        <p>स्मार्टफोन नहीं है? फ़ोन करें और हिंदी में 6 सवालों के जवाब दें, आपका प्रोफ़ाइल बन जाएगा।</p>
        <div class="st-mini"><span><i class="fas fa-check"></i> 6 simple questions</span><span><i class="fas fa-check"></i> No typing, no app</span><span><i class="fas fa-check"></i> About 2 minutes</span></div>
      </div>
      <a class="btn btn-primary call-btn" href="tel:+18148215946"><i class="fas fa-phone"></i> +1 814 821 5946</a>
    </div>
  </section>

  <section class="st-section">
    <div class="container">
      <div class="st-eyebrow">Simple process • सोपी पद्धत</div>
      <h2 class="st-title">How Kamgar Connect works</h2>
      <p class="st-sub">फक्त ३ सोप्या टप्प्यांत थेट काम मिळवा</p>
      <div class="st-steps">
        <div class="st-step"><div class="ico"><i class="fas fa-id-card"></i></div><h3>1. Register / नोंदणी करा</h3><div class="hi">नाम और हुनर बताएं</div><p>Call our number and answer a few questions, or fill the 1-minute form with your trade (Mason, Plumber, Helper).</p></div>
        <div class="st-step"><div class="ico"><i class="fas fa-phone-volume"></i></div><h3>2. Get called / काम पाएं</h3><div class="hi">काम की कॉल सीधे आपके फ़ोन पर</div><p>Tap START LOOKING when you are free. Employers near you can hire you, and you get a call with the job details.</p></div>
        <div class="st-step"><div class="ico"><i class="fas fa-indian-rupee-sign"></i></div><h3>3. Work &amp; get paid / मेहनताना</h3><div class="hi">सीधे नियोक्ता से भुगतान</div><p>Agree the wage with the employer and be paid directly in cash or UPI. No middleman in between.</p></div>
      </div>
    </div>
  </section>

  <section class="st-section st-cats-wrap">
    <div class="container">
      <div class="st-eyebrow">In-demand skills • मागणी असलेले काम</div>
      <h2 class="st-title">Work categories in Aurangabad</h2>
      <p class="st-sub">Pick your trade when you register.</p>
      <div class="st-cats">
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-trowel-bricks"></i></div><strong>Masons</strong><span>गवंडी / राजमिस्त्री</span></button>
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-faucet-drip"></i></div><strong>Plumbers</strong><span>प्लंबर / नलसाज</span></button>
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-bolt"></i></div><strong>Electricians</strong><span>इलेक्ट्रिशियन</span></button>
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-broom"></i></div><strong>Domestic Help</strong><span>घरकाम</span></button>
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-industry"></i></div><strong>Factory Workers</strong><span>फॅक्टरी कामगार</span></button>
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-hammer"></i></div><strong>Carpenters</strong><span>सुतार / बढ़ई</span></button>
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-paint-roller"></i></div><strong>Painters</strong><span>पेंटर / रंगारी</span></button>
        <button class="st-cat" onclick="handleFindWorkClick()"><div class="ico"><i class="fas fa-truck"></i></div><strong>Drivers</strong><span>ड्रायव्हर</span></button>
      </div>
    </div>
  </section>`;

const FOOTER = `<footer class="st-footer">
    <div class="container">
      <div><strong>Kamgar Connect • कामगार कनेक्ट</strong><em>Dignity, Not Chowks | सम्मान, चौक नहीं</em></div>
      <div><i class="fas fa-location-dot" style="color:var(--accent)"></i> Serving Chhatrapati Sambhajinagar (Aurangabad), Maharashtra</div>
      <a class="tel" href="tel:+18148215946"><i class="fas fa-phone-volume"></i> Helpline: +1 814 821 5946</a>
    </div>
  </footer>
  <div class="st-dock"><a class="d1" href="tel:+18148215946"><i class="fas fa-phone"></i> Call Helpline</a><a class="d2" href="#" onclick="handleFindWorkClick(); return false;"><i class="fas fa-user-plus"></i> Register</a></div>

  <div id="secret-page">`;

const edits = [
  ['Stitch stylesheet', /\n  <\/style>\n<\/head>/g, '\n' + css + '  </style>\n</head>'],
  ['Manrope font', /(<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=Plus\+Jakarta\+Sans[^"]*" rel="stylesheet"\s*\/?>)/g, (m, link) => link + '\n  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">'],
  ['logo with subtitle', /<div class="logo" onclick="gsap\.to\(window, \{scrollTo:0, duration:1\}\)">Kamgar<span>Connect<\/span><\/div>/g,
    '<div class="logo" onclick="gsap.to(window, {scrollTo:0, duration:1})"><span style="color:inherit">Kamgar<span>Connect</span></span><small>औरंगाबाद • Aurangabad</small></div>'],
  ['call button in header', /(<div class="lang-switcher")/g, (m, tag) => '<a class="btn btn-primary st-call-nav" href="tel:+18148215946"><i class="fas fa-phone"></i> Call +1 814 821 5946</a>\n        ' + tag],
  ['hero', /<section class="hero">[\s\S]*?<\/section>/g, HERO],
  ['call card + steps + categories', /<section class="container call-register">[\s\S]*?<\/section>/g, CALL_CARD],
  ['real rating on worker cards', /Rating: &#9733;&#9733;&#9733;&#9733;&#9734; \(12\)/g,
    "${w.totalRatings > 0 ? 'Rating: ' + Number(w.rating).toFixed(1) + ' &#9733; (' + w.totalRatings + ')' : 'New on Kamgar Connect'}"],
  ['footer and mobile dock', /<div id="secret-page">/g, FOOTER]
];

const report = [];
for (const [name, re, rep] of edits) {
  const n = (s.match(re) || []).length;
  report.push(`${name}: ${n}`);
  if (n !== 1) { console.log(report.join('\n')); console.log(`ABORT: "${name}" matched ${n} times`); process.exit(1); }
  s = s.replace(re, typeof rep === 'string' ? () => rep : rep);
  if (s.includes('$1')) { console.log(`ABORT: "${name}" left a literal $1 in the page`); process.exit(1); }
}
fs.writeFileSync(output, s);
console.log(report.join('\n'));
console.log('written:', output, s.length, 'chars');
