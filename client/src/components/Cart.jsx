import React from 'react';
import { t } from '../i18n';

const Cart = ({ cartItems }) => {
  return (
    <div>
      <h1>{t('سلة التسوق')}</h1>
      <ul>
        {cartItems.items.map(item => (
          <li key={item.productId} data-testid="cart-item">
            {item.productName} - {item.price} × {item.qty} = {item.lineTotal}
            <button onClick={() => console.log('Remove item')} data-testid="remove-item">{t('حذف')}</button>
          </li>
        ))}
      </ul>
      <h2 data-testid="cart-total">{t('المجموع الكلي:')} {cartItems.cartTotal}</h2>
    </div>
  );
};

export default Cart;
