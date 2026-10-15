// npm run db:migrate  -> applies server/migrations/*.sql to Postgres (DATABASE_URL required)
const { createStore } = require('../store');
const name = require('../package.json').name.includes('salla') ? 'salla' : 'opensooq';
const collections = name === 'salla' ? ['stores', 'products', 'carts', 'orders', 'users'] : ['categories', 'cities', 'ads', 'users'];
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1); }
const store = createStore({ collections, pgSchema: name });
store.migrate().then(async (applied) => {
  console.log(`schema "${store.schema}": applied ${applied.length ? applied.join(', ') : 'nothing (up to date)'}`);
  await store.end();
}).catch((e) => { console.error(e.message); process.exit(1); });
