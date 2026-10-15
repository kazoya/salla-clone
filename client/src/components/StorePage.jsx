import React, { useState, useEffect } from 'react';
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
      setError('حجم الملف يجب أن يكون أقل من 2MB');
    }
  };

  return (
    <div>
      <h1>منتجات المتجر</h1>
      {error && <div data-testid="error-message">{error}</div>}
      {user && user.id === store.ownerId && (
        <div>
          <input
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            placeholder="اسم المنتج الجديد"
            data-testid="new-product-name"
          />
          <input
            type="number"
            value={newProductPrice}
            onChange={(e) => setNewProductPrice(e.target.value)}
            placeholder="سعر المنتج الجديد"
            data-testid="new-product-price"
          />
          <button onClick={handleCreateProduct} data-testid="create-product">إنشاء منتج</button>
        </div>
      )}
      <ul>
        {products.map(product => (
          <li key={product.id} data-testid="product-item">
            {product.name} - {product.price}
            {product.imageUrl && <img src={product.imageUrl} alt={product.name} data-testid="product-image" />}
            {user && user.id === store.ownerId && (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleImageChange(product.id, e)}
                data-testid="product-image-input"
              />
            )}
            {user && user.id === store.ownerId && (
              <button onClick={() => handleDeleteProduct(product.id)} data-testid="delete-product">حذف</button>
            )}
            <button onClick={() => onAddToCart(product.id)} data-testid="add-to-cart">أضف للسلة</button>
          </li>
        ))}
      </ul>
      <button onClick={() => window.history.back()} data-testid="back">رجوع</button>
    </div>
  );
};

export default StorePage;
