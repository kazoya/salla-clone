// npm run db:seed  -> migrates, then inserts the demo catalogue + admin (ADMIN_EMAIL / ADMIN_PASSWORD) if missing.
// Works for SQLite too when DATABASE_URL is not set.
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const entry = require('fs').existsSync(path.join(__dirname, '..', 'db.js')) ? '../db' : '../index';
const mod = require(entry);
const ready = mod.ready || mod.dataReady;
Promise.resolve(ready).then(async () => {
  const data = mod.data || mod.dataSnapshot;
  console.log('seed done:', Object.entries(data || {}).map(([k, v]) => `${k}=${v.length}`).join(' '));
  process.exit(0);
}).catch((e) => { console.error(e.message); process.exit(1); });
