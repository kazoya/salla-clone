// Commerce features: product options (variants), categories, coupons, shipping, order tracking,
// store theming and merchant analytics. Pure helpers are exported for unit tests; routes are mounted by mount().
const crypto = require('crypto');

const SHIPPING = {
  standard: { fee: 25, days: '3-5', name: 'شحن عادي', nameEn: 'Standard shipping' },
  express: { fee: 45, days: '1-2', name: 'شحن سريع', nameEn: 'Express shipping' },
  pickup: { fee: 0, days: '0', name: 'استلام من المتجر', nameEn: 'Store pickup' },
};
const FREE_SHIPPING_OVER = 300;
const STATUSES = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
const NEXT = { paid: ['processing', 'shipped', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'] };
const HEX = /^#[0-9a-f]{6}$/i;
const round2 = (n) => Math.round(n * 100) / 100;

// Demo catalogue upgrade: categories + options for seeded products (idempotent)
const DEMO_META = {
  'oud-royal': ['عطور', 'Perfumes', [{ name: 'الحجم', nameEn: 'Size', values: ['50ml', '100ml'] }]],
  musk: ['عطور', 'Perfumes', [{ name: 'الحجم', nameEn: 'Size', values: ['30ml', '60ml'] }]],
  'rose-oil': ['عطور', 'Perfumes'], bakhoor: ['بخور', 'Incense'], candle: ['هدايا', 'Gifts'], 'gift-box': ['هدايا', 'Gifts'],
  earbuds: ['صوتيات', 'Audio', [{ name: 'اللون', nameEn: 'Color', values: ['أسود', 'أبيض'] }]],
  speaker: ['صوتيات', 'Audio'],
  watch: ['ساعات', 'Watches', [{ name: 'المقاس', nameEn: 'Size', values: ['41mm', '45mm'] }, { name: 'اللون', nameEn: 'Color', values: ['أسود', 'فضي'] }]],
  powerbank: ['ملحقات', 'Accessories'], keyboard: ['ملحقات', 'Accessories'], cable: ['ملحقات', 'Accessories'],
  dallah: ['أدوات القهوة', 'Coffee tools'], cups: ['أدوات القهوة', 'Coffee tools'], tray: ['أدوات القهوة', 'Coffee tools'], thermos: ['أدوات القهوة', 'Coffee tools'],
  beans: ['قهوة وتمر', 'Coffee & dates', [{ name: 'الوزن', nameEn: 'Weight', values: ['250g', '500g', '1kg'] }]],
  dates: ['قهوة وتمر', 'Coffee & dates'],
};
const DEMO_STORE = {
  'دار العود': ['#7a3e1d', 'عطور وبخور شرقية أصيلة', 'Authentic oriental perfumes and incense'],
  'تقنية بلس': ['#1d4ed8', 'إلكترونيات وملحقات يومية', 'Everyday electronics and accessories'],
  'بيت القهوة': ['#0b6e4f', 'كل ما يلزم لفنجان القهوة السعودية', 'Everything for the Saudi coffee ritual'],
};
function upgradeDemo(db) {
  let changed = false;
  for (const p of db.products) {
    if (!p.demo || p.category) continue;
    const slug = (p.imageUrl || '').replace(/^\/demo\/|\.svg$/g, '');
    const m = DEMO_META[slug]; if (!m) continue;
    p.category = m[0]; p.categoryEn = m[1]; if (m[2]) p.options = m[2]; changed = true;
  }
  for (const s of db.stores) {
    const m = DEMO_STORE[s.name];
    if (s.demo && m && !s.accent) { s.accent = m[0]; s.description = m[1]; s.descriptionEn = m[2]; changed = true; }
  }
  for (const s of db.stores.filter((x) => x.demo)) {
    if (!db.coupons.some((c) => c.storeId === s.id)) {
      db.coupons.push({ id: crypto.randomUUID(), storeId: s.id, code: 'WELCOME10', type: 'percent', value: 10, minSubtotal: 0, active: true, uses: 0, demo: true });
      changed = true;
    }
  }
  return changed;
}

// Variant key: "Size:100ml|Color:Black" from a chosen {optionName: value}; validated against the product options
function normalizeVariant(product, chosen) {
  const opts = product.options || [];
  if (!opts.length) return { ok: true, variant: '' };
  const parts = [];
  for (const o of opts) {
    const v = chosen && chosen[o.name];
    if (!o.values.includes(v)) return { ok: false };
    parts.push(`${o.name}:${v}`);
  }
  return { ok: true, variant: parts.join('|') };
}

// Totals for a cart: subtotal, per-store coupon discount, shipping. Returns { error } on an invalid coupon.
function priceCart(items, { coupons, couponCode, shippingMethod }) {
  const subtotal = round2(items.reduce((t, i) => t + i.price * i.qty, 0));
  const ship = SHIPPING[shippingMethod || 'standard'];
  if (!ship) return { error: 'طريقة الشحن غير صالحة' };
  let discount = 0; let coupon = null;
  if (couponCode) {
    const code = String(couponCode).trim().toUpperCase();
    const storeIds = new Set(items.map((i) => i.storeId));
    coupon = coupons.find((c) => c.active && c.code === code && storeIds.has(c.storeId));
    if (!coupon) return { error: 'كود الخصم غير صالح' };
    const storeSub = items.filter((i) => i.storeId === coupon.storeId).reduce((t, i) => t + i.price * i.qty, 0);
    if (storeSub < (coupon.minSubtotal || 0)) return { error: 'لم تصل للحد الأدنى للطلب لهذا الكود' };
    discount = coupon.type === 'percent' ? storeSub * coupon.value / 100 : Math.min(coupon.value, storeSub);
    discount = round2(discount);
  }
  const shippingFee = subtotal - discount >= FREE_SHIPPING_OVER && shippingMethod !== 'express' ? 0 : ship.fee;
  return { subtotal, discount, shippingFee, total: round2(subtotal - discount + shippingFee), coupon: coupon && { id: coupon.id, code: coupon.code } };
}

function trackingCode() { return 'SL' + crypto.randomInt(100000, 999999); }

// Merchant analytics for the stores a user owns
function analytics(orders, products, ownerStoreIds, now = Date.now()) {
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(new Date(now - i * 864e5).toISOString().slice(0, 10));
  const revenueByDay = Object.fromEntries(days.map((d) => [d, 0]));
  const byStatus = {}; const top = {}; let revenue = 0; let paidOrders = 0;
  for (const o of orders) {
    const mine = o.items.filter((i) => ownerStoreIds.has(i.storeId));
    if (!mine.length) continue;
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    if (!['paid', 'processing', 'shipped', 'delivered'].includes(o.status)) continue;
    const amount = mine.reduce((t, i) => t + i.lineTotal, 0);
    revenue += amount; paidOrders++;
    const day = (o.paidAt || o.createdAt).slice(0, 10);
    if (day in revenueByDay) revenueByDay[day] += amount;
    for (const i of mine) {
      top[i.productId] = top[i.productId] || { productId: i.productId, name: i.productName, nameEn: i.productNameEn, qty: 0, revenue: 0 };
      top[i.productId].qty += i.qty; top[i.productId].revenue += i.lineTotal;
    }
  }
  return {
    revenue: round2(revenue), paidOrders, avgOrderValue: paidOrders ? round2(revenue / paidOrders) : 0,
    revenueByDay: days.map((d) => ({ day: d, revenue: round2(revenueByDay[d]) })),
    byStatus, topProducts: Object.values(top).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    productCount: products.filter((p) => ownerStoreIds.has(p.storeId)).length,
  };
}

function mount(app, { db, data, save, requireAuth }) {
  const myStoreIds = (userId) => new Set(data.stores.filter((s) => s.ownerId === userId).map((s) => s.id));
  const cartOf = (sessionId) => data.carts.find((c) => c.sessionId === sessionId);
  const cartView = (sessionId) => {
    const cart = cartOf(sessionId);
    const items = (cart ? cart.items : []).map((it) => {
      const p = data.products.find((x) => x.id === it.productId); if (!p) return null;
      return { productId: p.id, productName: p.name, productNameEn: p.nameEn, imageUrl: p.imageUrl, storeId: p.storeId,
        variant: it.variant || '', price: p.price, qty: it.qty, lineTotal: round2(p.price * it.qty) };
    }).filter(Boolean);
    return { items, cartTotal: round2(items.reduce((t, i) => t + i.lineTotal, 0)) };
  };

  app.get('/api/shipping-methods', (req, res) => res.json({ methods: SHIPPING, freeShippingOver: FREE_SHIPPING_OVER }));

  app.post('/api/cart', (req, res) => {
    const { sessionId, productId, options } = req.body || {};
    const qty = Number(req.body && req.body.qty);
    if (!sessionId || !productId || !Number.isInteger(qty) || qty === 0 || Math.abs(qty) > 99) return res.status(400).json({ error: 'البيانات غير صالحة' });
    const product = data.products.find((p) => p.id === productId);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    const v = normalizeVariant(product, options);
    if (!v.ok) return res.status(400).json({ error: 'اختر خيارات المنتج' });
    let cart = cartOf(sessionId);
    if (!cart) { cart = { sessionId, items: [] }; data.carts.push(cart); }
    const line = cart.items.find((i) => i.productId === productId && (i.variant || '') === v.variant);
    if (line) line.qty += qty; else if (qty > 0) cart.items.push({ productId, qty, variant: v.variant });
    cart.items = cart.items.filter((i) => i.qty > 0);
    save();
    res.json(cartView(sessionId));
  });
  app.get('/api/cart/:sessionId', (req, res) => res.json(cartView(req.params.sessionId)));
  app.delete('/api/cart/:sessionId/:productId', (req, res) => {
    const cart = cartOf(req.params.sessionId);
    if (!cart) return res.status(404).json({ error: 'السلة غير موجودة' });
    const variant = String(req.query.variant || '');
    const before = cart.items.length;
    cart.items = cart.items.filter((i) => !(i.productId === req.params.productId && (i.variant || '') === variant));
    if (cart.items.length === before) return res.status(404).json({ error: 'المنتج غير موجود' });
    save(); res.status(204).send();
  });

  // Price preview (coupon check) before placing the order
  app.post('/api/checkout/quote', (req, res) => {
    const { sessionId, couponCode, shippingMethod } = req.body || {};
    const view = cartView(sessionId);
    if (!view.items.length) return res.status(400).json({ error: 'السلة فارغة' });
    const q = priceCart(view.items, { coupons: data.coupons, couponCode, shippingMethod });
    if (q.error) return res.status(400).json({ error: q.error });
    res.json(q);
  });

  app.post('/api/orders', (req, res) => {
    const { sessionId, customerName, phone, address, couponCode, shippingMethod } = req.body || {};
    if (!sessionId || !customerName || !phone || !address) return res.status(400).json({ error: 'البيانات غير صالحة' });
    if (!/^0?5\d{8}$|^\+?9665\d{8}$/.test(String(phone).replace(/\s/g, ''))) return res.status(400).json({ error: 'رقم الجوال غير صحيح' });
    const view = cartView(sessionId);
    if (!view.items.length) return res.status(400).json({ error: 'السلة فارغة' });
    const q = priceCart(view.items, { coupons: data.coupons, couponCode, shippingMethod });
    if (q.error) return res.status(400).json({ error: q.error });
    const now = new Date().toISOString();
    let code; do { code = trackingCode(); } while (data.orders.some((o) => o.trackingCode === code));
    const order = {
      id: crypto.randomUUID(), trackingCode: code, sessionId, customerName: String(customerName).slice(0, 80), phone: String(phone).replace(/\s/g, ''),
      address: String(address).slice(0, 200), items: view.items, shippingMethod: shippingMethod || 'standard',
      subtotal: q.subtotal, discount: q.discount, shippingFee: q.shippingFee, total: q.total, coupon: q.coupon,
      status: 'pending_payment', createdAt: now, history: [{ status: 'pending_payment', at: now }],
    };
    if (q.coupon) { const c = data.coupons.find((x) => x.id === q.coupon.id); c.uses = (c.uses || 0) + 1; }
    data.orders.push(order);
    data.carts = data.carts.filter((c) => c.sessionId !== sessionId);
    save();
    res.status(201).json({ orderId: order.id, trackingCode: code, subtotal: order.subtotal, discount: order.discount, shippingFee: order.shippingFee, total: order.total });
  });

  app.post('/api/orders/:id/pay', (req, res) => {
    const { cardNumber } = req.body || {};
    if (!cardNumber || !/^\d{12,19}$/.test(String(cardNumber).replace(/\s/g, ''))) return res.status(400).json({ error: 'البيانات غير صالحة' });
    const order = data.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'pending_payment') return res.status(409).json({ error: 'الطلب مدفوع بالفعل' });
    if (String(cardNumber).endsWith('0000')) return res.status(402).json({ error: 'الدفع مرفوض' });
    const now = new Date().toISOString();
    order.status = 'paid'; order.paidAt = now; order.history.push({ status: 'paid', at: now });
    save();
    res.json({ status: 'paid', trackingCode: order.trackingCode });
  });

  // Public tracking: needs the tracking code AND the phone used on the order (no account needed)
  app.get('/api/track', (req, res) => {
    const code = String(req.query.code || '').trim().toUpperCase();
    const phone = String(req.query.phone || '').replace(/\s/g, '');
    const order = data.orders.find((o) => o.trackingCode === code);
    if (!order || !phone || order.phone !== phone) return res.status(404).json({ error: 'لم نجد طلبًا بهذه البيانات' });
    res.json({ trackingCode: order.trackingCode, status: order.status, history: order.history || [], shippingMethod: order.shippingMethod,
      items: order.items.map((i) => ({ productName: i.productName, productNameEn: i.productNameEn, variant: i.variant, qty: i.qty })),
      total: order.total, createdAt: order.createdAt });
  });

  // Merchant: status updates along an allowed path, each recorded in the history
  app.patch('/api/my/orders/:id/status', requireAuth, (req, res) => {
    const { status } = req.body || {};
    const order = data.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    const mine = myStoreIds(req.user.id);
    if (!order.items.some((i) => mine.has(i.storeId))) return res.status(403).json({ error: 'الطلب لا ينتمي إلى متجرك' });
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'الحالة المطلوبة غير صالحة' });
    if (order.status === 'pending_payment') return res.status(409).json({ error: 'الطلب يجب أن يكون مدفوعًا أولاً' });
    if (!(NEXT[order.status] || []).includes(status)) return res.status(409).json({ error: 'لا يمكن الانتقال لهذه الحالة' });
    order.status = status; (order.history = order.history || []).push({ status, at: new Date().toISOString() });
    save();
    res.json({ status: order.status, history: order.history });
  });

  app.get('/api/my/analytics', requireAuth, (req, res) => res.json(analytics(data.orders, data.products, myStoreIds(req.user.id))));

  // Store theme: accent color + description (owner only)
  app.patch('/api/my/stores/:id', requireAuth, (req, res) => {
    const s = data.stores.find((x) => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'المتجر غير موجود' });
    if (s.ownerId !== req.user.id) return res.status(403).json({ error: 'غير مصرح' });
    const { accent, description } = req.body || {};
    if (accent !== undefined) { if (!HEX.test(accent)) return res.status(400).json({ error: 'لون غير صالح' }); s.accent = accent; }
    if (description !== undefined) s.description = String(description).slice(0, 160);
    save(); res.json(s);
  });

  // Products: category + options on create/update (owner only)
  app.patch('/api/products/:id/details', requireAuth, (req, res) => {
    const p = data.products.find((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
    const s = data.stores.find((x) => x.id === p.storeId);
    if (!s || s.ownerId !== req.user.id) return res.status(403).json({ error: 'غير مصرح' });
    const { category, options } = req.body || {};
    if (category !== undefined) p.category = String(category).trim().slice(0, 40) || undefined;
    if (options !== undefined) {
      if (!Array.isArray(options) || options.length > 3 || options.some((o) => !o || typeof o.name !== 'string' || !o.name.trim() || !Array.isArray(o.values) || !o.values.length || o.values.length > 10)) {
        return res.status(400).json({ error: 'خيارات غير صالحة' });
      }
      p.options = options.map((o) => ({ name: o.name.trim().slice(0, 30), values: [...new Set(o.values.map((v) => String(v).trim().slice(0, 30)).filter(Boolean))] }));
    }
    save(); res.json(p);
  });

  // Coupons (owner of the store)
  app.get('/api/my/coupons', requireAuth, (req, res) => {
    const mine = myStoreIds(req.user.id);
    res.json(data.coupons.filter((c) => mine.has(c.storeId)));
  });
  app.post('/api/my/coupons', requireAuth, (req, res) => {
    const { storeId, code, type, value, minSubtotal } = req.body || {};
    if (!myStoreIds(req.user.id).has(storeId)) return res.status(403).json({ error: 'غير مصرح' });
    const c = String(code || '').trim().toUpperCase();
    const v = Number(value);
    if (!/^[A-Z0-9]{3,20}$/.test(c) || !['percent', 'fixed'].includes(type) || !(v > 0) || (type === 'percent' && v > 90)) return res.status(400).json({ error: 'بيانات الكود غير صالحة' });
    if (data.coupons.some((x) => x.storeId === storeId && x.code === c)) return res.status(409).json({ error: 'الكود موجود مسبقاً' });
    const coupon = { id: crypto.randomUUID(), storeId, code: c, type, value: v, minSubtotal: Math.max(0, Number(minSubtotal) || 0), active: true, uses: 0, createdAt: new Date().toISOString() };
    data.coupons.push(coupon); save(); res.status(201).json(coupon);
  });
  app.patch('/api/my/coupons/:id', requireAuth, (req, res) => {
    const c = data.coupons.find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'الكود غير موجود' });
    if (!myStoreIds(req.user.id).has(c.storeId)) return res.status(403).json({ error: 'غير مصرح' });
    if (typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'قيمة غير صحيحة' });
    c.active = req.body.active; save(); res.json(c);
  });
}

module.exports = { mount, priceCart, normalizeVariant, analytics, upgradeDemo, SHIPPING, FREE_SHIPPING_OVER, NEXT };
