# Kamgar Connect: Audit Report

**Date:** 2 Nov 2026. **Scope:** backend (`kamgar-connect/`), MongoDB Atlas `kamgar`, Twilio voice, Render hosting, Hostinger DNS, kamgar.de (WordPress).
**Method:** zero trust. Every claim below was reproduced: code read, local tests against in-memory MongoDB, live HTTP checks, Twilio REST API, Render/Hostinger/WordPress dashboards, read-only DB queries.
No secret values are printed in this report.

## Summary

| Area | State found | State now |
|---|---|---|
| Hosting / DNS | `api.kamgar.de` → CNAME `kamgar-api.onrender.com` (Render, Singapore). Health 200, CORS correct. No Railway records left. | Same. Fixes deployed and re-tested live (H-7) |
| Backend | All routes registered and protected. No "RESTRICTION REMOVED FOR TESTING" left. 0 npm vulnerabilities. Several real bugs (below). | Fixed, 75/75 + 160 regression tests pass |
| Database | 7 collections, indexes match the models, schema matches code. Leftover QA test data. | Test data deleted (D-2); MCP user made read-only (D-4) |
| Voice | Inbound webhook works with signature checks. Gemini step silently never worked on calls. Cold starts not prevented. | Gemini fixed; cold start needs your decision |
| Website | All flows work. Theme header/footer/blog loop shown, 3 small JS bugs. | Fixed and live: theme wrappers removed, title set, 3 JS bugs fixed |

## Findings

Severity: Critical / High / Medium / Low. Status: FIXED (verified), READY (written, needs your OK), MANUAL (only you can do it), OPEN.

### Security

