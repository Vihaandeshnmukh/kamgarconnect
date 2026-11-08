# Update 8 Nov afternoon: live-site fixes (published)

**Live now:** page commit `7581232` on kamgar.de and staging (SHA-256 `d1504263…`); server deployed on Render (`7581232`). Rollback for the page: commit `a2a4e30` (SHA-256 `e4a414a1…`); for the server: Render → Deploys → previous deploy → Rollback.

1. **Text:** hero and mission now say "A free way for daily-wage workers to be found directly by employers, in their own language. GPS-based matching." No "AI", "India's first" or "without smartphones" (also in Hindi and Marathi).
2. **Footer:** the lock now sits inside the footer when logged out, so it can't cover "Privacy policy (draft)" on any screen (tested 375 and 1280 px).
3. **History vs Stats:** not a counting bug. Stats counts only bookings the worker *confirmed* whose day has come; the 28 Oct hire was never confirmed. History now tags these "Not confirmed". Test added (test-live-fixes.js).
4. **Database:** backed up first to `D:\kamgar-backups\kamgar-2026-11-08T1354` (outside the repo). **Deleted 1 record:** hire `6ae0cb8ff92d35db0e5e9519` (employer "ddddd", place "ssss", 28 Oct, never confirmed). It was the only hire in production. No accounts deleted. Still there for you to decide: employer account "ddddd" and older test accounts named "(Demo)" (10 workers, 1 employer with 2 open jobs).
5. **Badge:** now "Checked by team (phone)". What it does: worker taps **Ask** in Profile → request shows in the admin dashboard with their number → someone calls them and checks name, work and wage → **Verify** → employers see the tag on the card and the worker gets an inbox message. Turn down removes the request.
6. **Google login:** an account with Google linked can no longer be opened by phone number alone (also not by switching role from a phone-only account). Phone login still works for accounts without Google. Your Google-linked account is the worker "vihaan deshmukh"; use Continue with Google for it.
7. **Forms:** experience and daily wage start empty with placeholders and are required at sign-up and in Profile.
8. **Contact:** add `CONTACT_EMAIL` and `WHATSAPP_NUMBER` on Render (link below); the footer link appears by itself, no page change needed.
9. **Checked:** "Delete my account" is in Profile. New screens checked in Hindi and Marathi, and the logged-out layout with no admin bar (375 and 1280 px).
10. **Tests:** all suites green except the one test-me check that fails before any change (books a Sunday); new: test-live-fixes 11/11, live-fix page checks 23/23.

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
| 10 | Quality: accessibility fixes, backups, uptime check | Done | stage-10 |

Nothing was reverted as a whole stage. Server deploys: stages 1, 3, 4, 5, 6 and 7 deployed on Render by me (Manual Deploy, all succeeded); stages 2, 8, 9 and 10 changed only the page, scripts or docs, so no deploy was needed. Live server = `76da167` (stage-7); `main` = `a2a4e30` (stage-10). One idea inside stage 8 (loading three.js only when needed) was tried and taken out again; see BLOCKED.md.

## Tests
Final full run (gate, 8 Nov ~03:00 IST), all on a throwaway local database:
- Server: features 40/40, bugfix 49/49, me 38/39*, audit 72/72, security 113/113, google 16/16, demo-seed 13/13, discovery 22/22, lifecycle 36/36, inbox 16/16, admin 21/21, safety 27/27, backup 7/7.
- Browser (real Chrome): features 25/25, fixcheck 23/23, batchA 7/7, batchB1 5/5, dropdown all pass, devices 128/128 (375/768/1024/1280, light + dark), overnight stages 149/149, accessibility 24/24 (axe-core WCAG 2 AA).
- \* The one test-me miss ("can't hire your own worker account") already failed before any change tonight: it books "today", and today is a Sunday the test worker doesn't work. Same for a few bugfix/security checks earlier in the night; all are listed in qa-tools/baseline-fails.txt.
- Live after the last deploy: uptime check 6/6; new endpoints answer (open search 200, protected ones 401).
- **Production data untouched:** 0 records with isDemo in workers/employers/calls; workers 12, employers 7, jobs 2, the same as before the run. The new `notifications` and `reports` collections exist (created by the server's indexes) and are empty.

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
4. **Rollback:** the live page today is the version you approved on 8 Nov: branch `preview/app-ui` commit `5b05e6d`, file `kamgar-connect/kamgar-wordpress.html` (SHA-256 `45a5407f…`). To roll back, tell Claude "roll back live to 5b05e6d", or paste that file from https://github.com/Vihaandeshnmukh/kamgarconnect/blob/5b05e6d/kamgar-connect/kamgar-wordpress.html into the same template. The version before that is commit `1c14896` on main.
5. After publishing v2, the server already supports everything (all stages are live on Render).

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
