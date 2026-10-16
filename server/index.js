const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const fs = require('fs');
const path = require('path');
const BASE_DIR = process.env.VERCEL ? '/tmp' : __dirname; // Vercel: only /tmp is writable (demo data resets)
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(require('./data-middleware')({ ready: db.ready, refresh: db.refresh, flush: () => db.store.flush() }));

// Ensure uploads directory exists
const uploadsDir = path.join(BASE_DIR, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// JWT secret
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  const secretPath = path.join(BASE_DIR, 'data', 'secret.txt');
  if (fs.existsSync(secretPath)) {
    jwtSecret = fs.readFileSync(secretPath, 'utf8').trim();
  } else {
    jwtSecret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, jwtSecret);
  }
}

// Middleware to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user.id, name: user.name, email: user.email }, jwtSecret, { expiresIn: '7d' });
};

// Middleware to authenticate JWT
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    const user = db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    if (user.disabled) {
      return res.status(403).json({ error: 'تم تعطيل هذا الحساب' });
    }
    req.user = user;
    next();
  });
};

// Helper function to filter order items by owner
function ownerView(order, userId) {
  const items = order.items.filter(it => {
    const storeId = it.storeId || (db.getProductById(it.productId) || {}).storeId;
    const store = storeId && db.getStoreById(storeId);
    return store && store.ownerId === userId;
  });
  if (items.length === 0) return null;
  return { id: order.id, trackingCode: order.trackingCode, shippingMethod: order.shippingMethod, createdAt: order.createdAt, status: order.status, customerName: order.customerName,
    phone: order.phone, address: order.address, items, ownerTotal: items.reduce((s, it) => s + it.lineTotal, 0) };
}

// Multer storage configuration
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }).single('image');

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/stores', (req, res) => {
  res.json(db.getStores());
});

app.post('/api/stores', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'اسم المتجر مطلوب' });
  }
  const newStore = db.createStore(name, req.user.id);
  res.status(201).json(newStore);
});

app.get('/api/products', (req, res) => {
  const { storeId } = req.query;
  if (!storeId) {
    return res.status(400).json({ error: 'معرف المتجر مطلوب' });
  }
  const products = db.getProductsByStoreId(storeId);
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = db.getProductById(id);
  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }
  res.json(product);
});

app.post('/api/products', requireAuth, (req, res) => {
  const { storeId, name, price } = req.body;
  if (!name || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'اسم المنتج مطلوب وسعر المنتج يجب أن يكون رقمًا موجبًا' });
  }
  const store = db.getStoreById(storeId);
  if (!store || store.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  const newProduct = db.createProduct(storeId, name, price);
  if (!newProduct) {
    return res.status(404).json({ error: 'المتجر غير موجود' });
  }
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, price } = req.body;
  if (!name || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'اسم المنتج مطلوب وسعر المنتج يجب أن يكون رقمًا موجبًا' });
  }
  const product = db.getProductById(id);
  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }
  const store = db.getStoreById(product.storeId);
  if (!store || store.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  const updatedProduct = db.updateProduct(id, name, price);
  if (!updatedProduct) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }
  res.json(updatedProduct);
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const product = db.getProductById(id);
  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }
  const store = db.getStoreById(product.storeId);
  if (!store || store.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'غير مصرح' });
  }

  if (product.imageUrl) {
    const imagePath = path.join(uploadsDir, path.basename(product.imageUrl));
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.error('Error deleting image file:', err);
    }
  }

  const removedProduct = db.deleteProduct(id);
  if (!removedProduct) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }
  res.status(204).send();
});

// Product image upload route
app.post('/api/products/:id/image', requireAuth, upload, async (req, res) => {
  const { id } = req.params;
  const product = db.getProductById(id);
  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }
  const store = db.getStoreById(product.storeId);
  if (!store || store.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'غير مصرح' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'لا يوجد ملف صورة' });
  }

  const detectFileType = (buffer) => {
    const magicNumber = buffer.slice(0, 8).toString('hex');
    if (magicNumber.startsWith('89504e470d0a1a0a')) { // PNG
      return 'png';
    } else if (magicNumber.startsWith('ffd8ff')) { // JPEG
      return 'jpg';
    } else if (magicNumber.startsWith('825649574150')) { // WEBP
      return 'webp';
    }
    return null;
  };

  const ext = detectFileType(req.file.buffer);
  if (!ext) {
    return res.status(400).json({ error: 'نوع الملف غير مدعوم' });
  }

  if (product.imageUrl) {
    const oldImagePath = path.join(uploadsDir, path.basename(product.imageUrl));
    try {
      fs.unlinkSync(oldImagePath);
    } catch (err) {
      console.error('Error deleting old image file:', err);
    }
  }

  const newImagePath = path.join(uploadsDir, `${crypto.randomUUID()}.${ext}`);
  fs.writeFileSync(newImagePath, req.file.buffer);

  product.imageUrl = `/uploads/${path.basename(newImagePath)}`;
  db.updateProduct(id, product.name, product.price, product.imageUrl);

  res.status(200).json({ imageUrl: product.imageUrl });
});

// Cart and Orders routes
// Owner dashboard API endpoints
app.get('/api/my/stores', requireAuth, (req, res) => {
  const stores = db.getStores().filter(store => store.ownerId === req.user.id);
  const storesWithProductCount = stores.map(store => ({
    ...store,
    productCount: db.getProductsByStoreId(store.id).length
  }));
  res.json(storesWithProductCount);
});

app.get('/api/my/orders', requireAuth, (req, res) => {
  const orders = db.getOrders().map(o => ownerView(o, req.user.id)).filter(Boolean);
  res.json(orders);
});

app.get('/api/my/stats', requireAuth, (req, res) => {
  const orders = db.getOrders().map(o => ownerView(o, req.user.id)).filter(Boolean);
  const storeCount = db.getStores().filter(store => store.ownerId === req.user.id).length;
  const productCount = orders.reduce((total, order) => total + order.items.length, 0);
  const orderCount = orders.length;
  const paidRevenue = orders.reduce((total, order) => {
    if (order.status === 'paid' || order.status === 'shipped') {
      return total + order.ownerTotal;
    }
    return total;
  }, 0);
  res.json({ storeCount, productCount, orderCount, paidRevenue });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'تنسيق البريد الإلكتروني غير صحيح' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف' });
  }
  const existingUser = db.getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ error: 'البريد الإلكتروني مُستخدم بالفعل' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = db.createUser(name, email, passwordHash);
  const token = generateToken(newUser);
  res.status(201).json({ user: { id: newUser.id, name: newUser.name, email: newUser.email, role: 'user' }, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }
  const user = db.getUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
  }
  if (user.disabled) {
    return res.status(403).json({ error: 'تم تعطيل هذا الحساب' });
  }
  const token = generateToken(user);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' }, token });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role || 'user' });
});

// Admin dashboard API
require('./commerce').mount(app, { db, data: db.data, save: db.save, requireAuth });
require('./admin-routes')(app, { db, requireAuth });

// Final error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'حجم الملف كبير جداً' });
    }
  }
  if (err.message === 'Unsupported file type') {
    return res.status(400).json({ error: 'نوع الملف غير مدعوم' });
  }
  res.status(500).json({ error: 'خطأ في الخادم' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app;
