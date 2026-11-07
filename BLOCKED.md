# Blocked / needs you
Each item: what is blocked and the exact steps for you.

## Service worker (offline app) - not possible from a single WordPress page
A real installable/offline app needs a file `sw.js` served from https://kamgar.de/sw.js. WordPress block templates can't serve files.
Steps if you want it later: 1) WordPress admin → Plugins → Add New → install a free plugin such as "PWA" (https://wordpress.org/plugins/pwa/) or upload sw.js to the site root with your host's File Manager (Hostinger: https://hpanel.hostinger.com/ → Websites → File Manager → public_html). 2) Tell Claude, and the page will register it.

## Web push notifications
Same blocker as the service worker: push needs sw.js on https://kamgar.de/ plus VAPID keys (free) stored on Render. Steps: 1) do the service-worker step above; 2) on Render add environment variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (Claude can generate them, free): https://dashboard.render.com/web/srv-dbfkordg1s2s7386lq5g/env ; 3) ask Claude to wire the existing inbox to web push.

## Not done: loading three.js (about 600 KB) only when needed
Tried in stage 8; automated page loads then timed out in tests, so it was reverted (the 3D scene is already skipped in lite mode on slow phones). Worth retrying with a real slow phone: ask Claude "retry lazy three.js".

## Seeding the real kamgar_demo database
The script is ready and tested (qa-tools/test-demo-seed.js, 13/13), but I could not run it against Atlas: the MongoDB tool in this session is read-only, and Node on this PC can't resolve `mongodb+srv` addresses. Steps: 1) Atlas → Cluster0 → Connect → Drivers, copy the *standard* (mongodb://) connection string: https://cloud.mongodb.com ; 2) change the database name in it to `kamgar_demo`; 3) run `node scripts/demo-seed.js --uri "<that string>"` in `D:\kamgar connect\kamgarconnect\kamgar-connect`.
