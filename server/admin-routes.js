// Admin API (Salla). Every route: requireAuth + requireAdmin -> 401 without login, 403 for normal users.
const requireAdmin = require('./require-admin');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role || 'user', disabled: !!u.disabled, createdAt: u.createdAt || null });
const ORDER_STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

module.exports = function mountAdmin(app, { db, requireAuth }) {
  const d = db.data;
  const guard = [requireAuth, requireAdmin];

  app.get('/api/admin/stats', guard, (req, res) => {
    const paid = d.orders.filter((o) => o.status === 'paid' || o.status === 'shipped');
    res.json({ users: d.users.length, stores: d.stores.length, products: d.products.length, orders: d.orders.length,
      paidRevenue: paid.reduce((s, o) => s + (Number(o.total) || 0), 0) });
  });

  app.get('/api/admin/users', guard, (req, res) => res.json(d.users.map(publicUser)));

  app.patch('/api/admin/users/:id', guard, (req, res) => {
    const u = d.users.find((x) => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (u.role === 'admin') return res.status(400).json({ error: 'لا يمكن تعطيل حساب مدير' });
    if (typeof req.body.disabled !== 'boolean') return res.status(400).json({ error: 'قيمة غير صحيحة' });
    u.disabled = req.body.disabled;
    db.save();
    res.json(publicUser(u));
  });

  app.get('/api/admin/stores', guard, (req, res) => res.json(d.stores.map((s) => ({
    id: s.id, name: s.name, nameEn: s.nameEn, demo: !!s.demo,
    ownerName: (d.users.find((u) => u.id === s.ownerId) || {}).name || null,
    productCount: d.products.filter((p) => p.storeId === s.id).length,
  }))));

  app.delete('/api/admin/stores/:id', guard, (req, res) => {
    const i = d.stores.findIndex((s) => s.id === req.params.id);
    if (i === -1) return res.status(404).json({ error: 'المتجر غير موجود' });
    d.stores.splice(i, 1);
    d.products = d.products.filter((p) => p.storeId !== req.params.id);
    db.save();
    res.status(204).send();
  });

  app.get('/api/admin/products', guard, (req, res) => res.json(d.products.map((p) => ({
    id: p.id, name: p.name, nameEn: p.nameEn, price: p.price, imageUrl: p.imageUrl || null,
    storeName: (d.stores.find((s) => s.id === p.storeId) || {}).name || null,
  }))));

  app.delete('/api/admin/products/:id', guard, (req, res) => {
    const i = d.products.findIndex((p) => p.id === req.params.id);
    if (i === -1) return res.status(404).json({ error: 'المنتج غير موجود' });
    d.products.splice(i, 1);
    db.save();
    res.status(204).send();
  });

  app.get('/api/admin/orders', guard, (req, res) => res.json(d.orders.slice().reverse().map((o) => ({
    id: o.id, customerName: o.customerName, total: o.total, status: o.status, createdAt: o.createdAt, itemCount: (o.items || []).length,
  }))));

  app.patch('/api/admin/orders/:id', guard, (req, res) => {
    const o = d.orders.find((x) => x.id === req.params.id);
    if (!o) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (!ORDER_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'حالة غير صحيحة' });
    o.status = req.body.status;
    db.save();
    res.json({ id: o.id, status: o.status });
  });
};
