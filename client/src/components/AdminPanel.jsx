import React, { useState, useEffect } from 'react';
import { t } from '../i18n';
import { adminApi } from '../adminApi';

const TAB_LABELS = { stats: 'الإحصائيات', users: 'المستخدمون', stores: 'المتاجر', products: 'المنتجات', orders: 'الطلبات' };
const STAT_LABELS = { users: 'المستخدمون', stores: 'المتاجر', products: 'المنتجات', orders: 'الطلبات', paidRevenue: 'الإيرادات المدفوعة' };
const ROLE_LABELS = { admin: 'مدير', user: 'مستخدم' };
const STATUS_LABELS = { pending_payment: 'بانتظار الدفع', paid: 'مدفوع', shipped: 'تم الشحن', cancelled: 'ملغي' };

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setError('');
      try {
        switch (activeTab) {
          case 'stats':
            setStats(await adminApi.stats());
            break;
          case 'users':
            setUsers(await adminApi.users());
            break;
          case 'stores':
            setStores(await adminApi.stores());
            break;
          case 'products':
            setProducts(await adminApi.products());
            break;
          case 'orders':
            setOrders(await adminApi.orders());
            break;
          default:
            break;
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleToggleUser = async (userId, disabled) => {
    try {
      await adminApi.setUserDisabled(userId, !disabled);
      setUsers(await adminApi.users());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (window.confirm(t('هل أنت متأكد من الحذف؟'))) {
      try {
        await adminApi.deleteStore(storeId);
        setStores(await adminApi.stores());
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm(t('هل أنت متأكد من الحذف؟'))) {
      try {
        await adminApi.deleteProduct(productId);
        setProducts(await adminApi.products());
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSetOrderStatus = async (orderId, status) => {
    try {
      await adminApi.setOrderStatus(orderId, status);
      setOrders(await adminApi.orders());
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section data-testid="admin-panel" className="admin">
      <nav className="admin-tabs">
        {['stats', 'users', 'stores', 'products', 'orders'].map(tab => (
          <button
            key={tab}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {t(TAB_LABELS[tab])}
          </button>
        ))}
      </nav>

      {error ? <p data-testid="error-message" role="alert">{t(error)}</p> : null}

      {activeTab === 'stats' && (
        stats ? (
          <div className="kpi-grid">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="kpi" data-testid={`admin-stat-${key}`}>
                <div className="kpi-label">{t(STAT_LABELS[key] || key)}</div>
                <div className="kpi-value">{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p>{t('جار التحميل...')}</p>
        )
      )}

      {activeTab === 'users' && (
        users.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('الاسم')}</th>
                  <th>{t('البريد الإلكتروني')}</th>
                  <th>{t('الدور')}</th>
                  <th>{t('الحالة')}</th>
                  <th><span className="sr-only">{t('إجراءات')}</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} data-testid="admin-user-row">
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{t(ROLE_LABELS[user.role] || 'مستخدم')}</td>
                    <td>{t(user.disabled ? 'معطل' : 'نشط')}</td>
                    {user.role === 'admin' ? <td /> : (
                      <td>
                        <button
                          type="button"
                          data-testid="admin-toggle-user"
                          onClick={() => handleToggleUser(user.id, user.disabled)}
                        >
                          {t(user.disabled ? 'تفعيل' : 'تعطيل')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t('لا توجد بيانات')}</p>
        )
      )}

      {activeTab === 'stores' && (
        stores.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('اسم المتجر')}</th>
                  <th>{t('مالك')}</th>
                  <th>{t('عدد المنتجات')}</th>
                  <th><span className="sr-only">{t('إجراءات')}</span></th>
                </tr>
              </thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.id} data-testid="admin-store-row">
                    <td>{store.name}</td>
                    <td>{store.ownerName}</td>
                    <td>{store.productCount}</td>
                    <td>
                      <button
                        type="button"
                        data-testid="admin-delete-store"
                        onClick={() => handleDeleteStore(store.id)}
                      >
                        {t('حذف')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t('لا توجد بيانات')}</p>
        )
      )}

      {activeTab === 'products' && (
        products.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('اسم المنتج')}</th>
                  <th>{t('السعر')}</th>
                  <th>{t('المتجر')}</th>
                  <th><span className="sr-only">{t('إجراءات')}</span></th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} data-testid="admin-product-row">
                    <td>{product.name}</td>
                    <td>{product.price}</td>
                    <td>{product.storeName}</td>
                    <td>
                      <button
                        type="button"
                        data-testid="admin-delete-product"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        {t('حذف')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t('لا توجد بيانات')}</p>
        )
      )}

      {activeTab === 'orders' && (
        orders.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('اسم العميل')}</th>
                  <th>{t('الإجمالي')}</th>
                  <th>{t('الحالة')}</th>
                  <th><span className="sr-only">{t('إجراءات')}</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} data-testid="admin-order-row">
                    <td>{order.customerName}</td>
                    <td>{order.total}</td>
                    <td>
                      <select
                        data-testid="admin-order-status"
                        value={order.status}
                        onChange={(e) => handleSetOrderStatus(order.id, e.target.value)}
                      >
                        {['pending_payment', 'paid', 'shipped', 'cancelled'].map(status => (
                          <option key={status} value={status}>
                            {t(STATUS_LABELS[status])}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>{t('لا توجد بيانات')}</p>
        )
      )}
    </section>
  );
}
