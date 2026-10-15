import React, { useState, useEffect } from 'react';
import { t, tf } from '../i18n';
import { fetchStores, createStore } from '../api';

const StoreList = ({ stores, onSelectStore, user, onStoreCreated }) => {
  const [newStoreName, setNewStoreName] = useState('');

  const handleCreateStore = async () => {
    if (newStoreName.trim() && user) {
      try {
        const newStore = await createStore(newStoreName, localStorage.getItem('token'));
        onStoreCreated(newStore);
        setNewStoreName('');
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div>
      <section className="hero">
        <h1>{t('قائمة المتاجر')}</h1>
        <p>{t('أنشئ متجرك الإلكتروني في دقيقة، وابدأ البيع اليوم.')}</p>
      </section>
      {user && (
        <div className="inline-form">
          <input
            type="text"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder={t('اسم المتجر الجديد')}
            data-testid="new-store-name"
          />
          <button onClick={handleCreateStore} data-testid="create-store">{t('إنشاء متجر')}</button>
        </div>
      )}
      <ul className="store-grid">
        {stores.map(store => (
          <li key={store.id} data-testid="store-item">
            <button type="button" className="store-card" onClick={() => onSelectStore(store.id)}>
              <span className="store-mark" aria-hidden="true">{tf(store, 'name').trim().charAt(0)}</span>
              <span className="store-name">{tf(store, 'name')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StoreList;