| ID | Sev | Finding | Root cause | Evidence | Change | Verified | Status |
|---|---|---|---|---|---|---|---|
| S-1 | Critical | **GitHub personal access token** (`ghp_…`, 40 chars) is in the PUBLIC repo's history | File `ssss` committed in `024c871` ("fix start script"); deleting it in `ea97936` did not remove it from history | `git show 024c871:ssss` → starts `ghp_`, 40 chars | Removed from all history with `git filter-branch`, force-pushed (`9f713e9` → `8e3ffa0`, same code tree) | `git rev-list main --objects` has no `ssss`; local reflog/gc cleaned | PARTLY FIXED. GitHub still serves the old commit by SHA (`/commits/024c871` → 200) until its cache is purged. **You must revoke the token** at github.com/settings/tokens |
| S-2 | High | **"phone recovory code"** (24-char account recovery code) in PUBLIC history | Committed in first commit `7988aa4`, removed in `839a0d0`, still in history | `git rev-list --all --objects` → `df47e87 phone recovory code` | Removed from history with S-1 | as S-1 (`/commits/7988aa4` still 200 on GitHub) | PARTLY FIXED. **Regenerate the recovery codes**; also delete the copy in `D:\kamgar connect\kamgarconnect-main\` |
| S-3 | Info | No other secrets in tree or history | Scanned all commits for Twilio SIDs/keys, Google keys, ElevenLabs keys, Mongo URIs with passwords, JWT/admin secrets | regex scan of `git log --all -p` | none | | OK |
| S-4 | High | Login = knowing a phone number (no OTP); worker phone numbers are visible to any logged-in employer | Design gap noted in `routes/auth.js:138` | code + earlier QA report C1 | none (needs a new feature) | | Recommended next |
| S-5 | Info | "RESTRICTION REMOVED FOR TESTING" shortcuts | Already replaced by `auth` + `requireRole`/`requireSelf` + `adminAuth` in an earlier session | `grep` finds none; tests: go-live/hire/assign/timeline without login → 401, wrong role → 403 | none | test-security 114/114, test-audit 75/75 | OK |

### Hosting and infrastructure

| ID | Sev | Finding | Root cause | Evidence | Change | Verified | Status |
|---|---|---|---|---|---|---|---|
| H-1 | Info | Backend reachable and healthy | Render service `kamgar-api` (free, Singapore, Node, branch main) | DNS: `api` CNAME `kamgar-api.onrender.com`; `GET /api/health` 200 JSON in 0.25s; preflight from kamgar.de 204 with correct headers | none | curl | OK |
| H-2 | High | Render free instance sleeps; the keep-alive GitHub Action runs every **3–7 hours**, not every 5 min | GitHub throttles scheduled workflows; a sleeping instance needs ~50s to wake, Twilio waits 15s | GitHub API: last 30 scheduled runs are 3–7 h apart (e.g. 01:53, 08:52 UTC on 2 Nov) | none (no free in-stack fix) | | MANUAL decision (see below) |
| H-3 | Medium | Health check said "ok" even when MongoDB was down | `/api/health` never looked at the DB connection (Atlas auto-pause happened before) | `server.js` old health handler | Health returns 503 `{db:'disconnected'}` when the DB is not connected | test-audit: DB stopped → 503 | FIXED |
| H-4 | Medium | Unknown `/api/*` paths returned **200 + homepage HTML** | Catch-all `app.get('*')` served `index.html` for API paths too | `curl api.kamgar.de/api/nope` → 200 text/html | JSON 404 for `/api/*` | test-audit + live | FIXED |
| H-5 | Low | Malformed JSON returned an HTML error page | No JSON error handler | live: `POST /api/auth/login '{bad'` → 400 text/html | JSON `{msg:'Invalid JSON'}` | test-audit + live | FIXED |
| H-6 | Low | `ELEVENLABS_API_KEY` is not set on Render | Never added | Render env lists 8 vars, no ElevenLabs; ElevenLabs dashboard: 0 / 10,000 credits used | none | | MANUAL (optional) |
| H-7 | Info | Fixes need a manual deploy on Render | Auto-deploy off | Render events | Manual deploy of `c8d2c41` | Live after ~1 min: health has `db:connected`, `/api/nope` → JSON 404, bad JSON → JSON 400, tts validation, config.js, mind map, preflight 204, signed voice webhook 200 / forged 403 | FIXED |

### Backend code

| ID | Sev | Finding | Root cause | Evidence | Change | Verified | Status |
|---|---|---|---|---|---|---|---|
| B-1 | Medium | Job SMS (accept, complete) could never be delivered | Sent to the stored 10-digit number, which Twilio rejects (needs `+91…`) | `routes/jobs.js` old lines 126–135, 192–195 | `sendSms()` formats `+91XXXXXXXXXX`, skips demo numbers, logs failures | test-audit (accept/complete with demo numbers: no crash) | FIXED |
| B-2 | Medium | `/api/assistant/tts` took any text, any length | No input validation; one request could use the whole 10,000-char ElevenLabs month once a key is set | `routes/assistant.js:100` | text must be a string ≤ 300 chars | test-audit: empty → 400, 5000 chars → 400 | FIXED |
| B-3 | Low | Old sign-up routes `/api/register/*` had no rate limit | Only `/api/auth` was limited | `server.js` | Same limiter as `/api/auth` | test-audit | FIXED |
| B-4 | Low | Posting a job with the token of a deleted employer → 500 after the job was saved | `employer.jobsPosted.push` on `null` | `routes/jobs.js:59-61` | `updateOne($push)` | test-audit | FIXED |
| B-5 | Medium | Admin page `api.kamgar.de/admin` could not load data | `public/config.js` still pointed at `https://your-app.railway.app`; CALL button sent no admin password | `curl api.kamgar.de/config.js` | same-origin config; CALL sends `Authorization` | test-audit (`/config.js`, admin notify) | FIXED |
| B-6 | Low | Admin page ASSIGN button always fails (401) | `/api/calls/assign-job` is employer-only since the security fixes | `public/admin.html:254` | none (would need admin-hire logic) | | Recommended next |
| B-7 | Info | `GET /api/employers/check/:phone` (listed in the context file) does not exist | Never built; the website does not call it | route list + website fetch list | none | test-audit: JSON 404 | OK (not used) |
| B-8 | Low | Old local test `qa-tools/test-api.js` fails 8/24 | It expects the old no-login behaviour | run output | Superseded by `qa-tools/test-audit.js` | | OK |

### Database (read-only, user `kamgar-mcp-ro`)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| D-1 | Info | 7 collections: workers 19, employers 8, jobs 3 (all pending), calls 7, callsessions 1, reviews 2, timelines 0. Indexes match models (phone unique, location 2dsphere, googleId sparse, callSid unique). Field types match the schemas. All workers have hashed passwords, valid 10-digit phones, cities and skills from the fixed lists. 17/19 workers are demo numbers (`0…`). | read-only audit script | OK |
| D-2 | Low | Leftover QA/audit test data in production: XSS-probe worker, 2 QA reviews, audit test worker/employer, 2 audit call sessions, 1 audit call record | DB query | FIXED: deleted by `_id` (8 docs) and `QA Worker Two (Demo)` rating reset to 0/0; counts now workers 18, employers 8, reviews 0, callsessions 0, calls 7 |
| D-4 | Medium | The Mongo MCP user `kamgar-mcp-ro` had **readWriteAnyDatabase** although it was meant to be read-only | Created with the wrong built-in role | Atlas Database Users page | Role changed to `readAnyDatabase@admin` | Test write → rejected (AtlasError), reads OK | FIXED |
| D-3 | Info | Roadmap (timeline) collection is empty, so the TIME page was blank | count 0 | Empty-state text in F-3 |

### Voice system (Twilio + Gemini + ElevenLabs)

| ID | Sev | Finding | Root cause | Evidence | Change | Verified | Status |
|---|---|---|---|---|---|---|---|
| V-1 | Info | Number +1 814 821 5946: Voice URL `https://api.kamgar.de/api/assistant/voice` (POST), status callback `/api/calls/webhook`: both match the real server | | Twilio API | none | Signed POST to live webhook → 200 TwiML language menu (340 ms); forged signature → 403 | OK |
| V-2 | High | Gemini never helped on phone calls (silent failure) | `aiUnderstand` uses a 5s timeout but `gemini-3.5-flash` takes 5–14s per answer | 4 timed calls: 14.0s, 7.7s, 12.1s, 4.8s; `gemini-3.5-flash-lite`: 1.0s, 1.6s, 0.8s, 1.4s | Calls use `gemini-3.5-flash-lite` (override `GEMINI_CALL_MODEL`) | test-calls 34/34 | FIXED |
| V-3 | Low | Twilio warning 21626 "invalid statusCallbackEvents no-answer busy failed" | Only `initiated/ringing/answered/completed` exist | Twilio alert on call CA5e607a | valid events only | test-audit | FIXED |
| V-4 | Medium | A hire call that ended without a keypress left the worker booked for the whole day | Status webhook only freed the worker on failed/busy/no-answer | DB: the only real call (13s) ended with `workerResponse: pending` | `completed` + still pending → declined, worker freed | test-audit (both paths) | FIXED |
| V-5 | Low | Texts to the number got an automatic Twilio demo reply that failed (error 21408) | Number's SMS URL was `demo.twilio.com/welcome/sms/reply` | Twilio alerts 27 Oct | SMS URL cleared | Twilio API shows `sms_url=''` | FIXED |
| V-6 | High | Twilio trial: callers first hear a trial message and must press a key; outbound calls/SMS only reach the 2 verified numbers | Trial account ($14.29 left) | Twilio API: `type=Trial`, 2 verified caller IDs | none | | MANUAL decision (costs money) |
| V-7 | Info | No real inbound registration call has ever reached the server | Twilio call log: 1 call total (outbound, 27 Oct) | Twilio API | | | Test by calling the number once |
| V-8 | Info | ElevenLabs is only used by the old site's voice widget (`/api/assistant/tts`), not by phone calls (they use Twilio's Polly.Aditi) | design | code | | | OK |
| V-9 | Info | AI chat (`/api/assistant/chat`, gemini-3.5-flash) works live: 6–10s replies | | live curl | | | OK |

### Website (kamgar.de)

Tested live in the browser: worker form (empty → 5 field errors; valid → registered, logged in, live), availability toggle (go-offline/go-live 200), language switcher (EN/HI/MR redraws the dashboard), employer form (201), worker grid (phones shown to employers), hire modal (empty blocked; valid → assign-job 200), secret page (wrong code error; TIME; MIND mind map), mobile 375px (no sideways scroll). Console: no errors (the sign-up form first tries to log in, so a new number shows one expected 404 for `/api/auth/login`). Live page script = repo `kamgar-wordpress.html` (byte-identical).

| ID | Sev | Finding | Root cause | Evidence | Change | Status |
|---|---|---|---|---|---|---|
| F-1 | Medium | WordPress theme header ("kamgar"), an empty blog-posts loop and the theme footer (Blog, About, Events, Shop… "Designed with WordPress") wrap the page | Template `twentytwentyfive//home` = header part + page HTML + `<main>` query loop + footer part | REST `GET /wp/v2/templates/twentytwentyfive//home` | Template now holds only the page HTML (old version: header part + page + query loop + footer part; recoverable from WP template revisions) | FIXED: live page has no theme header/footer, script parses, no `&#038;` |
| F-2 | Low | Browser tab title is "kamgar" | WordPress site title | Settings API `title: "kamgar"` | Site title set to "Kamgar Connect" | FIXED: tab title "Kamgar Connect" |
| F-3 | Low | Secret page: after one unlock, reopening it shows the old content with no code box (needs a page reload); TIME page blank when empty | `unlockSecret` hides the code screen, `openSecretPage` never shows it again | live test: `inputVisibleOnReopen: false` | reset the code screen on open; "No roadmap entries yet." | FIXED: live TIME → MIND without reload works; empty roadmap text shown |
| F-4 | Low | Hire date picker allows yesterday between 00:00 and 05:30 IST (server then rejects it) | `min` used the UTC date | code `openHireModal` | local date | FIXED (commit `8e3ffa0`) |
| F-5 | Info | US helpline +1 814 821 5946 shown 3 times | It is the only working number | page text | none | Recommended next (Indian number) |

## Still broken / needs manual action from you

1. **Revoke the leaked GitHub token** (S-1) at github.com/settings/tokens and **regenerate the recovery codes** (S-2). History is purged, but GitHub still serves the old commits by SHA; for full removal ask GitHub Support to purge cached views of `024c871` and `7988aa4`. Anyone with another clone made before 2 Nov must re-clone (history was rewritten).
2. ~~Test data (D-2)~~ done.
3. **Cold starts (H-2):** choose Render Starter (~$7/month, never sleeps) or accept that the first call after idle may fail (the second works).
4. **Twilio trial (V-6):** upgrading (adding funds) removes the trial message and the verified-numbers limit.
5. **ElevenLabs (H-6), optional:** add `ELEVENLABS_API_KEY` in Render → Environment.
6. **Make one real test call** to the number to confirm registration end to end (V-7).

## Final regression (2 Nov 2026)

- Local: test-audit 75/75, test-security 114/114, test-calls 34/34, test-google 12/12.
- Live API: health 200 (`db: connected`), workers, stats, jobs/available, timeline 200 (all < 0.8 s, warm); unknown path JSON 404; signed voice webhook 200 / forged 403.
- Live site: title "Kamgar Connect", no theme footer, worker sign-up/login, toggle, languages, employer sign-up, worker grid, hire, secret page (TIME/MIND, reopen) all work; no console errors except the expected login-probe 404.

## Recommended next (not built: new features or services)

- OTP login (S-4) using Twilio Verify or SMS codes.
- Indian phone number (Exotel etc.) to replace the US helpline (F-5).
- Admin-side hire from `api.kamgar.de/admin` (B-6).
- A real uptime pinger if Render stays on the free plan (H-2).

## How to re-run the tests

```
cd "D:\kamgar connect\qa-tools"
node test-audit.js ..\kamgarconnect\kamgar-connect      # 75 checks: every route, webhooks, fixes
node test-security.js ..\kamgarconnect\kamgar-connect   # 114 checks
node test-calls.js ..\kamgarconnect\kamgar-connect      # 34 checks: phone registration flow
node test-google.js ..\kamgarconnect\kamgar-connect     # 12 checks
```
Run them in a shell without the real `TWILIO_*`, `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` variables (test phones like 9000000001 would otherwise be dialled for real).
