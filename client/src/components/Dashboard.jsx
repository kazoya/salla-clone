import React, { useState, useEffect } from 'react';
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
      <h2>لوحة التحكم</h2>
      <div>
        <p data-testid="stat-stores">المتاجر: {stats.storeCount}</p>
        <p data-testid="stat-products">المنتجات: {stats.productCount}</p>
        <p data-testid="stat-orders">الطلبات: {stats.orderCount}</p>
        <p data-testid="stat-revenue">الإيرادات: {stats.paidRevenue} ريال</p>
      </div>
      <h3>طلباتي</h3>
      <ul>
        {orders.map(order => (
          <li key={order.id} data-testid="dash-order">
            <p>التاريخ: {new Date(order.createdAt).toLocaleDateString()}</p>
            <p>اسم العميل: {order.customerName}</p>
            <p>رقم الهاتف: {order.phone}</p>
            <ul>
              {order.items.map(item => (
                <li key={item.productId}>{item.productName} x {item.qty}</li>
              ))}
            </ul>
            <p>الإجمالي: {order.ownerTotal} ريال</p>
            <p>الحالة: {order.status === 'pending_payment' ? 'بانتظار الدفع' : order.status === 'paid' ? 'مدفوع' : 'تم الشحن'}</p>
            {order.status === 'paid' && (
              <button data-testid="ship-order" onClick={() => handleShipOrder(order.id)}>تم الشحن</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
