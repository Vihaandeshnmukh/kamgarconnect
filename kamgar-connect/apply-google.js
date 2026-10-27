// Adds "Sign in with Google" to the Kamgar Connect page (hidden until the
// server has GOOGLE_CLIENT_ID). Usage: node apply-google.js <input.html> <output.html>
// Each edit must match exactly once, otherwise nothing is written.
// Written without "&&": WordPress can turn it into &#038;&#038; and break the page.
const fs = require('fs');
const [input, output] = process.argv.slice(2);
let s = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');

const GOOGLE_JS = `
    // "Sign in with Google": shown only when the server has a Google Client ID
    let pendingGoogleCredential = null;
    async function initGoogleSignIn() {
       try {
          const cfg = await (await fetch(\`\${CONFIG.BACKEND_URL}/api/auth/google-config\`)).json();
          if (!cfg.clientId) return;
          if (!window.google) { setTimeout(initGoogleSignIn, 1000); return; }
          google.accounts.id.initialize({ client_id: cfg.clientId, callback: handleGoogleCredential });
          google.accounts.id.renderButton(document.getElementById('google-signin-btn'), { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill' });
          document.getElementById('google-signin-wrap').style.display = 'block';
       } catch (e) { console.log('Google sign-in unavailable'); }
    }

    async function handleGoogleCredential(resp) {
       try {
          const res = await fetch(\`\${CONFIG.BACKEND_URL}/api/auth/google\`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ credential: resp.credential }) });
          const data = await res.json();
          if (res.ok) { loginUser(data.user, data.user.role === 'employer' ? 'Employer' : 'Worker', data.token); return; }
          if (res.status === 404) {
             // New person: keep the Google link and ask once for the remaining details
             pendingGoogleCredential = resp.credential;
             document.getElementById('reg-name').value = data.profile ? data.profile.name : '';
             const note = document.getElementById('google-signin-note');
             note.innerText = "Google linked. Add your phone number and details once - next time just tap Google.";
             note.style.display = 'block';
             return;
          }
          showNotif(data.msg || "Google sign-in failed", "red");
       } catch (e) { showNotif("Google sign-in failed. Check your connection.", "red"); }
    }

    async function handleRegistration(e) {`;

const GOOGLE_BOX = `<div id="google-signin-wrap" style="display:none; margin-bottom:20px; text-align:center;">
          <div id="google-signin-btn" style="display:inline-block;"></div>
          <p id="google-signin-note" style="display:none; margin-top:10px; font-weight:700; color:var(--accent);"></p>
       </div>
       <div class="selector-grid">`;

const edits = [
  ['Google script tag', /(<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/socket\.io\/4\.7\.2\/socket\.io\.min\.js"><\/script>)/g,
    '$1\n  <script src="https://accounts.google.com/gsi/client" async defer></script>'],
  ['Google button box', /<div class="selector-grid">/g, GOOGLE_BOX],
  ['Google functions', /\n    async function handleRegistration\(e\) \{/g, GOOGLE_JS],
  ['send Google link at sign-up', /const body = \{ name, phone, city \};/g, 'const body = { name, phone, city };\n          if (pendingGoogleCredential) body.googleCredential = pendingGoogleCredential;'],
  ['start Google on load', /(if \(sessionStorage\.getItem\('bannerDismissed'\)\) dismissBanner\(\);)/g, '$1\n       initGoogleSignIn();']
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
