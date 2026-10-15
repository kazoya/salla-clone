// Storage layer: Postgres when DATABASE_URL is set (e.g. Neon), otherwise SQLite (local file, or /tmp on Vercel).
// Every collection is a table (id TEXT PRIMARY KEY, data JSON). The app keeps an in-memory copy;
// save() writes only the changed rows; with Postgres every request reloads first so instances stay in sync.
const fs = require('fs');
const path = require('path');

function createStore({ collections, sqliteFile, pgSchema }) {
  const BASE_DIR = process.env.VERCEL ? '/tmp' : __dirname;
  const keyOf = (item) => String(item.id || item.sessionId);

  if (!process.env.DATABASE_URL) {
    const Database = require('better-sqlite3');
    const dataDir = path.join(BASE_DIR, 'data');
    const jsonPath = path.join(dataDir, 'db.json');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const db = new Database(path.join(dataDir, sqliteFile));
    db.pragma('journal_mode = WAL');
    for (const c of collections) db.exec(`CREATE TABLE IF NOT EXISTS ${c} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
    db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)');
    const writeAll = db.transaction((data) => {
      for (const c of collections) {
        db.prepare(`DELETE FROM ${c}`).run();
        const ins = db.prepare(`INSERT OR REPLACE INTO ${c} (id, data) VALUES (?, ?)`);
        for (const item of data[c] || []) ins.run(keyOf(item), JSON.stringify(item));
      }
    });
    const readAll = () => {
      const out = {};
      for (const c of collections) out[c] = db.prepare(`SELECT data FROM ${c} ORDER BY rowid`).all().map((r) => JSON.parse(r.data));
      return out;
    };
    return {
      kind: 'sqlite',
      async init() {
        if (!db.prepare('SELECT 1 FROM meta WHERE key = ?').get('migrated')) {
          if (fs.existsSync(jsonPath)) { // one-time import of the old JSON file
            const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            writeAll(json);
            fs.renameSync(jsonPath, jsonPath + '.migrated-backup');
          }
          db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('migrated', new Date().toISOString());
        }
        return readAll();
      },
      async refresh() {},
      save(data) { writeAll(data); },
      async flush() {},
    };
  }

  // ---------- Postgres ----------
  const url = process.env.DATABASE_URL;
  const local = /sslmode=disable/.test(url) || /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  let pool;
  if (/\.neon\.tech/.test(url) && process.env.PG_DRIVER !== 'pg') {
    // Neon serverless driver: same Pool API as pg, but over WebSockets on port 443 (recommended for Vercel functions)
    const neon = require('@neondatabase/serverless');
    // Neon's guidance for Node runtimes: use the ws package as the WebSocket implementation
    neon.neonConfig.webSocketConstructor = require('ws');
    pool = new neon.Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 8000 });
  } else {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: true }, max: 3 });
  }
  // A dropped idle connection must not crash the process; the pool replaces it on the next query.
  pool.on('error', (e) => console.error('db pool error:', e && (e.message || e.type || e)));
  // Each app lives in its own schema of the same database (works with Neon's pooled endpoint: no startup options needed)
  const schema = String(process.env.DB_SCHEMA || pgSchema || 'public').replace(/[^a-z0-9_]/gi, '');
  const T = (c) => `"${schema}".${c}`;
  const snapshot = {}; // collection -> Map(id -> json string) of what the DB holds
  let tail = Promise.resolve(); // serializes writes; never rejects, so one failed write can't block later requests
  const pending = new Set();       // writes not yet settled: flush() reports their outcome

  async function migrate() {
    const dir = path.join(__dirname, 'migrations');
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await pool.query(`CREATE TABLE IF NOT EXISTS ${T('schema_migrations')} (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const done = new Set((await pool.query(`SELECT name FROM ${T('schema_migrations')}`)).rows.map((r) => r.name));
    const applied = [];
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(file)) continue;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SET LOCAL search_path TO "${schema}"`);
        await client.query(fs.readFileSync(path.join(dir, file), 'utf-8'));
        await client.query(`INSERT INTO ${T('schema_migrations')} (name) VALUES ($1) ON CONFLICT DO NOTHING`, [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (e) { await rollback(client); client.release(true); throw e; }
      client.release();
    }
    return applied;
  }
  async function loadInto(target) {
    for (const c of collections) {
      const rows = (await pool.query(`SELECT id, data FROM ${T(c)} ORDER BY seq`)).rows;
      snapshot[c] = new Map(rows.map((r) => [r.id, JSON.stringify(r.data)]));
      target[c] = rows.map((r) => r.data);
    }
    return target;
  }
  async function rollback(client) { try { await client.query('ROLLBACK'); } catch {} }
  async function write(changes) {
    if (!changes.length) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const ch of changes) {
        if (ch.del.length) await client.query(`DELETE FROM ${T(ch.c)} WHERE id = ANY($1)`, [ch.del]);
        for (const [id, json] of ch.up) {
          await client.query(`INSERT INTO ${T(ch.c)} (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [id, json]);
        }
      }
      await client.query('COMMIT');
    } catch (e) { await rollback(client); client.release(true); throw e; }
    client.release();
  }
  return {
    kind: 'postgres',
    schema,
    migrate,
    async init() { await migrate(); return loadInto({}); },
    async refresh(target) { await tail; await loadInto(target); },
    save(data) {
      const changes = [];
      for (const c of collections) {
        const prev = snapshot[c] || new Map(); const next = new Map();
        for (const item of data[c] || []) next.set(keyOf(item), JSON.stringify(item));
        const up = [...next].filter(([id, j]) => prev.get(id) !== j);
        const del = [...prev.keys()].filter((id) => !next.has(id));
        if (up.length || del.length) changes.push({ c, up, del });
        snapshot[c] = next;
      }
      const p = tail.then(() => write(changes));
      tail = p.catch((e) => console.error('db write failed:', e && (e.message || e.type || e)));
      pending.add(p);
      p.then(() => pending.delete(p), () => pending.delete(p));
      return p;
    },
    flush() { return Promise.all([...pending, tail]); },
    end() { return pool.end(); },
  };
}

module.exports = { createStore };
