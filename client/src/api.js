const API_BASE_URL = '/api';

export const fetchStores = async () => {
  const response = await fetch(`${API_BASE_URL}/stores`);
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const createStore = async (name, token) => {
  const response = await fetch(`${API_BASE_URL}/stores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const fetchProductsByStoreId = async (storeId) => {
  const response = await fetch(`${API_BASE_URL}/products?storeId=${storeId}`);
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const createProduct = async (storeId, name, price, token) => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ storeId, name, price })
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const deleteProduct = async (id, token) => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const addOrUpdateCartItem = async (sessionId, productId, qty) => {
  const response = await fetch(`${API_BASE_URL}/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, productId, qty })
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const getCartItems = async (sessionId) => {
  const response = await fetch(`${API_BASE_URL}/cart/${sessionId}`);
  if (!response.ok) {
    if (response.status === 404) {
      return { items: [], cartTotal: 0 };
    }
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const deleteCartItem = async (sessionId, productId) => {
  const response = await fetch(`${API_BASE_URL}/cart/${sessionId}/${productId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const createOrder = async (sessionId, customerName, phone, address) => {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, customerName, phone, address })
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const payOrder = async (id, cardNumber, token) => {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ cardNumber })
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const getOrderById = async (id, token) => {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const register = async (name, email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const login = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const me = async (token) => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }
  return response.json();
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const uploadProductImage = async (productId, file, token) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/products/${productId}/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(await response.json().then(data => data.error));
  }

  return response.json();
};


export const getMyStats = async () => {
  const res = await fetch('/api/my/stats', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

export const getMyOrders = async () => {
  const res = await fetch('/api/my/orders', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

export const shipOrder = async (id) => {
  const res = await fetch(`/api/my/orders/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ status: 'shipped' })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};
