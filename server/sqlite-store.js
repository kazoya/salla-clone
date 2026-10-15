const fs = require('fs');
const path = require('path');
const BASE_DIR = process.env.VERCEL ? '/tmp' : __dirname; // Vercel: only /tmp is writable (demo data resets)
const Database = require('better-sqlite3');

const COLLECTIONS = ['stores', 'products', 'carts', 'orders', 'users'];
const dataDir = path.join(BASE_DIR, 'data');
const jsonPath = path.join(dataDir, 'db.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'salla.sqlite'));
db.pragma('journal_mode = WAL');
for (const c of COLLECTIONS) db.exec(`CREATE TABLE IF NOT EXISTS ${c} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)');

const keyOf = (item) => String(item.id || item.sessionId);

const writeAll = db.transaction((data) => {
  for (const c of COLLECTIONS) {
    db.prepare(`DELETE FROM ${c}`).run();
    const ins = db.prepare(`INSERT OR REPLACE INTO ${c} (id, data) VALUES (?, ?)`);
    for (const item of data[c] || []) ins.run(keyOf(item), JSON.stringify(item));
  }
});

const markMigrated = () =>
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('migrated', new Date().toISOString());

function load() {
  const migrated = db.prepare('SELECT 1 FROM meta WHERE key = ?').get('migrated');
  if (!migrated) {
    if (fs.existsSync(jsonPath)) {
      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      db.transaction(() => { writeAll(json); markMigrated(); })();
      fs.renameSync(jsonPath, jsonPath + '.migrated-backup');
    } else {
      markMigrated();
    }
  }
  const result = {};
  for (const c of COLLECTIONS) {
    result[c] = db.prepare(`SELECT data FROM ${c} ORDER BY rowid`).all().map((r) => JSON.parse(r.data));
  }
  return result;
}

function save(data) {
  writeAll(data);
}

module.exports = { load, save };