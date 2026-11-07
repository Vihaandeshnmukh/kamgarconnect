// Uptime and error check for the live site. Free: run it by hand, from cron, or from the GitHub Actions workflow
// .github/workflows/uptime-check.yml. Exits 1 (and prints what failed) if anything is down or slow.
//   node scripts/uptime-check.js [--api https://api.kamgar.de] [--site https://kamgar.de]
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const API = arg('--api', 'https://api.kamgar.de'), SITE = arg('--site', 'https://kamgar.de');

const checks = [
  ['API health (database connected)', `${API}/api/health`, (r, b) => r.status === 200 && b.includes('"connected"')],
  ['Public stats', `${API}/api/stats/public`, (r, b) => r.status === 200 && b.includes('total_workers')],
  ['Open jobs list', `${API}/api/jobs/available/Aurangabad`, (r, b) => r.status === 200 && b.trim().startsWith('[')],
  ['Worker search', `${API}/api/workers?city=Aurangabad`, (r, b) => r.status === 200 && b.trim().startsWith('[')],
  ['Unknown API path gives JSON 404', `${API}/api/nope`, (r, b) => r.status === 404 && b.includes('Not found')],
  ['Website loads', SITE, (r, b) => r.status === 200 && b.includes('Kamgar')]
];

(async () => {
  let failed = 0;
  for (const [name, url, ok] of checks) {
    const t0 = Date.now();
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(90000), headers: { 'User-Agent': 'kamgar-uptime-check' } });
      const b = await r.text();
      const ms = Date.now() - t0;
      const good = ok(r, b);
      if (!good) failed++;
      console.log(`${good ? 'OK  ' : 'FAIL'} ${name} - ${r.status} in ${ms} ms${ms > 15000 ? ' (slow: server was probably asleep)' : ''}`);
    } catch (e) { failed++; console.log(`FAIL ${name} - ${e.name === 'TimeoutError' ? 'no answer in 90 s' : e.message}`); }
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
