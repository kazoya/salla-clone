// Admin API client (Salla). Throws Error(message) on failure.
const call = async (method, path, body) => {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'خطأ في الخادم');
  return data;
};

export const adminApi = {
  stats: () => call('GET', '/stats'),
  users: () => call('GET', '/users'),
  setUserDisabled: (id, disabled) => call('PATCH', `/users/${id}`, { disabled }),
  stores: () => call('GET', '/stores'),
  deleteStore: (id) => call('DELETE', `/stores/${id}`),
  products: () => call('GET', '/products'),
  deleteProduct: (id) => call('DELETE', `/products/${id}`),
  orders: () => call('GET', '/orders'),
  setOrderStatus: (id, status) => call('PATCH', `/orders/${id}`, { status }),
};
