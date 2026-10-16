// Run: npm test (node:test). Unit tests for pricing/variants/analytics + an API flow against a throwaway SQLite server.
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { priceCart, normalizeVariant, analytics } = require('../commerce');

const items = [{ storeId: 'A', price: 100, qty: 2, productId: 'p1', lineTotal: 200 }, { storeId: 'B', price: 50, qty: 1, productId: 'p2', lineTotal: 50 }];
const coupons = [{ id: 'c1', storeId: 'A', code: 'TEN', type: 'percent', value: 10, active: true }, { id: 'c2', storeId: 'B', code: 'OFF80', type: 'fixed', value: 80, active: true },
  { id: 'c3', storeId: 'A', code: 'OLD', type: 'percent', value: 50, active: false }, { id: 'c4', storeId: 'A', code: 'BIG', type: 'fixed', value: 20, minSubtotal: 500, active: true }];

test('pricing: standard shipping, no coupon', () => {
  assert.deepStrictEqual(priceCart(items, { coupons, shippingMethod: 'standard' }), { subtotal: 250, discount: 0, shippingFee: 25, total: 275, coupon: null });
});
test('pricing: percent coupon applies only to its store', () => {
  const q = priceCart(items, { coupons, couponCode: 'ten', shippingMethod: 'express' });
  assert.strictEqual(q.discount, 20); assert.strictEqual(q.shippingFee, 45); assert.strictEqual(q.total, 275);
});
test('pricing: fixed coupon never exceeds the store subtotal', () => {
  assert.strictEqual(priceCart(items, { coupons, couponCode: 'OFF80' }).discount, 50);
});
test('pricing: inactive / unknown / below-minimum coupons are rejected', () => {
  assert.ok(priceCart(items, { coupons, couponCode: 'OLD' }).error);
  assert.ok(priceCart(items, { coupons, couponCode: 'NOPE' }).error);
  assert.ok(priceCart(items, { coupons, couponCode: 'BIG' }).error);
});
test('pricing: free standard shipping over 300, pickup is free, bad method rejected', () => {
  const big = [{ storeId: 'A', price: 400, qty: 1 }];
  assert.strictEqual(priceCart(big, { coupons, shippingMethod: 'standard' }).shippingFee, 0);
  assert.strictEqual(priceCart(big, { coupons, shippingMethod: 'express' }).shippingFee, 45);
  assert.strictEqual(priceCart(items, { coupons, shippingMethod: 'pickup' }).shippingFee, 0);
  assert.ok(priceCart(items, { coupons, shippingMethod: 'drone' }).error);
});
test('variants: every option must be chosen from its values', () => {
  const p = { options: [{ name: 'Size', values: ['S', 'M'] }, { name: 'Color', values: ['Red'] }] };
  assert.deepStrictEqual(normalizeVariant(p, { Size: 'M', Color: 'Red' }), { ok: true, variant: 'Size:M|Color:Red' });
  assert.strictEqual(normalizeVariant(p, { Size: 'XL', Color: 'Red' }).ok, false);
  assert.strictEqual(normalizeVariant(p, { Size: 'M' }).ok, false);
  assert.deepStrictEqual(normalizeVariant({}, null), { ok: true, variant: '' });
});
test('analytics: only paid-like orders of my stores count', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  const orders = [
    { status: 'paid', createdAt: '2026-10-16T10:00:00Z', items: [{ storeId: 'A', productId: 'p1', productName: 'x', qty: 2, lineTotal: 200 }, { storeId: 'B', productId: 'p2', qty: 1, lineTotal: 50 }] },
    { status: 'pending_payment', createdAt: '2026-10-16T10:00:00Z', items: [{ storeId: 'A', productId: 'p1', qty: 1, lineTotal: 100 }] },
    { status: 'delivered', createdAt: '2026-10-10T10:00:00Z', items: [{ storeId: 'A', productId: 'p1', productName: 'x', qty: 1, lineTotal: 100 }] },
  ];
  const a = analytics(orders, [{ storeId: 'A' }, { storeId: 'B' }], new Set(['A']), now);
  assert.strictEqual(a.revenue, 300); assert.strictEqual(a.paidOrders, 2); assert.strictEqual(a.avgOrderValue, 150);
  assert.deepStrictEqual(a.byStatus, { paid: 1, pending_payment: 1, delivered: 1 });
  assert.strictEqual(a.revenueByDay.length, 14); assert.strictEqual(a.revenueByDay[13].revenue, 200);
  assert.strictEqual(a.topProducts[0].qty, 3); assert.strictEqual(a.productCount, 1);
});

