# Keeping the free server awake

Render's free web service goes to sleep after about 15 minutes without visitors; the next visitor then waits ~50 seconds (the site now shows a friendly "Waking up the server…" card while it waits).

## Already set up: GitHub Actions
`.github/workflows/keep-alive.yml` pings https://api.kamgar.de/api/health every 5 minutes.
Check it runs: https://github.com/Vihaandeshnmukh/kamgarconnect/actions/workflows/keep-alive.yml
GitHub may delay scheduled runs, and it switches scheduled workflows off after 60 days without commits to the repository. If you see "This scheduled workflow is disabled", press **Enable workflow** on that page.

## Backup pinger (free): cron-job.org
1. Sign up free at https://cron-job.org/en/signup/ (use your own email).
2. Create cronjob → URL `https://api.kamgar.de/api/health` → every 10 minutes → Save.
3. Turn on "Notify me when the job fails" so you hear if the server is down.

## Free-plan limits (checked 8 Nov 2026)
- Render free web services get 750 instance hours a month per workspace. One service awake all month uses about 744 hours, so keeping **one** service awake fits; a **second** always-on free service would run out. No second service was added overnight.
- Atlas M0: 512 MB storage. The demo database (kamgar_demo) is a few hundred KB.
