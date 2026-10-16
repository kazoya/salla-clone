import React, { useState, useEffect, useMemo } from 'react';
import { t, tf } from '../i18n';
import { fetchProductsByStoreId, createProduct, deleteProduct, uploadProductImage } from '../api';
import { merchant } from '../commerceApi';
import { money } from './Cart';

// One product card: option pickers (variants) + add to cart
const ProductCard = ({ product, isOwner, onAdd, onDelete, onImage, onDetails }) => {
  const opts = product.options || [];
  const [chosen, setChosen] = useState(() => Object.fromEntries(opts.map((o) => [o.name, o.values[0]])));
  const [editing, setEditing] = useState(false);
  const [cat, setCat] = useState(product.category || '');
  const [optText, setOptText] = useState(opts.map((o) => `${o.name}: ${o.values.join(', ')}`).join('\n'));
  const [added, setAdded] = useState(false);
  const add = async () => { await onAdd(product.id, opts.length ? chosen : undefined); setAdded(true); setTimeout(() => setAdded(false), 1500); };
  const saveDetails = () => {
    const options = optText.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [n, v = ''] = l.split(':'); return { name: n.trim(), values: v.split(',').map((x) => x.trim()).filter(Boolean) }; });
    onDetails(product.id, { category: cat, options }).then(() => setEditing(false));
  };
  return (
    <li data-testid="product-item" className="product-card">
      {product.imageUrl ? <img src={product.imageUrl} alt={tf(product, 'name')} data-testid="product-image" loading="lazy" width="400" height="300" /> : <div className="product-ph" aria-hidden="true" />}
      <div className="product-body">
        {product.category && <span className="chip-sm">{tf(product, 'category')}</span>}
        <span className="product-name">{tf(product, 'name')}</span>
        <span className="price">{money(product.price)}</span>
      </div>
      {opts.map((o) => (
        <label key={o.name} className="opt">
          <span className="small muted">{t(o.name)}</span>
          <select value={chosen[o.name]} onChange={(e) => setChosen({ ...chosen, [o.name]: e.target.value })} data-testid={`option-${o.nameEn || o.name}`}>
            {o.values.map((v) => <option key={v} value={v}>{t(v)}</option>)}
          </select>
        </label>
      ))}
      <button className="btn-cart" onClick={add} data-testid="add-to-cart" aria-live="polite">{added ? t('أضيف ✓') : t('أضف للسلة')}</button>
      {isOwner && (
        <div className="owner-tools">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onImage(product.id, e)} data-testid="product-image-input" aria-label={t('صورة المنتج')} />
          <button type="button" className="btn-ghost" onClick={() => setEditing(!editing)} data-testid="edit-details">{t('التصنيف والخيارات')}</button>
          {editing && (
            <div className="details-editor">
              <label>{t('التصنيف')}<input value={cat} onChange={(e) => setCat(e.target.value)} data-testid="details-category" /></label>
              <label>{t('الخيارات (سطر لكل خيار: الاسم: قيمة، قيمة)')}<textarea rows="3" value={optText} onChange={(e) => setOptText(e.target.value)} data-testid="details-options" placeholder="المقاس: S, M, L" /></label>
              <button type="button" onClick={saveDetails} data-testid="save-details">{t('حفظ')}</button>
            </div>
          )}
          <button onClick={() => onDelete(product.id)} data-testid="delete-product">{t('حذف')}</button>
        </div>
      )}
    </li>
  );
};

const StorePage = ({ store, onAddToCart, user }) => {
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const isOwner = !!(user && store && user.id === store.ownerId);
  const reload = () => fetchProductsByStoreId(store.id).then(setProducts).catch((e) => setError(e.message));
  useEffect(() => { if (store) reload(); }, [store]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(() => {
    const m = new Map(); for (const p of products) if (p.category && !m.has(p.category)) m.set(p.category, p); return [...m.values()];
  }, [products]);
  const visible = category ? products.filter((p) => p.category === category) : products;

  const handleCreateProduct = async () => {
    if (!newProductName.trim() || !newProductPrice) return;
    try { await createProduct(store.id, newProductName, parseFloat(newProductPrice), localStorage.getItem('token')); setNewProductName(''); setNewProductPrice(''); setError(''); reload(); } catch (err) { setError(err.message); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm(t('هل أنت متأكد من الحذف؟'))) return;
    try { await deleteProduct(id, localStorage.getItem('token')); reload(); } catch (err) { setError(err.message); }
  };
  const handleImage = async (productId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError(t('حجم الملف يجب أن يكون أقل من 2MB')); return; }
    try { await uploadProductImage(productId, file, localStorage.getItem('token')); reload(); } catch (err) { setError(err.message); }
  };
  const handleDetails = (id, body) => merchant.productDetails(id, body).then(reload).catch((e) => setError(e.message));
  if (!store) return null;

  return (
    <div className="storefront" style={store.accent ? { '--store': store.accent } : undefined} data-testid="storefront">
      <header className="store-hero">
        <span className="store-mark lg" aria-hidden="true">{tf(store, 'name').trim().charAt(0)}</span>
        <div>
          <h1>{tf(store, 'name')}</h1>
          {store.description && <p data-testid="store-description">{tf(store, 'description')}</p>}
        </div>
      </header>
      {error && <div role="alert" data-testid="error-message">{t(error)}</div>}
      {isOwner && (
        <div className="inline-form">
          <input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder={t('اسم المنتج الجديد')} data-testid="new-product-name" aria-label={t('اسم المنتج الجديد')} />
          <input type="number" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} placeholder={t('سعر المنتج الجديد')} data-testid="new-product-price" aria-label={t('سعر المنتج الجديد')} />
          <button onClick={handleCreateProduct} data-testid="create-product">{t('إنشاء منتج')}</button>
        </div>
      )}
      {categories.length > 0 && (
        <nav className="chips" aria-label={t('التصنيفات')}>
          <button type="button" className={`chip ${category === '' ? 'is-on' : ''}`} aria-pressed={category === ''} onClick={() => setCategory('')} data-testid="cat-all">{t('الكل')}</button>
          {categories.map((p) => (
            <button key={p.category} type="button" className={`chip ${category === p.category ? 'is-on' : ''}`} aria-pressed={category === p.category} onClick={() => setCategory(p.category)} data-testid="cat-chip">{tf(p, 'category')}</button>
          ))}
        </nav>
      )}
      <ul className="product-grid">
        {visible.map((product) => (
          <ProductCard key={product.id + (product.options ? JSON.stringify(product.options) : '')} product={product} isOwner={isOwner}
            onAdd={onAddToCart} onDelete={handleDelete} onImage={handleImage} onDetails={handleDetails} />
        ))}
      </ul>
    </div>
  );
};

export default StorePage;