test('API flow: variant cart -> coupon quote -> order -> pay -> merchant status -> public tracking', async (t) => {
  const port = 5300 + Math.floor(Math.random() * 400);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'salla-test-'));
  const env = { ...process.env, PORT: String(port), BASE_DIR: dir, ADMIN_EMAIL: 'admin@test.local', ADMIN_PASSWORD: 'test-admin-pass-1' };
  delete env.DATABASE_URL;
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], { env, stdio: 'ignore' });
  t.after(() => srv.kill());
  const B = `http://127.0.0.1:${port}/api`;
  const j = async (m, u, b, tok) => { const r = await fetch(B + u, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: b && JSON.stringify(b) }); let d = null; try { d = await r.json(); } catch {} return [r.status, d]; };
  for (let i = 0; i < 50; i++) { try { if ((await fetch(B + '/health')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }

  // merchant with own store + product with options
  const [, m] = await j('POST', '/auth/register', { name: 'تاجر', email: `m${port}@t.com`, password: 'password123' });
  const [, st] = await j('POST', '/stores', { name: 'متجر اختبار' }, m.token);
  const [, prod] = await j('POST', '/products', { storeId: st.id, name: 'قميص', price: 120 }, m.token);
  assert.strictEqual((await j('PATCH', `/products/${prod.id}/details`, { category: 'ملابس', options: [{ name: 'المقاس', values: ['S', 'M'] }] }, m.token))[0], 200);
  const [, other] = await j('POST', '/auth/register', { name: 'غريب', email: `o${port}@t.com`, password: 'password123' });
  assert.strictEqual((await j('PATCH', `/products/${prod.id}/details`, { category: 'x' }, other.token))[0], 403, 'non-owner cannot edit product');
  assert.strictEqual((await j('PATCH', `/my/stores/${st.id}`, { accent: '#123456' }, other.token))[0], 403, 'non-owner cannot theme store');
  assert.strictEqual((await j('PATCH', `/my/stores/${st.id}`, { accent: 'red;}' }, m.token))[0], 400, 'invalid color rejected');
  assert.strictEqual((await j('PATCH', `/my/stores/${st.id}`, { accent: '#123456', description: 'وصف' }, m.token))[1].accent, '#123456');
  assert.strictEqual((await j('POST', '/my/coupons', { storeId: st.id, code: 'save15', type: 'percent', value: 15 }, m.token))[0], 201);
  assert.strictEqual((await j('POST', '/my/coupons', { storeId: st.id, code: 'SAVE15', type: 'percent', value: 15 }, m.token))[0], 409, 'duplicate code');
  assert.strictEqual((await j('POST', '/my/coupons', { storeId: st.id, code: 'X1X', type: 'percent', value: 95 }, m.token))[0], 400, 'percent > 90 rejected');
  assert.strictEqual((await j('POST', '/my/coupons', { storeId: st.id, code: 'HACK', type: 'fixed', value: 5 }, other.token))[0], 403, 'coupon for a store you do not own');

  const sid = 'sess-' + port;
  assert.strictEqual((await j('POST', '/cart', { sessionId: sid, productId: prod.id, qty: 1 }))[0], 400, 'options required');
  await j('POST', '/cart', { sessionId: sid, productId: prod.id, qty: 2, options: { 'المقاس': 'M' } });
  const [, cart] = await j('POST', '/cart', { sessionId: sid, productId: prod.id, qty: 1, options: { 'المقاس': 'S' } });
  assert.strictEqual(cart.items.length, 2, 'two variant lines'); assert.strictEqual(cart.cartTotal, 360);
  assert.strictEqual((await j('POST', '/checkout/quote', { sessionId: sid, couponCode: 'BAD' }))[0], 400);
  const [, q] = await j('POST', '/checkout/quote', { sessionId: sid, couponCode: 'save15', shippingMethod: 'standard' });
  assert.deepStrictEqual([q.subtotal, q.discount, q.shippingFee, q.total], [360, 54, 0, 306], 'free shipping after discount >= 300');
  assert.strictEqual((await j('POST', '/orders', { sessionId: sid, customerName: 'عميل', phone: '123', address: 'الرياض' }))[0], 400, 'bad phone');
  const [s1, ord] = await j('POST', '/orders', { sessionId: sid, customerName: 'عميل', phone: '0551234567', address: 'الرياض', couponCode: 'SAVE15', shippingMethod: 'express' });
  assert.strictEqual(s1, 201); assert.match(ord.trackingCode, /^SL\d{6}$/); assert.strictEqual(ord.total, 351);
  assert.strictEqual((await j('PATCH', `/my/orders/${ord.orderId}/status`, { status: 'shipped' }, m.token))[0], 409, 'unpaid cannot ship');
  assert.strictEqual((await j('POST', `/orders/${ord.orderId}/pay`, { cardNumber: '4111111111110000' }))[0], 402);
  assert.strictEqual((await j('POST', `/orders/${ord.orderId}/pay`, { cardNumber: '4111111111111111' }))[0], 200);
  assert.strictEqual((await j('PATCH', `/my/orders/${ord.orderId}/status`, { status: 'shipped' }, other.token))[0], 403, 'other merchant');
  assert.strictEqual((await j('PATCH', `/my/orders/${ord.orderId}/status`, { status: 'delivered' }, m.token))[0], 409, 'cannot skip to delivered');
  assert.strictEqual((await j('PATCH', `/my/orders/${ord.orderId}/status`, { status: 'shipped' }, m.token))[0], 200);
  assert.strictEqual((await j('GET', `/track?code=${ord.trackingCode}&phone=0500000000`))[0], 404, 'wrong phone hides the order');
  const [ts, tr] = await j('GET', `/track?code=${ord.trackingCode.toLowerCase()}&phone=0551234567`);
  assert.strictEqual(ts, 200); assert.strictEqual(tr.status, 'shipped');
  assert.deepStrictEqual(tr.history.map((h) => h.status), ['pending_payment', 'paid', 'shipped']);
  assert.ok(!('phone' in tr) && !('address' in tr), 'tracking does not leak address/phone');
  const [, an] = await j('GET', '/my/analytics', null, m.token);
  assert.strictEqual(an.revenue, 360); assert.strictEqual(an.paidOrders, 1); assert.strictEqual(an.topProducts[0].qty, 3);
  const [, cp] = await j('GET', '/my/coupons', null, m.token);
  assert.strictEqual(cp[0].uses, 1);
  const [, demoStores] = await j('GET', '/stores');
  assert.ok(demoStores.filter((s) => s.demo).every((s) => s.accent), 'demo stores themed');
});
