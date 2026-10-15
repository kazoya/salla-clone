import React, { useState, useEffect } from 'react';
import { t, useLang } from './i18n';
import { useTheme } from './theme';
import AdminPanel from './components/AdminPanel';
import { fetchStores, createStore, addOrUpdateCartItem, getCartItems, register, login, me, logout } from './api';
import StoreList from './components/StoreList';
import StorePage from './components/StorePage';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import Dashboard from './components/Dashboard';

const App = () => {
  useLang();
  useTheme();
  const [showAdmin, setShowAdmin] = useState(false);
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || crypto.randomUUID());
  const [cartItems, setCartItems] = useState({ items: [], cartTotal: 0 });
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const fetchStoresData = async () => {
      const data = await fetchStores();
      setStores(data);
    };
    fetchStoresData();
  }, []);

  useEffect(() => {
    localStorage.setItem('sessionId', sessionId);
  }, [sessionId]);

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const data = await getCartItems(sessionId);
        setCartItems(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCartData();
  }, [sessionId]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await me(token);
          setUser(userData.user || userData);
        } catch (error) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    };
    checkAuth();
  }, []);

  const handleSelectStore = (id) => {
    setSelectedStoreId(id);
  };

  const handleGoBack = () => {
    setSelectedStoreId(null);
  };

  const handleAddToCart = async (productId) => {
    try {
      await addOrUpdateCartItem(sessionId, productId, 1);
      const updatedCartItems = await getCartItems(sessionId);
      setCartItems(updatedCartItems);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      const response = await register(name, email, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      setAuthMode('login');
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await login(email, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const handleStoreCreated = (newStore) => {
    setStores([...stores, newStore]);
  };

  const selectedStore = stores.find(store => store.id === selectedStoreId);

  return (
    <div className="app">
      <Header
        user={user}
        onLogout={() => { handleLogout(); setShowAdmin(false); setShowDashboard(false); }}
        onDashboard={() => { setShowAdmin(false); setShowDashboard(true); }}
        onAdmin={() => { setShowDashboard(false); setShowAdmin(true); }}
        onHome={() => { setShowAdmin(false); setShowDashboard(false); setSelectedStoreId(null); }}
      />
      <main>
      {user ? (
        <div>
          {showAdmin && user.role === 'admin' ? (
            <div>
              <button className="btn-ghost back" onClick={() => setShowAdmin(false)} data-testid="back">{t('رجوع')}</button>
              <AdminPanel />
            </div>
          ) : showDashboard ? (
            <div>
              <button className="btn-ghost back" onClick={() => setShowDashboard(false)} data-testid="back">{t('رجوع')}</button>
              <Dashboard />
            </div>
          ) : (
            <>
              {selectedStoreId ? (
                <div>
                  <button className="btn-ghost back" onClick={handleGoBack} data-testid="back">{t('رجوع')}</button>
                  <StorePage store={selectedStore} onAddToCart={handleAddToCart} user={user} />
                  <Cart sessionId={sessionId} cartItems={cartItems} />
                  {cartItems.items.length > 0 && <Checkout sessionId={sessionId} />}
                </div>
              ) : (
                <StoreList stores={stores} onSelectStore={handleSelectStore} user={user} onStoreCreated={handleStoreCreated} />
              )}
            </>
          )}
        </div>
      ) : (
        <AuthForm
          mode={authMode}
          onRegister={handleRegister}
          onLogin={handleLogin}
          error={authError}
          onToggleMode={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
        />
      )}
      </main>
    </div>
  );
};

export default App;
