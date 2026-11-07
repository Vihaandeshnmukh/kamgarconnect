# Blocked / needs you
Each item: what is blocked and the exact steps for you.

## Service worker (offline app) - not possible from a single WordPress page
A real installable/offline app needs a file `sw.js` served from https://kamgar.de/sw.js. WordPress block templates can't serve files.
Steps if you want it later: 1) WordPress admin → Plugins → Add New → install a free plugin such as "PWA" (https://wordpress.org/plugins/pwa/) or upload sw.js to the site root with your host's File Manager (Hostinger: https://hpanel.hostinger.com/ → Websites → File Manager → public_html). 2) Tell Claude, and the page will register it.
