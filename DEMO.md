# Demo environment

## 1. Investor demo (no setup)
Open the staging page with `?demo=1`, or press **Investor demo** in the footer:
https://kamgar.de/kamgar-staging/?demo=1
A 9-step guided tour of the worker and employer journeys. Everything shown is demo data (yellow "Demo data" badge); nothing is sent to the server.

## 2. Demo database (kamgar_demo)
40 workers (5 per trade), 10 employers, 16 jobs, 24 bookings and reviews in Aurangabad areas. Every record has `isDemo: true`; phone numbers start with 1 so they can't be real.

Seed (wipes old demo records first):
```
cd kamgar-connect
node scripts/demo-seed.js --uri "<connection string ending in /kamgar_demo?...>"
```
Wipe only: add `--wipe`. The script refuses any database whose name is not exactly `kamgar_demo`.
Get the connection string from Atlas (Connect → Drivers) and change the database name to `kamgar_demo`. On this PC use the "standard" (non-SRV) string, because Node here can't look up SRV addresses.

Demo logins: workers 1000000001 to 1000000040, employers 1000010001 to 1000010010.

## 3. Fully interactive local demo
`node qa-tools/app-preview.js kamgarconnect/kamgar-connect kamgar-connect/kamgar-wordpress.v2.html` then open http://localhost:3991 (in-memory database, sample data, nothing touches Atlas).
