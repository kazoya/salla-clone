import React from 'react';
import { t, tf, getLang } from '../i18n';
import { shop } from '../commerceApi';

export const money = (n) => `${Number(n || 0).toLocaleString(getLang() === 'ar' ? 'ar-SA' : 'en-US')} ${t('ريال')}`;
// "Size:100ml|Color:Black" -> "Size: 100ml · Color: Black" with option names translated
export const variantLabel = (v) => (v ? v.split('|').map((p) => { const [k, val] = p.split(':'); return `${t(k)}: ${t(val)}`; }).join('، ') : '');

const Cart = ({ sessionId, cartItems, onChange }) => {
  if (!cartItems.items.length) return <section className="panel"><h2>{t('سلة التسوق')}</h2><p className="muted">{t('السلة فارغة')}</p></section>;
  const update = async (fn) => { await fn(); onChange && onChange(); };
  return (
    <section className="panel" aria-labelledby="cart-h">
      <h2 id="cart-h">{t('سلة التسوق')}</h2>
      <ul className="cart-list">
        {cartItems.items.map((item) => (
          <li key={item.productId + item.variant} data-testid="cart-item" className="cart-line">
            {item.imageUrl && <img src={item.imageUrl} alt="" width="56" height="42" />}
            <div className="cart-line-body">
              <span className="product-name">{tf(item, 'productName')}</span>
              {item.variant && <span className="muted small" data-testid="cart-variant">{variantLabel(item.variant)}</span>}
            </div>
            <div className="qty" role="group" aria-label={t('الكمية')}>
              <button type="button" className="btn-ghost" aria-label={t('إنقاص')} onClick={() => update(() => shop.addToCart(sessionId, item.productId, -1, optionsFrom(item.variant)))}>−</button>
              <span data-testid="cart-qty">{item.qty}</span>
              <button type="button" className="btn-ghost" aria-label={t('زيادة')} onClick={() => update(() => shop.addToCart(sessionId, item.productId, 1, optionsFrom(item.variant)))}>+</button>
            </div>
            <span className="price">{money(item.lineTotal)}</span>
            <button type="button" data-testid="remove-item" onClick={() => update(() => shop.removeLine(sessionId, item.productId, item.variant))}>{t('حذف')}</button>
          </li>
        ))}
      </ul>
      <p data-testid="cart-total" className="cart-total">{t('المجموع الكلي:')} {money(cartItems.cartTotal)}</p>
    </section>
  );
};
export const optionsFrom = (v) => (v ? Object.fromEntries(v.split('|').map((p) => p.split(':'))) : undefined);
export default Cart;
