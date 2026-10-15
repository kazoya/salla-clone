import React, { useState, useEffect } from 'react';
import { t } from '../i18n';
import { getMyStats, getMyOrders, shipOrder } from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({ storeCount: 0, productCount: 0, orderCount: 0, paidRevenue: 0 });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatsAndOrders = async () => {
      try {
        const statsData = await getMyStats();
        const ordersData = await getMyOrders();
        setStats(statsData);
        setOrders(ordersData);
      } catch (error) {
        setError(error.message);
      }
    };
    fetchStatsAndOrders();
  }, []);

  const handleShipOrder = async (orderId) => {
    try {
      await shipOrder(orderId);
      const updatedOrders = await getMyOrders();
      setOrders(updatedOrders);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      {error && <p data-testid="error-message">{error}</p>}
      <h2>{t('لوحة التحكم')}</h2>
      <div>
        <p data-testid="stat-stores">{t('المتاجر:')} {stats.storeCount}</p>
        <p data-testid="stat-products">{t('المنتجات:')} {stats.productCount}</p>
        <p data-testid="stat-orders">{t('الطلبات:')} {stats.orderCount}</p>
        <p data-testid="stat-revenue">{t('الإيرادات:')} {stats.paidRevenue} {t('ريال')}</p>
      </div>
      <h3>{t('طلباتي')}</h3>
      <ul>
        {orders.map(order => (
          <li key={order.id} data-testid="dash-order">
            <p>{t('التاريخ:')} {new Date(order.createdAt).toLocaleDateString()}</p>
            <p>{t('اسم العميل:')} {order.customerName}</p>
            <p>{t('رقم الهاتف:')} {order.phone}</p>
            <ul>
              {order.items.map(item => (
                <li key={item.productId}>{item.productName} x {item.qty}</li>
              ))}
            </ul>
            <p>{t('الإجمالي:')} {order.ownerTotal} {t('ريال')}</p>
            <p>{t('الحالة:')} {order.status === 'pending_payment' ? t('بانتظار الدفع') : order.status === 'paid' ? t('مدفوع') : t('تم الشحن')}</p>
            {order.status === 'paid' && (
              <button data-testid="ship-order" onClick={() => handleShipOrder(order.id)}>{t('تم الشحن')}</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
