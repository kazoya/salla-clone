// Client for the commerce endpoints (variants, checkout quote, tracking, merchant tools). Throws Error(message).
const call = async (method, url, body, auth = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  const res = await fetch(`/api${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'خطأ في الخادم');
  return data;
};
export const shop = {
  addToCart: (sessionId, productId, qty, options) => call('POST', '/cart', { sessionId, productId, qty, options }),
  cart: (sessionId) => call('GET', `/cart/${sessionId}`),
  removeLine: (sessionId, productId, variant) => call('DELETE', `/cart/${sessionId}/${productId}?variant=${encodeURIComponent(variant || '')}`),
  shippingMethods: () => call('GET', '/shipping-methods'),
  quote: (sessionId, couponCode, shippingMethod) => call('POST', '/checkout/quote', { sessionId, couponCode, shippingMethod }),
  placeOrder: (body) => call('POST', '/orders', body),
  pay: (orderId, cardNumber) => call('POST', `/orders/${orderId}/pay`, { cardNumber }),
  track: (code, phone) => call('GET', `/track?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`),
};
export const merchant = {
  analytics: () => call('GET', '/my/analytics', null, true),
  stores: () => call('GET', '/my/stores', null, true),
  orders: () => call('GET', '/my/orders', null, true),
  setStatus: (id, status) => call('PATCH', `/my/orders/${id}/status`, { status }, true),
  themeStore: (id, body) => call('PATCH', `/my/stores/${id}`, body, true),
  coupons: () => call('GET', '/my/coupons', null, true),
  addCoupon: (body) => call('POST', '/my/coupons', body, true),
  toggleCoupon: (id, active) => call('PATCH', `/my/coupons/${id}`, { active }, true),
  productDetails: (id, body) => call('PATCH', `/products/${id}/details`, body, true),
};
