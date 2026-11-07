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
