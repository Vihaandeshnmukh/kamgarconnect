# Morning report: overnight build, 8 Nov 2026

**Your live page (kamgar.de) was not changed overnight.** The new website is in the repo as `kamgar-connect/kamgar-wordpress.v2.html` and on the private staging page. The server changes (all additive and tested) are live on Render.

## Stages
| # | Stage | Result | Tag |
|---|---|---|---|
| 1 | Demo environment + investor demo | Done | stage-1 |
| 2 | UI: dark by default, lite mode, add to home screen | Done | stage-2 |
| 3 | Search: filters, map by area, saved workers, recently hired | Done | stage-3 |
| 4 | Job lifecycle: start work, no-show, reliability, wage offers | Done | stage-4 |
| 5 | In-app inbox with badge | Done (web push blocked) | stage-5 |
| 6 | Admin dashboard + verified-badge queue | Done | stage-6 |
| 7 | Trust and safety: report, block, delete request, legal drafts | Done | stage-7 |
| 8 | Speed: waking-up card, keep-alive notes | Done (lazy three.js reverted) | stage-8 |
| 9 | Growth: trade pages, QR poster, WhatsApp share | Done | stage-9 |
| 10 | Quality: accessibility fixes, backups, uptime check | __STAGE10__ | stage-10 |

Nothing was reverted as a whole stage. One idea inside stage 8 (loading three.js only when needed) was tried and taken out again; see BLOCKED.md.

## Tests
__TESTS__

## Links
- Staging page (log in to WordPress first): https://kamgar.de/kamgar-staging/
- Investor demo: https://kamgar.de/kamgar-staging/?demo=1
- Trade page example: https://kamgar.de/kamgar-staging/?trade=mason
- Admin dashboard: open staging → lock button (bottom corner) → type ADMIN → your ADMIN_PASSWORD from Render
- Render deploys: https://dashboard.render.com/web/srv-dbfkordg1s2s7386lq5g/deploys

## Publishing kamgar-wordpress.v2.html to the live site (when you're happy with staging)
1. Look at staging on your phone and laptop: https://kamgar.de/kamgar-staging/
2. Tell Claude: "publish v2 to live". Claude will take the file from GitHub at a fixed commit, check its SHA-256, save the current live page as a backup, post it to the `twentytwentyfive//home` template and check every script on the live page.
3. Doing it yourself instead: WordPress → Appearance → Editor → Templates → "Blog Home" (https://kamgar.de/wp-admin/site-editor.php?postType=wp_template) → ⋮ → Code editor → replace everything with the content of `kamgar-connect/kamgar-wordpress.v2.html` from GitHub (https://github.com/Vihaandeshnmukh/kamgarconnect/blob/main/kamgar-connect/kamgar-wordpress.v2.html → Raw) → Save.
4. **Rollback:** the current live page equals commit `1c14896` of `kamgar-connect/kamgar-wordpress.html`... __ROLLBACK__

## Rollback tags (server)
Every stage is tagged `stage-1` … `stage-10` on GitHub. To go back on Render: Deploys → pick the deploy of the tag you want → **Rollback** (https://dashboard.render.com/web/srv-dbfkordg1s2s7386lq5g/deploys). The deploy before tonight was `60e0e9a`.

## Highlights from DECISIONS.md
- Map never shows a worker's position: only how many workers are near each named area, and a distance rounded up to 0.5 km.
- Investor demo on staging is a guided tour that never talks to the server (staging uses the production API, and demo data must not reach it).
- Dark theme is now the default for first visits (your brief); the sun/moon button still switches.
- "Delete my account" hides the person at once and creates a request for the team; it does not wipe data automatically.
- Reliability % shows only after 3 finished jobs or no-shows, so one bad day doesn't brand a new worker.
- Admin lists mask phone numbers except in the badge queue (the team needs to call).

## BLOCKED.md highlights
- Seeding the real `kamgar_demo` database: the MongoDB tool here is read-only and Node on this PC can't resolve `mongodb+srv` addresses. Run the one command in DEMO.md.
- Offline app and web push need a `sw.js` file on kamgar.de (WordPress can't serve it from a page).
- Loading three.js on demand: reverted, retry with a real slow phone.

## Privacy and risk
- **Login is the phone number alone.** Anyone who knows a number can open that account. Nothing tonight made this worse, but it is the biggest risk; one-time codes (OTP) are the fix (needs an SMS provider and company registration).
- **Employers see workers' phone numbers** in search, saved and recently-hired lists, offers and bookings (as before). New features add no new personal data: the map uses area names, distances are rounded, inbox messages never contain phone numbers, admin lists mask numbers.
- New data stored: saved workers, blocked lists, reports (with an optional note), inbox messages (deleted after 60 days), wage offers, no-show counts and the verified flag.
- Reports show the reporter only to the admin, never to the reported person.
- "Verified" means the team met the worker; it is not an ID check. Don't present it as identity verification.
- Privacy policy and Terms are drafts written from what the app really does; they need a lawyer before you rely on them.

## Still needs real people or paperwork
- [ ] Company registration for Kamgar Connect (needed for SMS sender IDs / DLT, WhatsApp Business, payments).
- [ ] OTP provider (Firebase, MSG91 or 2Factor) for phone login codes.
- [ ] Lawyer review of the Privacy policy and Terms drafts; add company details and a grievance officer.
- [ ] Decide who on the team checks workers in person for the "verified" badge, and who reads reports and deletion requests (admin dashboard).
- [ ] Run the demo seed once (DEMO.md) if you want the kamgar_demo database filled.
- [ ] Optional: cron-job.org backup pinger (KEEPALIVE.md); weekly backups (BACKUP.md).
