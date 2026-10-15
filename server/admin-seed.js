// Creates or repairs the admin account from ADMIN_EMAIL / ADMIN_PASSWORD (env only, never in git). Password is bcrypt-hashed.
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function ensureAdmin(users) {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) return false;
  let user = users.find((u) => (u.email || '').toLowerCase() === email);
  if (!user) {
    users.push({ id: crypto.randomUUID(), name: 'المدير', email, passwordHash: bcrypt.hashSync(password, 10), role: 'admin', createdAt: new Date().toISOString() });
    return true;
  }
  let changed = false;
  if (user.role !== 'admin') { user.role = 'admin'; changed = true; }
  if (user.disabled) { user.disabled = false; changed = true; }
  if (!user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) { user.passwordHash = bcrypt.hashSync(password, 10); changed = true; }
  return changed;
}

module.exports = { ensureAdmin };
