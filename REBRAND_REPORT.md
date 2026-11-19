# Rebrand report: "Kamgar Connect" → "Kamgar Chowk" (19 Nov 2026)

Branch `rebrand-chowk` (worktree `D:\kamgar connect\work\rebrand-wt`). Names: English **Kamgar Chowk**, logo **Kamgar<span>Chowk</span>**, Hindi/Marathi **कामगार चौक**. kamgar.de, api.kamgar.de, env vars, database/collection names, API routes, CORS, storage keys, repo/folder/package/Render names unchanged.

## Status
| Step | Status |
|---|---|
| Backup of live page | Done: `D:\kamgar connect\backups\rebrand-2026-11-19\kamgar-wordpress.v2.7581232.html` (SHA-256 `d1504263…`, equals live) |
| Page + server + old pages + docs renamed | Done on `rebrand-chowk`, merged to `main` (see git log) |
| Tests | New rebrand check 52/52; full gate: see "Tests" below |
| Staging + live publish | **Blocked**: WordPress sign-in in the browser pane had expired (BLOCKED.md, first item) |
| Server deploy (Mitra prompt, mind-map name, old pages at api.kamgar.de) | **Blocked**: Render sign-in in the browser pane had expired (BLOCKED.md) |

## Search method
Case-insensitive search of the whole repo for `Kamgar Connect`, `KamgarConnect`, `kamgar connect`, `kamgarconnect`, `KAMGAR CONNECT`, `कामगार कनेक्ट`, standalone `कनेक्ट`, and split logo spans (`Kamgar<span>Connect</span>`, `Kamgar<span class="logo-highlight">Connect</span>`, `Kamgar<Text …>Connect</Text>`). Every standalone "Connect"/"connect" in the live page was read by hand. The WordPress database (other templates, template parts, pages, posts, site title) could not be searched because the sign-in had expired; the login page tab title shows the WordPress **site title is still "Kamgar Connect"** (manual item in BLOCKED.md).

## What changed
| File | What |
|---|---|
| `kamgar-connect/kamgar-wordpress.v2.html` (live page) | `BRAND` constant; title, meta description, apple home-screen title, JSON-LD (Organization + WebSite), header logo span, "How Kamgar Chowk works", "Why people trust Kamgar Chowk", footer "Kamgar Chowk • कामगार चौक", join panel, EN/HI/MR mission + join title + "new on" label, WhatsApp booking/family/share texts, manifest name/short_name, share title, Privacy/Terms drafts, trade (SEO) pages title/meta/share/text, job share texts, poster logo, investor demo tour, Backstage mind map. 45 brand mentions (36 "Kamgar Connect", 7 "कामगार कनेक्ट", 2 logo spans), made by `qa-tools/site-patches/23-rebrand-chowk.js` |
| `kamgar-connect/routes/assistant.js` | Mitra system prompt (users see what Mitra says) |
| `kamgar-connect/routes/timeline.js` | Mind-map root name (Backstage) |
| `kamgar-connect/server.js` | Start-up log line |
| `kamgar-connect/public/*` (index, register-worker, register-employer, admin, review, js/i18n, js/translations, js/main, js/stats, css comment) | Old pages still served at https://api.kamgar.de/ : titles, logo spans, texts in EN/HI/MR, admin dashboard title, signup "Welcome to Kamgar Chowk", footer (fake "Pvt. Ltd." dropped) |
| `kamgar-connect/expo-app/app.json` (display `name` only, `slug` kept), `expo-app/screens/*` | Paused mobile app: splash, home logo span, alerts |
| `kamgar-connect/package.json` | `description`, `author` (`name` kept) |
| `kamgar-connect/README.md`, `kamgar_info.md`, `docs/legal/privacy-policy.html`, `docs/legal/terms-of-use.html`, `AUDIT_REPORT.md` heading, `scripts/demo-seed.js` comment | Docs and legal drafts |
| `D:\kamgar connect\KAMGAR_CONTEXT.md` | Rename note |

