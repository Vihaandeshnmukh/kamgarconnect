# Tests and checks

All tests run on this PC against a throwaway in-memory database (nothing touches Atlas). Test scripts live outside the repo in `D:\kamgar connect\qa-tools\`.

## One command for everything
```
cd "D:\kamgar connect\qa-tools"
./gate.sh
```
Runs every server suite, then every browser suite against `kamgar-wordpress.v2.html`, and lists any failure that is not in `baseline-fails.txt` (checks that only fail around midnight India time / on Sundays because they book "today").

## Server suites (node test-*.js <backend dir>)
| Suite | What it covers |
|---|---|
| test-features, test-bugfix, test-me, test-audit, test-security, test-google | everything that existed before 8 Nov (bookings, jobs, ratings, security, Google sign-in) |
| test-demo-seed | demo seed refuses other databases, fake numbers, wipe only demo records |
| test-discovery | wage/rating/experience/distance filters, sorting, area names instead of GPS, map counts, saved workers, recently hired |
| test-lifecycle | wage offers, start work, mark done, no-show, reliability |
| test-inbox | inbox messages for every step, unread count, privacy |
| test-admin | admin summary, masked phones, hide demo data, verified-badge queue |
| test-safety | report, block (search + booking), delete request, admin reports |
| test-backup | backup keeps ids/dates; restore refuses a non-empty database |

## Browser suites (real Chrome, 375 / 768 / 1024 / 1280 px, light + dark)
ui-features, ui-fixcheck, ui-batchA, ui-batchB1, ui-dropdown (older features), ui-devices (sidebar / bottom bar per device), ui-stages (every overnight stage: investor demo, dark/lite/app install, discovery + map, lifecycle, inbox, admin, safety, speed, growth).

## Mobile and accessibility
`ONLY=a11y ./run-suite.sh <page> ui-stages.js` runs axe-core (WCAG 2 A/AA) on the landing page, join form and both app homes at 375 px in light and dark, plus a 40 px tap-target check.

## Live checks
`node kamgar-connect/scripts/uptime-check.js` (also runs every 30 minutes on GitHub: .github/workflows/uptime-check.yml).
