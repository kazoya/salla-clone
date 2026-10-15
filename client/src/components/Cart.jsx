import React from 'react';

const Cart = ({ cartItems }) => {
  return (
    <div>
      <h1>سلة التسوق</h1>
      <ul>
        {cartItems.items.map(item => (
          <li key={item.productId} data-testid="cart-item">
            {item.productName} - {item.price} × {item.qty} = {item.lineTotal}
            <button onClick={() => console.log('Remove item')} data-testid="remove-item">حذف</button>
          </li>
        ))}
      </ul>
      <h2 data-testid="cart-total">المجموع الكلي: {cartItems.cartTotal}</h2>
    </div>
  );
};

export default Cart;
