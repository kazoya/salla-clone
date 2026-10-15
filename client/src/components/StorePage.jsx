import React, { useState, useEffect } from 'react';
import { t, tf, getLang } from '../i18n';
import { fetchProductsByStoreId, createProduct, deleteProduct, uploadProductImage } from '../api';

const StorePage = ({ store, onAddToCart, user }) => {
  const [products, setProducts] = useState([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProductsData = async () => {
      try {
        const data = await fetchProductsByStoreId(store.id);
        setProducts(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchProductsData();
  }, [store]);

  const handleCreateProduct = async () => {
    if (newProductName.trim() && newProductPrice && user) {
      try {
        await createProduct(store.id, newProductName, parseFloat(newProductPrice), localStorage.getItem('token'));
        const updatedProducts = await fetchProductsByStoreId(store.id);
        setProducts(updatedProducts);
        setNewProductName('');
        setNewProductPrice('');
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDeleteProduct = async (id) => {
    if (user && user.id === store.ownerId) {
      try {
        await deleteProduct(id, localStorage.getItem('token'));
        setProducts(products.filter(product => product.id !== id));
        setError('');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleImageChange = async (productId, event) => {
    const file = event.target.files[0];
    if (file && file.size <= 2 * 1024 * 1024) {
      try {
        const response = await uploadProductImage(productId, file, localStorage.getItem('token'));
        const updatedProducts = products.map(product => {
          if (product.id === productId) {
            return { ...product, imageUrl: response.imageUrl };
          }
          return product;
        });
        setProducts(updatedProducts);
        setError('');
      } catch (err) {
        setError(err.message);
      }
    } else {
      setError(t('حجم الملف يجب أن يكون أقل من 2MB'));
    }
  };

  return (
    <div>
      <h1>{store ? tf(store, 'name') : t('منتجات المتجر')}</h1>
      {error && <div data-testid="error-message">{error}</div>}
      {user && user.id === store.ownerId && (
        <div className="inline-form">
          <input
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            placeholder={t('اسم المنتج الجديد')}
            data-testid="new-product-name"
          />
          <input
            type="number"
            value={newProductPrice}
            onChange={(e) => setNewProductPrice(e.target.value)}
            placeholder={t('سعر المنتج الجديد')}
            data-testid="new-product-price"
          />
          <button onClick={handleCreateProduct} data-testid="create-product">{t('إنشاء منتج')}</button>
        </div>
      )}
      <ul className="product-grid">
        {products.map(product => (
          <li key={product.id} data-testid="product-item" className="product-card">
            {product.imageUrl ? <img src={product.imageUrl} alt={tf(product, 'name')} data-testid="product-image" loading="lazy" /> : <div className="product-ph" aria-hidden="true" />}
            <div className="product-body">
              <span className="product-name">{tf(product, 'name')}</span>
              <span className="price"><bdi>{Number(product.price).toLocaleString(getLang() === 'ar' ? 'ar-SA' : 'en-US')}</bdi> {t('ريال')}</span>
            </div>
            {user && user.id === store.ownerId && (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleImageChange(product.id, e)}
                data-testid="product-image-input"
              />
            )}
            {user && user.id === store.ownerId && (
              <button onClick={() => handleDeleteProduct(product.id)} data-testid="delete-product">{t('حذف')}</button>
            )}
            <button className="btn-cart" onClick={() => onAddToCart(product.id)} data-testid="add-to-cart">{t('أضف للسلة')}</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StorePage;
