import React, { useEffect, useState } from 'react';
import { t, tf } from '../i18n';
import { shop } from '../commerceApi';
import { money } from './Cart';

const Checkout = ({ sessionId, onOrdered, onTrack }) => {
  const [form, setForm] = useState({ customerName: '', phone: '', address: '' });
  const [methods, setMethods] = useState(null);
  const [shippingMethod, setShipping] = useState('standard');
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [quote, setQuote] = useState(null);
  const [order, setOrder] = useState(null);
  const [card, setCard] = useState('');
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { shop.shippingMethods().then(setMethods).catch(() => {}); }, []);
  useEffect(() => {
    if (order) return;
    shop.quote(sessionId, applied, shippingMethod).then((q) => { setQuote(q); setError(''); }).catch((e) => setError(e.message));
  }, [sessionId, applied, shippingMethod, order]);

  const applyCoupon = async () => {
    try { await shop.quote(sessionId, coupon, shippingMethod); setApplied(coupon); setError(''); } catch (e) { setError(e.message); }
  };
  const place = async (e) => {
    e.preventDefault();
    try { const o = await shop.placeOrder({ sessionId, ...form, couponCode: applied || undefined, shippingMethod }); setOrder(o); setError(''); onOrdered && onOrdered(); } catch (err) { setError(err.message); }
  };
  const pay = async (e) => {
    e.preventDefault();
    try { await shop.pay(order.orderId, card.replace(/\s/g, '')); setPaid(true); setError(''); } catch (err) { setError(err.message); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const summary = order || quote;

  return (
    <section className="panel checkout" aria-labelledby="co-h">
      <h2 id="co-h">{t('الدفع')}</h2>
      {error && <p role="alert" data-testid="error-message">{t(error)}</p>}
      {!order && (
        <form onSubmit={place} className="checkout-form" noValidate>
          <label>{t('اسم العميل')}<input value={form.customerName} onChange={set('customerName')} data-testid="customer-name" autoComplete="name" required /></label>
          <label>{t('رقم الجوال')}<input value={form.phone} onChange={set('phone')} data-testid="customer-phone" inputMode="tel" autoComplete="tel" placeholder="05xxxxxxxx" required /></label>
          <label>{t('العنوان')}<input value={form.address} onChange={set('address')} data-testid="customer-address" autoComplete="street-address" required /></label>
          {methods && (
            <fieldset className="ship-options">
              <legend>{t('طريقة الشحن')}</legend>
              {Object.entries(methods.methods).map(([key, m]) => (
                <label key={key} className={`ship-option ${shippingMethod === key ? 'is-on' : ''}`}>
                  <input type="radio" name="ship" value={key} checked={shippingMethod === key} onChange={() => setShipping(key)} data-testid={`ship-${key}`} />
                  <span><b>{tf(m, 'name')}</b><span className="muted small">{key === 'pickup' ? t('اليوم') : `${m.days} ${t('أيام')}`}</span></span>
                  <span className="price">{m.fee ? money(m.fee) : t('مجاني')}</span>
                </label>
              ))}
              <p className="muted small">{t('شحن عادي مجاني للطلبات فوق')} {money(methods.freeShippingOver)}</p>
            </fieldset>
          )}
          <div className="coupon-row">
            <label className="grow">{t('كود الخصم')}<input value={coupon} onChange={(e) => setCoupon(e.target.value)} data-testid="coupon-input" placeholder="WELCOME10" /></label>
            <button type="button" className="btn-ghost outline" onClick={applyCoupon} data-testid="apply-coupon">{t('تطبيق')}</button>
          </div>
          {applied && <p className="ok small" data-testid="coupon-applied">{t('تم تطبيق الكود')} {applied.toUpperCase()}</p>}
          <button type="submit" data-testid="create-order">{t('إنشاء الطلب')}</button>
        </form>
      )}
      {summary && (
        <dl className="summary" data-testid="order-summary">
          <div><dt>{t('المجموع الفرعي')}</dt><dd>{money(summary.subtotal)}</dd></div>
          {summary.discount > 0 && <div className="ok"><dt>{t('الخصم')}</dt><dd data-testid="summary-discount">−{money(summary.discount)}</dd></div>}
          <div><dt>{t('الشحن')}</dt><dd data-testid="summary-shipping">{summary.shippingFee ? money(summary.shippingFee) : t('مجاني')}</dd></div>
          <div className="total"><dt>{t('الإجمالي')}</dt><dd data-testid="summary-total">{money(summary.total)}</dd></div>
        </dl>
      )}
      {order && !paid && (
        <form onSubmit={pay} className="checkout-form">
          <p>{t('رقم التتبع:')} <b data-testid="tracking-code">{order.trackingCode}</b></p>
          <label>{t('رقم البطاقة')}<input value={card} onChange={(e) => setCard(e.target.value)} data-testid="card-number" inputMode="numeric" autoComplete="cc-number" placeholder="4111 1111 1111 1111" /></label>
          <button type="submit" data-testid="pay">{t('دفع')}</button>
        </form>
      )}
      {paid && (
        <div className="success" role="status">
          <h3 data-testid="payment-result">{t('تم الدفع')}</h3>
          <p>{t('احتفظ برقم التتبع لمتابعة طلبك:')} <b>{order.trackingCode}</b></p>
          <button type="button" onClick={() => onTrack && onTrack(order.trackingCode, form.phone)} data-testid="go-track">{t('تتبع الطلب')}</button>
        </div>
      )}
    </section>
  );
};
export default Checkout;
