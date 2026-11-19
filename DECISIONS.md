# Rebrand decisions: "Kamgar Connect" -> "Kamgar Chowk" (19 Nov 2026)
One line each: what I chose and why.

- Worked in a new worktree `work/rebrand-wt`, branch `rebrand-chowk` from origin/main (dac21d7); shared checkouts untouched.
- Live page backed up before any change: `D:\kamgar connectackupsebrand-2026-11-19\kamgar-wordpress.v2.7581232.html` (SHA-256 d1504263…, same as live).
- One `BRAND` constant at the top of the page's main script (`en`, `hi`, `mr`, `logoA`, `logoB`, `short`). Every JS-built text uses it: i18n dictionaries, WhatsApp/family/share texts, web-app manifest, poster logo, trade (SEO) pages, Privacy/Terms drafts, investor demo tour, Backstage mind map.
- Static HTML that search engines and no-JS visitors read (title, meta description, JSON-LD, header logo, headings, footer, join panel) is replaced in place; JS cannot feed those before the page loads. The patch script `qa-tools/site-patches/23-rebrand-chowk.js` does both and refuses to save if any old name is left.
- The logo keeps its two spans: `Kamgar<span>Chowk</span>` (header, poster; old public pages and the paused Expo app too).
- Hindi/Marathi texts that already used the Devanagari brand now say "कामगार चौक" (with suffixes: "कामगार चौकमध्ये", "कामगार चौकवर", "कामगार चौकद्वारे"). Hindi/Marathi WhatsApp/share texts that used the Latin "Kamgar Connect" now use the Latin "Kamgar Chowk", as before, so the name matches the link preview.
- Home-screen name: manifest `short_name` and `apple-mobile-web-app-title` were "Kamgar"; now "Kamgar Chowk" (12 characters, fits).
- Old pages served by the server at https://api.kamgar.de/ (`public/index.html`, register, admin, review) are still reachable, so they are renamed too. Their footer said "© 2026 Kamgar Connect Pvt. Ltd." - no such company exists, so it now says "© 2026 Kamgar Chowk" (no "Pvt. Ltd.").
- Assistant "Mitra" system prompt and the Backstage mind-map root name are user-visible: renamed. Server start-up log line renamed too (harmless).
- Not renamed (see REBRAND_REPORT.md for each hit): old unused page `kamgar-wordpress.html` and the `apply-*` generator scripts (not served; they are history and rollback material), past reports (they describe what happened under the old name), paths/repo names like `kamgarconnect`, `kamgar-connect/`, `D:\kamgar connect`.
- Company name: the KYC/telephony company is still "Kamgar Connect (to be renamed)". Not changed in docs: renaming a company is a legal step, not a text edit.
- `scripts/uptime-check.js` looks for "Kamgar" on the website: still true after the rename and after a rollback, so it is left as is.
- No email templates exist in the code (no mail library, no subjects), so there was nothing to rename there.
- New test `qa-tools/ui-stage-12.js` (stage "rebrand", 52 checks) runs inside the normal gate from now on.

## Tagline conflict (NOT changed, as you asked)
"Dignity, Not Chowks." / "सम्मान, चौक नहीं।" now argues against the product's own name. Same conflict in:
- Hindi hero line "चौक पर खड़े रहने की ज़रूरत नहीं, सम्मान से काम पाएं।"
- Investor demo first step "Daily-wage work without the chowk" / "चौक पर खड़े रहने की ज़रूरत नहीं".
- Poster headline "Need work? Don't wait at the chowk." / "काम चाहिए? चौक पर खड़े मत रहिए।" / "काम हवे आहे? चौकात थांबू नका."

Three alternatives for the new name (idea: the chowk reclaimed as a digital place of dignity):

