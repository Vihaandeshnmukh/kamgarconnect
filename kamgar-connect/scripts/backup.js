// MongoDB backup and restore (free; no Atlas paid backups needed). Read-only for backups.
//
// Backup every collection of a database to JSON files (MongoDB Extended JSON, keeps ids and dates):
//   node scripts/backup.js --uri "mongodb://.../kamgar?..." [--out backups]
//   -> backups/kamgar-2026-11-08T0130/<collection>.json  + manifest.json (counts)
//
// Restore a backup folder INTO AN EMPTY database (refuses if the target already has data):
//   node scripts/backup.js --restore backups/kamgar-2026-11-08T0130 --uri "mongodb://.../kamgar_restore?..."
//
// Never commit backup folders: they contain phone numbers (backups/ is in .gitignore).
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = mongoose.mongo.BSON;

const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const uri = arg('--uri') || process.env.BACKUP_MONGODB_URI;

(async () => {
  if (!uri) { console.error('Give --uri (or BACKUP_MONGODB_URI).'); process.exit(2); }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const restoreDir = arg('--restore');
  if (restoreDir) {
    const existing = (await db.listCollections().toArray()).map(c => c.name);
    for (const c of existing) {
      if (await db.collection(c).estimatedDocumentCount() > 0) { console.error(`REFUSED: database "${db.databaseName}" already has data (${c}). Restore into a new, empty database.`); await mongoose.disconnect(); process.exit(3); }
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(restoreDir, 'manifest.json'), 'utf8'));
    for (const c of Object.keys(manifest.counts)) {
      const docs = EJSON.parse(fs.readFileSync(path.join(restoreDir, c + '.json'), 'utf8'), { relaxed: false });
      if (docs.length) await db.collection(c).insertMany(docs);
      console.log(`restored ${c}: ${docs.length}`);
    }
    await mongoose.disconnect();
    return;
  }
  const stamp = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16).replace(/[:]/g, '');
  const out = path.resolve(arg('--out') || 'backups', `${db.databaseName}-${stamp}`);
  fs.mkdirSync(out, { recursive: true });
  const counts = {};
  for (const { name } of await db.listCollections().toArray()) {
    if (name.startsWith('system.')) continue;
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(out, name + '.json'), EJSON.stringify(docs, null, 0, { relaxed: false }));
    counts[name] = docs.length;
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ database: db.databaseName, takenAt: new Date().toISOString(), counts }, null, 2));
  console.log(`backup written to ${out}`);
  console.log(counts);
  await mongoose.disconnect();
})().catch(async (e) => { console.error(e.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
