# Blocked / needs you
Each item: what is blocked and the exact steps for you.

## Rebrand to "Kamgar Chowk" (19 Nov 2026): your manual steps
1. **Sign in again so the new page can go live.** The WordPress and Render sign-ins in Claude's browser pane had expired, so the rename is ready and tested but **not published** yet. Open the Claude app's browser pane and sign in at https://kamgar.de/wp-admin/ and at https://dashboard.render.com/ , then tell Claude "publish the Kamgar Chowk rebrand" (it publishes staging, checks desktop + mobile, then live, then deploys the server).
2. **Google sign-in screen name** (people see it when they tap "Continue with Google"): https://console.cloud.google.com/apis/credentials/consent → Edit app → App name "Kamgar Chowk" → Save. (Logo there too, if you upload one.)
3. **WordPress site title and tagline** (browser tab on WordPress pages, login screen; currently "Kamgar Connect"): https://kamgar.de/wp-admin/options-general.php → Site Title "Kamgar Chowk", Tagline (your choice, see DECISIONS.md) → Save Changes.
4. **WordPress template name** "Blog Home" (only you see it) and SEO plugins: https://kamgar.de/wp-admin/site-editor.php?postType=wp_template . Check https://kamgar.de/wp-admin/plugins.php for an SEO plugin (Yoast, Rank Math, All in One SEO) or Elementor; if one is installed, change its site name/title there too. The site uses the Twenty Twenty-Five block theme, so Elementor is probably not installed (could not check: signed out).
5. **Site icon / favicon and any logo image**: https://kamgar.de/wp-admin/options-general.php (Site Icon) or https://kamgar.de/wp-admin/customize.php → Site Identity. The page's own app icon is drawn in code and has no name in it.
6. **Email sender names** (Hostinger): https://hpanel.hostinger.com/emails → each mailbox → settings → display/sender name "Kamgar Chowk".
7. **Social profiles** (Instagram, Facebook, LinkedIn, WhatsApp Business, X, YouTube): change the display name and bio in each app (only you can sign in).
8. **Pitch deck**: replace "Kamgar Connect" with "Kamgar Chowk" and the logo text with Kamgar + Chowk (orange); consider the tagline options in DECISIONS.md.
9. **Optional:** GitHub repo description (the repo name stays): https://github.com/Vihaandeshnmukh/kamgarconnect (gear icon next to "About"). Render service display only, name must stay: https://dashboard.render.com/web/srv-dbfkordg1s2s7386lq5g/settings
10. **Company name:** the new company for the Indian number/KYC is still called "Kamgar Connect". If you register it under the new name, tell Claude so the docs and the Terms/Privacy drafts get the legal name.


## Service worker (offline app) - not possible from a single WordPress page
A real installable/offline app needs a file `sw.js` served from https://kamgar.de/sw.js. WordPress block templates can't serve files.
Steps if you want it later: 1) WordPress admin → Plugins → Add New → install a free plugin such as "PWA" (https://wordpress.org/plugins/pwa/) or upload sw.js to the site root with your host's File Manager (Hostinger: https://hpanel.hostinger.com/ → Websites → File Manager → public_html). 2) Tell Claude, and the page will register it.

## Web push notifications
Same blocker as the service worker: push needs sw.js on https://kamgar.de/ plus VAPID keys (free) stored on Render. Steps: 1) do the service-worker step above; 2) on Render add environment variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (Claude can generate them, free): https://dashboard.render.com/web/srv-dbfkordg1s2s7386lq5g/env ; 3) ask Claude to wire the existing inbox to web push.

## Not done: loading three.js (about 600 KB) only when needed
Tried in stage 8; automated page loads then timed out in tests, so it was reverted (the 3D scene is already skipped in lite mode on slow phones). Worth retrying with a real slow phone: ask Claude "retry lazy three.js".

## Seeding the real kamgar_demo database
The script is ready and tested (qa-tools/test-demo-seed.js, 13/13), but I could not run it against Atlas: the MongoDB tool in this session is read-only, and Node on this PC can't resolve `mongodb+srv` addresses. Steps: 1) Atlas → Cluster0 → Connect → Drivers, copy the *standard* (mongodb://) connection string: https://cloud.mongodb.com ; 2) change the database name in it to `kamgar_demo`; 3) run `node scripts/demo-seed.js --uri "<that string>"` in `D:\kamgar connect\kamgarconnect\kamgar-connect`.