| | English | हिंदी | मराठी |
|---|---|---|---|
| 1 | The chowk, now with dignity. | चौक, अब सम्मान के साथ। | चौक, आता सन्मानाने. |
| 2 | Your chowk, now on your phone. | आपका चौक, अब आपके फ़ोन पर। | तुमचा चौक, आता तुमच्या फोनवर. |
| 3 | A chowk where work finds you. | ऐसा चौक जहाँ काम आपको ढूँढे। | असा चौक जिथे काम तुम्हाला शोधते. |

Matching hero line if you pick one: "No more waiting in the sun. Find work with respect." / "धूप में इंतज़ार नहीं, सम्मान से काम पाएं।" / "उन्हात वाट पाहणे नाही, सन्मानाने काम मिळवा." Tell Claude which number and it changes the hero, footer, demo tour and poster together.

# Overnight decisions (8 Nov 2026)
One line each: what I chose and why.

- KAMGAR_CONTEXT.md does not exist; used kamgarconnect/HANDOFF.md, MORNING-8-NOV.md and work/bughunt/ROLEPLAY-SUMMARY.md as context.
- Worked in a separate git worktree (work/overnight-wt, branch overnight-build) so the shared checkout and other sessions were not disturbed.
- Stage gate = "no NEW test failures". 12 server checks already fail before any change because the run is near midnight India time on a Sunday (bookings "today", working-day checks); they are listed in qa-tools/baseline-fails.txt.
- The new website file is `kamgar-connect/kamgar-wordpress.v2.html`, started from preview/app-ui 5b05e6d (the version the owner approved and published live on 8 Nov). kamgar-wordpress.html on main is left as is.
- Demo phone numbers start with 1 (100000xxxx workers, 100001xxxx employers): no Indian mobile number starts with 1.
- Investor demo on the staging page is a client-side guided tour with demo data that never calls the server, because the staging page uses the production API and demo data must never reach production.
- Seed script only deletes records with isDemo: true and refuses any database not named exactly kamgar_demo.
- Stage 2: the Stitch redesign approved earlier tonight is the base; added dark-by-default (brief asks for orange on dark), automatic lite mode, and a browser-made manifest. No service worker (needs a file on kamgar.de; logged in BLOCKED.md).
- Stage 1 backend deploy: the browser was signed in to Render, so I used Manual Deploy → Deploy latest commit (your brief allows tested additive backend changes to go live). Stages that change only the page don't need a server deploy.
- Stage 3 map: privacy rule wins over a pin-per-worker map. The server sends only the nearest named area of Aurangabad (16 areas) and a distance rounded up to 0.5 km, to logged-in employers only; the map shows how many workers are near each area centre. Worker GPS positions are never sent.
- Saved workers are stored on the employer (favorites, max 100); recently hired comes from the employer's own bookings.
- Leaflet + OpenStreetMap tiles load only when the employer opens Map (keeps the page light).
- Stage 4: "in progress" = the worker taps Start work on the work day. A no-show (employer, after the work time) cancels the job and adds 1 to the worker's noShows. Reliability = finished / (finished + no-shows), shown only after 3 such events so one bad day doesn't brand a new worker. Rated bookings count as finished.
- Counter-offers: one offer per worker per job; the employer accepts or declines; an accepted offer's wage is used when that worker then takes the job (the job itself is not reassigned automatically, so the worker still confirms by accepting). Other workers never see offers.
- Stage 5: inbox messages are stored as a type + small data (names, dates, amounts, never phone numbers) and turned into text in the reader's language on the page; they expire after 60 days. The bell sits in the app header (the top bar has no room at 375 px). Checked on open, every 60 s and when the phone returns to the page. Web push skipped: it needs a service-worker file on kamgar.de.
- Stage 6: admin dashboard opens from the existing Backstage screen with the code ADMIN, then the real admin password (ADMIN_PASSWORD on Render; kept only in that browser tab). "Verified" means the team checked the worker in person; it is not an ID check (ID checks are out of scope). Admin lists mask phone numbers except in the badge queue, where the team needs to call the worker. Admin routes got a rate limit (120 per 10 min).
- Stage 7: "Delete my account" is a request, not an instant wipe: the account is hidden from search at once and the team deletes it by hand (a stolen phone number must not be able to wipe someone's account, and I must not write code that deletes production data unattended). Blocking works both ways: the blocked side disappears from the blocker's search and bookings are refused with the neutral "not available" message. The consent line is text under Join (no checkbox) so existing sign-up flows are unchanged.
- Privacy policy and Terms are drafts written from what the app really does (including that employers see workers' phone numbers), clearly marked "DRAFT - needs lawyer review", with placeholders for company details and a grievance officer.
- Stage 8: the thin wake banner became a "Waking up the server…" card that re-checks every 5 s and also shows "No internet" when offline; lite mode (stage 2) already skips the Three.js scene on slow phones. I tried loading three.js and canvas-confetti on demand, but it made automated page loads hang (a leftover frozen test browser also confused the picture), so both stay normal script tags; reverted, recorded in BLOCKED.md as a follow-up. No second Render service (free hours fit only one always-on service). Keep-alive steps are in KEEPALIVE.md.
- Stage 8 gate: ui-features and ui-fixcheck timed out on their first page load inside the full run (right after the server suites) but passed 25/25 and 23/23 when re-run alone; added a 30 s pause before the browser suites. Shipped stage 8 on that basis.
- Stage 9: trade pages are one page with ?trade=<slug> (WordPress serves a single page); each sets its own title/description and has a plain link so search engines can find it. All text is generic and true: no testimonials, counts or reviews. Poster QR codes are drawn in the browser (qrcodejs from cdnjs, loaded only when the poster opens).
- Stage 10: accessibility gate uses axe-core (WCAG 2 A/AA, serious+critical) and the WCAG 2.2 tap-target minimum of 24 px (the 40-56 px goal is met for main actions; the language buttons are 36x40 so the header fits a 360 px phone). Fixed: unlinked form labels, unnamed dropdowns and day checkboxes, a wrong ARIA role, and light-mode orange text/buttons darkened to #C2410C/#A33800 for AA contrast.

## Live-site fixes (8 Nov, afternoon)
- Text: hero and mission now say what is true: "A free way for daily-wage workers to be found directly by employers, in their own language. GPS-based matching." Removed "AI", "India's first", "workers without smartphones" and "ignored by every other platform"; page title is "Daily-wage work and workers in Aurangabad".
- Footer lock: when logged out it is moved into the footer row (no longer floating), so it can't cover links on any screen size; inside the app it stays hidden as before.
- History vs Stats was not a bug: Stats counts only bookings the worker confirmed and whose day has come. The 28 Oct hire was never confirmed, so History now tags such bookings "Not confirmed" (tooltip: not counted in Stats).
- Junk data: production was backed up first (D:\kamgar-backups\kamgar-2026-11-08T1354, outside the repo). The only hire in production was junk (employer "ddddd", place "ssss", 28 Oct, never confirmed) and was deleted. A record counted as junk only if both the place and the employer name were one letter repeated. Accounts were not touched, including the junk-looking employer "ddddd" and the older "(Demo)" test accounts (no isDemo flag) - delete those yourself if you want.
- Verified badge: renamed to "Checked by team (phone)". Today's flow: the worker taps Ask in Profile -> the request appears in the admin dashboard queue with their number -> someone calls them and checks name, work and wage -> Verify -> employers see the tag and the worker gets an inbox message. Turn down removes the request.
- Google: if an account has Google linked, phone-only login is refused for that account (403, "use Continue with Google"), and switching role from a phone-only account into it is refused too. Phone login stays for accounts without Google. No OTP/SMS.
- Forms: no prefilled 1 year / Rs 600; empty fields with placeholders; required at sign-up (0-99 years, Rs 100-5000) and in Profile.
- Contact: config lives on the server as Render environment variables CONTACT_EMAIL and WHATSAPP_NUMBER (no page republish needed); /api/contact returns them only if valid; the footer link stays hidden while they are empty.
