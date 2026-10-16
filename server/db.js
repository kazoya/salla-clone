const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { createStore: createDataStore } = require('./store');
const { ensureAdmin } = require('./admin-seed');
const seedData = require('./seed-data');

const COLLECTIONS = ['stores', 'products', 'carts', 'orders', 'users', 'coupons'];
const store = createDataStore({ collections: COLLECTIONS, sqliteFile: 'salla.sqlite', pgSchema: 'salla' });

// In-memory copy of the data; the object identity never changes (refresh fills it in place)
const db = { stores: [], products: [], carts: [], orders: [], users: [], coupons: [] };

function writeDb(data) {
  return store.save(data);
}

function fill(data) {
  for (const k of COLLECTIONS) db[k] = Array.isArray(data[k]) ? data[k] : [];
}

// Demo seed: runs when the demo catalogue is missing (cold start on Vercel, fresh DB, or new Postgres)
function seedDemo() {
  if (db.stores.some((s) => s.demo)) return false;
  for (const s of seedData.stores) {
    const storeId = crypto.randomUUID();
    db.stores.push({ id: storeId, name: s.name, nameEn: s.nameEn, ownerId: null, demo: true });
    for (const [slug, name, nameEn, price] of s.products) {
      db.products.push({ id: crypto.randomUUID(), storeId, name, nameEn, price, imageUrl: `/demo/${slug}.svg`, demo: true });
    }
  }
  return true;
}

// Connect, migrate, seed. A failure (e.g. a dropped connection on a cold start) is retried on the next request
// instead of leaving this instance broken.
let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = store.init().then((data) => {
      fill(data);
      const seeded = seedDemo();
      const upgraded = require('./commerce').upgradeDemo(db);
      const admin = ensureAdmin(db.users);
      if (seeded || upgraded || admin) writeDb(db);
      return store.flush();
    }).catch((e) => { readyPromise = null; throw e; });
  }
  return readyPromise;
}
ready().catch((e) => console.error('data init failed (will retry):', e && (e.message || e.type || e)));

async function refresh() {
  if (store.kind !== 'postgres') return;
  const fresh = {};
  await store.refresh(fresh);
  fill(fresh);
}

function getStores() {
  return db.stores;
}

function createStore(name, ownerId) {
  const newStore = { id: crypto.randomUUID(), name, ownerId };
  db.stores.push(newStore);
  writeDb(db);
  return newStore;
}

function getStoreById(id) {
  return db.stores.find(store => store.id === id);
}

function getProductsByStoreId(storeId) {
  return db.products.filter(product => product.storeId === storeId);
}

function getProductById(id) {
  return db.products.find(product => product.id === id);
}

function createProduct(storeId, name, price) {
  const store = db.stores.find(s => s.id === storeId);
  if (!store) {
    return null;
  }
  const newProduct = { id: crypto.randomUUID(), storeId, name, price };
  db.products.push(newProduct);
  writeDb(db);
  return newProduct;
}

function updateProduct(id, name, price, imageUrl) {
  const productIndex = db.products.findIndex(product => product.id === id);
  if (productIndex === -1) {
    return null;
  }
  db.products[productIndex] = { ...db.products[productIndex], name, price, imageUrl };
  writeDb(db);
  return db.products[productIndex];
}

function deleteProduct(id) {
  const productIndex = db.products.findIndex(product => product.id === id);
  if (productIndex === -1) {
    return null;
  }
  const removedProduct = db.products.splice(productIndex, 1)[0];
  writeDb(db);
  return removedProduct;
}

function addOrUpdateCartItem(sessionId, productId, qty) {
  let cart = db.carts.find(c => c.sessionId === sessionId);
  if (!cart) {
    cart = { sessionId, items: [] };
    db.carts.push(cart);
  }

  const existingItem = cart.items.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.qty += qty;
  } else {
    cart.items.push({ productId, qty });
  }

  writeDb(db);
  return cart;
}

function getCartItems(sessionId) {
  const cart = db.carts.find(c => c.sessionId === sessionId);
  if (!cart) {
    return null;
  }

  const itemsWithDetails = cart.items.map(item => {
    const product = getProductById(item.productId);
    if (!product) {
      return null; // Skip deleted products
    }
    return {
      productId: item.productId,
      productName: product.name,
      price: product.price,
      qty: item.qty,
      lineTotal: product.price * item.qty
    };
  }).filter(item => item !== null);

  const cartTotal = itemsWithDetails.reduce((total, item) => total + item.lineTotal, 0);

  return {
    items: itemsWithDetails,
    cartTotal
  };
}

function deleteCartItem(sessionId, productId) {
  const cart = db.carts.find(c => c.sessionId === sessionId);
  if (!cart) {
    return false;
  }

  const itemIndex = cart.items.findIndex(item => item.productId === productId);
  if (itemIndex === -1) {
    return false;
  }

  cart.items.splice(itemIndex, 1);
  writeDb(db);
  return true;
}

function createOrder(sessionId, customerName, phone, address) {
  const cartItems = getCartItems(sessionId);
  if (!cartItems) {
    return null;
  }

  const orderId = crypto.randomUUID();
  const orderTotal = cartItems.items.reduce((total, item) => total + item.lineTotal, 0);
  const order = {
    id: orderId,
    sessionId,
    customerName,
    phone,
    address,
    items: cartItems.items.map(item => ({ ...item, storeId: getProductById(item.productId).storeId })),
    status: 'pending_payment',
    total: orderTotal,
    createdAt: new Date().toISOString()
  };

  db.orders.push(order);
  db.carts = db.carts.filter(c => c.sessionId !== sessionId);
  writeDb(db);
  return orderId;
}

function payOrder(id, cardNumber) {
  const order = db.orders.find(o => o.id === id);
  if (!order) {
    return 'not_found';
  }

  if (order.status === 'paid') {
    return 'already_paid';
  }

  if (cardNumber.endsWith('0000')) {
    return 'declined';
  }

  order.status = 'paid';
  writeDb(db);
  return 'paid';
}

function getOrderById(id) {
  return db.orders.find(o => o.id === id);
}

function updateOrder(id, order) {
  const orderIndex = db.orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return null;
  }
  db.orders[orderIndex] = order;
  writeDb(db);
  return order;
}

function getOrders() {
  return db.orders;
}

function createUser(name, email, passwordHash) {
  const newUser = { id: crypto.randomUUID(), name, email, passwordHash, role: 'user', createdAt: new Date().toISOString() };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
}

function getUserByEmail(email) {
  return db.users.find(user => (user.email || '').toLowerCase() === String(email || '').toLowerCase());
}

function getUserById(id) {
  return db.users.find(user => user.id === id);
}

module.exports = {
  ready,
  refresh,
  store,
  data: db,
  save: () => writeDb(db),
  getStores,
  createStore,
  getStoreById,
  getProductsByStoreId,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addOrUpdateCartItem,
  getCartItems,
  deleteCartItem,
  createOrder,
  payOrder,
  getOrderById,
  updateOrder,
  getOrders,
  createUser,
  getUserByEmail,
  getUserById
};
