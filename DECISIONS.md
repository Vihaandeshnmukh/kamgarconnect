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
