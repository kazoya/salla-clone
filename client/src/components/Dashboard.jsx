import React, { useState, useEffect } from 'react';
import { t, tf, getLang } from '../i18n';
import { merchant } from '../commerceApi';
import { money, variantLabel } from './Cart';
import { STATUS_AR } from './TrackOrder';

const NEXT = { paid: ['processing', 'shipped', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'] };

const RevenueChart = ({ days }) => {
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const loc = getLang() === 'ar' ? 'ar-SA' : 'en-US';
  return (
    <figure className="chart" data-testid="revenue-chart">
      <figcaption>{t('الإيرادات آخر 14 يومًا')}</figcaption>
      <div className="bars" role="list">
        {days.map((d) => (
          <div key={d.day} className="bar-col" role="listitem" title={`${d.day}: ${money(d.revenue)}`}>
            <div className="bar" style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }} />
            <span className="bar-label">{new Date(d.day + 'T12:00:00Z').toLocaleDateString(loc, { day: 'numeric' })}</span>
            <span className="sr-only">{d.day}: {money(d.revenue)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
};

const Dashboard = () => {
  const [a, setA] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [cform, setCform] = useState({ storeId: '', code: '', type: 'percent', value: 10, minSubtotal: 0 });

  const load = async () => {
    try {
      const [an, os, ss, cs] = await Promise.all([merchant.analytics(), merchant.orders(), merchant.stores(), merchant.coupons()]);
      setA(an); setOrders(os); setStores(ss); setCoupons(cs); setError('');
      if (!cform.storeId && ss[0]) setCform((f) => ({ ...f, storeId: ss[0].id }));
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const act = (fn) => fn().then(load).catch((e) => setError(e.message));
  const TABS = { overview: 'نظرة عامة', orders: 'الطلبات', coupons: 'كوبونات الخصم', theme: 'مظهر المتجر' };

  return (
    <section className="dash" data-testid="dashboard">
      <h1>{t('لوحة التحكم')}</h1>
      {error && <p role="alert" data-testid="error-message">{t(error)}</p>}
      <nav className="admin-tabs">
        {Object.entries(TABS).map(([k, v]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)} data-testid={`dash-tab-${k}`}>{t(v)}</button>)}
      </nav>

      {tab === 'overview' && a && (
        <>
          <div className="kpi-grid">
            <div className="kpi"><div className="kpi-label">{t('الإيرادات')}</div><div className="kpi-value" data-testid="stat-revenue">{money(a.revenue)}</div></div>
            <div className="kpi"><div className="kpi-label">{t('طلبات مدفوعة')}</div><div className="kpi-value" data-testid="stat-orders">{a.paidOrders}</div></div>
            <div className="kpi"><div className="kpi-label">{t('متوسط قيمة الطلب')}</div><div className="kpi-value" data-testid="stat-aov">{money(a.avgOrderValue)}</div></div>
            <div className="kpi"><div className="kpi-label">{t('المنتجات')}</div><div className="kpi-value" data-testid="stat-products">{a.productCount}</div></div>
          </div>
          <RevenueChart days={a.revenueByDay} />
          <div className="two-col">
            <div className="panel">
              <h2>{t('الأكثر مبيعًا')}</h2>
              {a.topProducts.length ? (
                <ol className="top-list" data-testid="top-products">{a.topProducts.map((p) => <li key={p.productId}><span>{tf(p, 'name')}</span><span className="muted">× {p.qty}</span><span className="price">{money(p.revenue)}</span></li>)}</ol>
              ) : <p className="muted">{t('لا توجد مبيعات بعد')}</p>}
            </div>
            <div className="panel">
              <h2>{t('الطلبات حسب الحالة')}</h2>
              <ul className="status-list" data-testid="by-status">{Object.entries(a.byStatus).map(([s, n]) => <li key={s}><span className={`badge s-${s}`}>{t(STATUS_AR[s])}</span><b>{n}</b></li>)}</ul>
            </div>
          </div>
        </>
      )}

      {tab === 'orders' && (
        <ul className="order-list">
          {!orders.length && <li className="muted">{t('لا توجد طلبات')}</li>}
          {orders.map((o) => (
            <li key={o.id} data-testid="dash-order" className="panel order-card">
              <div className="order-head">
                <b>{o.trackingCode || o.id.slice(0, 8)}</b>
                <span className={`badge s-${o.status}`} data-testid="order-status">{t(STATUS_AR[o.status])}</span>
                <span className="muted small">{new Date(o.createdAt).toLocaleString(getLang() === 'ar' ? 'ar-SA' : 'en-US')}</span>
              </div>
              <p className="small">{o.customerName} · <bdi>{o.phone}</bdi></p>
              <ul className="small">{o.items.map((i, k) => <li key={k}>{tf(i, 'productName')} {i.variant && `(${variantLabel(i.variant)})`} × {i.qty}</li>)}</ul>
              <p>{t('الإجمالي:')} <b>{money(o.ownerTotal)}</b></p>
              <div className="actions">
                {(NEXT[o.status] || []).map((s) => (
                  <button key={s} className={s === 'cancelled' ? 'btn-danger' : ''} onClick={() => act(() => merchant.setStatus(o.id, s))} data-testid={`set-${s}`}>{t(STATUS_AR[s])}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'coupons' && (
        <div className="panel">
          {stores.length ? (
            <form className="inline-form" onSubmit={(e) => { e.preventDefault(); act(() => merchant.addCoupon({ ...cform, value: Number(cform.value), minSubtotal: Number(cform.minSubtotal) })); }}>
              <label>{t('المتجر')}<select value={cform.storeId} onChange={(e) => setCform({ ...cform, storeId: e.target.value })}>{stores.map((s) => <option key={s.id} value={s.id}>{tf(s, 'name')}</option>)}</select></label>
              <label>{t('الكود')}<input value={cform.code} onChange={(e) => setCform({ ...cform, code: e.target.value })} data-testid="coupon-code" placeholder="SUMMER20" required /></label>
              <label>{t('النوع')}<select value={cform.type} onChange={(e) => setCform({ ...cform, type: e.target.value })} data-testid="coupon-type"><option value="percent">{t('نسبة %')}</option><option value="fixed">{t('مبلغ ثابت')}</option></select></label>
              <label>{t('القيمة')}<input type="number" min="1" value={cform.value} onChange={(e) => setCform({ ...cform, value: e.target.value })} data-testid="coupon-value" /></label>
              <label>{t('الحد الأدنى للطلب')}<input type="number" min="0" value={cform.minSubtotal} onChange={(e) => setCform({ ...cform, minSubtotal: e.target.value })} /></label>
              <button type="submit" data-testid="coupon-create">{t('إضافة كود')}</button>
            </form>
          ) : <p className="muted">{t('أنشئ متجرًا أولاً')}</p>}
          <table className="admin-table" data-testid="coupon-table">
            <thead><tr><th>{t('الكود')}</th><th>{t('الخصم')}</th><th>{t('الاستخدام')}</th><th>{t('الحالة')}</th><th><span className="sr-only">{t('إجراءات')}</span></th></tr></thead>
            <tbody>{coupons.map((c) => (
              <tr key={c.id}><td><b>{c.code}</b></td><td>{c.type === 'percent' ? `${c.value}%` : money(c.value)}</td><td>{c.uses || 0}</td>
                <td>{c.active ? t('نشط') : t('معطل')}</td>
                <td><button className="btn-ghost outline" onClick={() => act(() => merchant.toggleCoupon(c.id, !c.active))} data-testid="coupon-toggle">{c.active ? t('تعطيل') : t('تفعيل')}</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'theme' && (
        <div className="theme-list">
          {!stores.length && <p className="muted">{t('أنشئ متجرًا أولاً')}</p>}
          {stores.map((s) => <ThemeEditor key={s.id} store={s} onSave={(body) => act(() => merchant.themeStore(s.id, body))} />)}
        </div>
      )}
    </section>
  );
};

const SWATCHES = ['#0b6e4f', '#1d4ed8', '#7a3e1d', '#9d174d', '#6d28d9', '#b45309', '#0f766e', '#111827'];
const ThemeEditor = ({ store, onSave }) => {
  const [accent, setAccent] = useState(store.accent || '#0b6e4f');
  const [description, setDesc] = useState(store.description || '');
  return (
    <form className="panel theme-editor" onSubmit={(e) => { e.preventDefault(); onSave({ accent, description }); }} style={{ '--store': accent }} data-testid="theme-editor">
      <h2>{tf(store, 'name')}</h2>
      <fieldset><legend>{t('لون المتجر')}</legend>
        <div className="swatches">
          {SWATCHES.map((c) => <button type="button" key={c} className={`swatch ${accent === c ? 'is-on' : ''}`} style={{ background: c }} aria-label={c} aria-pressed={accent === c} onClick={() => setAccent(c)} />)}
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label={t('لون مخصص')} data-testid="theme-color" />
        </div>
      </fieldset>
      <label>{t('وصف المتجر')}<input value={description} onChange={(e) => setDesc(e.target.value)} maxLength={160} data-testid="theme-description" /></label>
      <div className="theme-preview" aria-hidden="true"><span className="store-mark">{tf(store, 'name').charAt(0)}</span><span>{description || tf(store, 'name')}</span><span className="preview-btn">{t('أضف للسلة')}</span></div>
      <button type="submit" data-testid="theme-save">{t('حفظ')}</button>
    </form>
  );
};

export default Dashboard;
