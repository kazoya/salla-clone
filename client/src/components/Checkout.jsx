import React, { useState } from 'react';
import { t } from '../i18n';
import { createOrder, payOrder } from '../api';

const Checkout = ({ sessionId }) => {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateOrder = async () => {
    if (customerName.trim() && phone.trim() && address.trim()) {
      try {
        const order = await createOrder(sessionId, customerName, phone, address);
        setOrderId(order.orderId);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      }
    }
  };

  const handlePayOrder = async () => {
    if (orderId) {
      try {
        const result = await payOrder(orderId, cardNumber);
        setPaymentResult(result.status);
        setErrorMessage('');
      } catch (error) {
        setErrorMessage(error.message);
      }
    }
  };

  return (
    <div>
      <h1>{t('الدفع')}</h1>
      <input
        type="text"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        placeholder={t('اسم العميل')}
        data-testid="customer-name"
      />
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={t('رقم الهاتف')}
        data-testid="customer-phone"
      />
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={t('العنوان')}
        data-testid="customer-address"
      />
      <button onClick={handleCreateOrder} data-testid="create-order">{t('إنشاء الطلب')}</button>
      {orderId && (
        <>
          <h2>{t('رقم الطلب:')} {orderId}</h2>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder={t('رقم البطاقة')}
            data-testid="card-number"
          />
          <button onClick={handlePayOrder} data-testid="pay">{t('دفع')}</button>
          {paymentResult && (
            <h2 data-testid="payment-result">{t('نتيجة الدفع:')} {paymentResult === 'paid' ? t('تم الدفع') : t('مرفوض')}</h2>
          )}
          {errorMessage && (
            <h2 data-testid="error-message">{t('خطأ:')} {errorMessage}</h2>
          )}
        </>
      )}
    </div>
  );
};

export default Checkout;
