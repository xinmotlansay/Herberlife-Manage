import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Eye, Calendar, User, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import SalesOrderDetailModal from '../components/SalesOrderDetailModal';

export default function SalesHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [paymentStatusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/api/sales-orders';
      if (paymentStatusFilter) {
        url += `?payment_status=${paymentStatusFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (id) => {
    setSelectedOrderId(id);
    setIsDetailOpen(true);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ShoppingBag color="#059669" size={24} />
            Lịch Sử Đơn Bán Hàng & Phân Bổ FIFO
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Lọc trạng thái thanh toán:</span>
            <select
              className="table-input"
              style={{ width: '180px' }}
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="">Tất cả đơn bán</option>
              <option value="paid">🟢 Đã thanh toán</option>
              <option value="partial">🟡 Trả một phần</option>
              <option value="unpaid">🔴 Chưa thanh toán</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Đang tải lịch sử bán hàng...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            <ShoppingBag size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>Chưa có đơn bán hàng nào trong hệ thống.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Mã Đơn</th>
                  <th>Ngày Bán</th>
                  <th>Khách Hàng Mua</th>
                  <th style={{ width: '100px' }}>Số Dòng SP</th>
                  <th>Tổng Tiền Đơn (đ)</th>
                  <th>Đã Thanh Toán (đ)</th>
                  <th>Còn Nợ Lại (đ)</th>
                  <th>Trạng Thái</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700, color: '#064e3b' }}>#{order.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Calendar size={14} color="#64748b" />
                        {new Date(order.sale_date || order.created_at).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} color="#64748b" />
                        {order.customer_name} {order.customer_phone ? `(${order.customer_phone})` : ''}
                      </div>
                    </td>
                    <td>{order.item_count || 0} mặt hàng</td>
                    <td style={{ fontWeight: 800, color: '#064e3b', fontSize: '1rem' }}>
                      {order.total_amount ? order.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>
                      {order.paid_amount ? order.paid_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    <td style={{ fontWeight: 700, color: order.remaining_debt > 0 ? '#d97706' : '#64748b' }}>
                      {order.remaining_debt ? order.remaining_debt.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    <td>
                      {order.payment_status === 'paid' && (
                        <span className="badge badge-confirmed">
                          <CheckCircle2 size={12} /> Đã Trả Hết
                        </span>
                      )}
                      {order.payment_status === 'partial' && (
                        <span className="badge badge-pending">
                          <Clock size={12} /> Trả 1 Phần
                        </span>
                      )}
                      {order.payment_status === 'unpaid' && (
                        <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                          <AlertCircle size={12} /> Chưa Trả
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => handleViewDetail(order.id)}
                      >
                        <Eye size={14} /> Chi Tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales Order Detail & FIFO Trace Modal */}
      <SalesOrderDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        orderId={selectedOrderId}
      />
    </div>
  );
}
