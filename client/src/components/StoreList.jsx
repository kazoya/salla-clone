import React, { useState, useEffect } from 'react';
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
        <h1>قائمة المتاجر</h1>
        <p>أنشئ متجرك الإلكتروني في دقيقة، وابدأ البيع اليوم.</p>
      </section>
      {user && (
        <div>
          <input
            type="text"
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            placeholder="اسم المتجر الجديد"
            data-testid="new-store-name"
          />
          <button onClick={handleCreateStore} data-testid="create-store">إنشاء متجر</button>
        </div>
      )}
      <ul>
        {stores.map(store => (
          <li key={store.id} onClick={() => onSelectStore(store.id)} data-testid="store-item">
            {store.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StoreList;
