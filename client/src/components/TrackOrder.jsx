import React, { useEffect, useState } from 'react';
import { t, tf, getLang } from '../i18n';
import { shop } from '../commerceApi';
import { money, variantLabel } from './Cart';

const STEPS = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered'];
export const STATUS_AR = { pending_payment: 'بانتظار الدفع', paid: 'مدفوع', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التوصيل', cancelled: 'ملغي' };

const TrackOrder = ({ initialCode = '', initialPhone = '' }) => {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState(initialPhone);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const lookup = async (e) => {
    e && e.preventDefault();
    try { setOrder(await shop.track(code.trim(), phone.trim())); setError(''); } catch (err) { setOrder(null); setError(err.message); }
  };
  useEffect(() => { if (initialCode && initialPhone) lookup(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const reached = order ? new Map(order.history.map((h) => [h.status, h.at])) : new Map();
  const fmt = (iso) => new Date(iso).toLocaleString(getLang() === 'ar' ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <section className="panel track" aria-labelledby="tr-h">
      <h1 id="tr-h">{t('تتبع الطلب')}</h1>
      <form onSubmit={lookup} className="inline-form">
        <label className="grow">{t('رقم التتبع')}<input value={code} onChange={(e) => setCode(e.target.value)} data-testid="track-code" placeholder="SL123456" required /></label>
        <label className="grow">{t('رقم الجوال')}<input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="track-phone" inputMode="tel" required /></label>
        <button type="submit" data-testid="track-submit">{t('بحث')}</button>
      </form>
      {error && <p role="alert" data-testid="error-message">{t(error)}</p>}
      {order && (
        <div data-testid="track-result">
          <p className="track-status">{t('الحالة:')} <b data-testid="track-status">{t(STATUS_AR[order.status])}</b></p>
          {order.status === 'cancelled' ? <p className="muted">{t('تم إلغاء هذا الطلب')}</p> : (
            <ol className="timeline">
              {STEPS.map((s) => (
                <li key={s} className={reached.has(s) ? 'done' : ''} data-testid={`step-${s}`}>
                  <span className="dot" aria-hidden="true" />
                  <span className="step-name">{t(STATUS_AR[s])}</span>
                  {reached.has(s) && <span className="muted small">{fmt(reached.get(s))}</span>}
                </li>
              ))}
            </ol>
          )}
          <ul className="track-items">
            {order.items.map((i, k) => <li key={k}>{tf(i, 'productName')} {i.variant && `(${variantLabel(i.variant)})`} × {i.qty}</li>)}
          </ul>
          <p>{t('الإجمالي')}: <b>{money(order.total)}</b></p>
        </div>
      )}
    </section>
  );
};
export default TrackOrder;
