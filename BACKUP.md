# Backups (free)

Atlas M0 (free) has no automatic backups you can restore yourself, so take your own.

## Take a backup (read-only; changes nothing)
1. Get the connection string: https://cloud.mongodb.com → your project → Cluster0 → **Connect** → **Drivers**. On this PC choose the *standard* (non-SRV, `mongodb://`) string, because Node here can't look up `mongodb+srv` addresses. Put your password in, and make sure the database name in the string is `kamgar`.
2. Run:
```
cd "D:\kamgar connect\kamgarconnect\kamgar-connect"
node scripts/backup.js --uri "<connection string>" --out "D:\kamgar-backups"
```
3. A folder like `D:\kamgar-backups\kamgar-2026-11-08T0930` appears with one JSON file per collection and `manifest.json` (record counts).

Keep backups off GitHub and off shared drives: they contain phone numbers. Suggested: once a week, and before every big release.

## Restore (only into a NEW, empty database)
```
node scripts/backup.js --restore "D:\kamgar-backups\kamgar-2026-11-08T0930" --uri "<connection string with database name kamgar_restore>"
```
The script refuses to restore into a database that already has data, so it can't overwrite production by mistake. After checking the restored copy, point `MONGODB_URI` on Render at it only if you really mean to switch.

## Tested
`qa-tools/test-backup.js`: backup keeps ids, dates and references; restore refuses a non-empty database.