No email templates exist in the code (no mail library, no subjects): nothing to rename. Notification (inbox) texts and admin dashboard texts in the live page contained no brand name.

## Remaining hits, and why each was kept
| Where | Hit | Why kept |
|---|---|---|
| Live page | `preconnect` (2×), `navigator.connection`, "slow connections", "Check your connection" (3×), "Backend connected" (console), "Motor and pump connections" | Technical words / ordinary English, not the brand |
| Live page | JSON-LD "Free website connecting daily-wage workers…", Terms "only connects workers and employers" | Ordinary verb |
| Live page | "Dignity, Not Chowks", "सम्मान, चौक नहीं", Hindi hero line, demo/poster "don't wait at the chowk" | Tagline kept on your instruction; conflict flagged in DECISIONS.md with 3 alternatives |
| `public/js/translations.js` / `public/index.html` | `step_04: "कनेक्ट करें और हायर करें"` / "Connect & Hire" | Verb ("connect and hire"), not the brand |
| `kamgar-connect/kamgar-wordpress.html` (11) | Old page | Not served anywhere; it is the source of rollback versions. Rename it only if it is ever made live again |
| `apply-google.js`, `apply-qa-fixes.py`, `apply-redesign.js`, `apply-stitch.js` | Generator scripts | Not served; history of how the old page was built |
| `package-lock.json` | `"name": "kamgarconnect"` | Package name (must not change) |
| `.git`, all `kamgarconnect` / `kamgar-connect` / `D:\kamgar connect` paths | Repo, folder, path names | Must not change (other things reference them) |
| `AUDIT_REPORT.md` (8), `MORNING_REPORT.md` (3), `DECISIONS.md` older sections, `BLOCKED.md`, `BACKUP.md`, `DEMO.md`, `KEEPALIVE.md`, `TESTING.md`, `claude_code_prompt.md` | Past reports and the original build prompt, mostly paths | They record what happened under the old name; headings with the brand were updated |
| `DESIGN_NOTES.md` | Stitch project "Kamgar Connect Worker Platform" | Name of an external Stitch project |
| `MORNING_REPORT.md`, `KAMGAR_CONTEXT.md` | "Company registration for Kamgar Connect" | Company (KYC) name: renaming a company is a legal step, see BLOCKED.md |
| `scripts/uptime-check.js` | checks the site contains "Kamgar" | Still true after the rename and after a rollback |
| `qa-tools/make-chat-history.js` (outside repo) | Heading of an internal chat log | Internal tool, nobody else sees it |
| Branch `archive/voice-system`, tag `voice-system-v1` | Old texts | Must not be touched |

## Tests
- `qa-tools/ui-stage-12.js` (stage `rebrand`): loads the page and fails if any old-name variant is in visible text, title, meta/OG, JSON-LD, attributes, the manifest, share/WhatsApp texts or the dictionaries, in EN/हिं/मरा, logged out, logged in as worker and employer, with join, Privacy, Terms, poster, demo tour, inbox and Backstage open; checks logo spans Kamgar + Chowk at 375 and 1280 px. Result: **52/52 passed**.
- Full gate (`qa-tools/gate-rebrand.sh`, same as gate.sh but pointed at this worktree): **GATE OK**: all 14 server suites and 6 browser suites pass (ui-stages 224/224, including the new rebrand stage). The only failure is the already-known baseline check "can't hire your own worker account" (test-me, listed in baseline-fails.txt; it failed before this change too).

## Rollback
1. Page: publish the backup (or commit `7581232`'s v2 file, SHA-256 `d1504263…`) to `twentytwentyfive//home` and `twentytwentyfive//page-kamgar-staging` with `qa-tools/publish-template.browser.js` (COMMIT `7581232`, WANT_SHA `d1504263…`, EXPECT_CURRENT = the rebrand file's SHA).
2. Server (if deployed): Render → Deploys → the previous deploy (`7581232`) → Rollback: https://dashboard.render.com/web/srv-dbfkordg1s2s7386lq5g/deploys
3. Code: `git revert` the rebrand merge on main (no force-push).
