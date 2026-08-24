import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Eye, Calendar, User, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import SalesOrderDetailModal from '../components/SalesOrderDetailModal';

export default function SalesHistory() {
  const now = new Date();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Month & Year Filter State
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [paymentStatusFilter, selectedMonth, selectedYear]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (paymentStatusFilter) params.append('payment_status', paymentStatusFilter);
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedYear) params.append('year', selectedYear);

      const res = await fetch(`/api/sales-orders?${params.toString()}`);
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

  const handleResetCurrentMonth = () => {
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setPaymentStatusFilter('');
  };

  const handleViewDetail = (id) => {
    setSelectedOrderId(id);
    setIsDetailOpen(true);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="card-title">
            <ShoppingBag color="#059669" size={24} />
            Lịch Sử Đơn Bán Hàng & Phân Bổ FIFO
          </div>

          {/* Month, Year & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            
            {/* Month selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Tháng:</span>
              <select
                className="table-input"
                style={{ width: '120px', padding: '0.45rem 0.65rem', fontWeight: 700 }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">Tất cả tháng</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>

            {/* Year selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Năm:</span>
              <select
                className="table-input"
                style={{ width: '110px', padding: '0.45rem 0.65rem', fontWeight: 700 }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              >
                {[2026, 2025, 2024, 2023].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>

            {/* Payment Status selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700 }}>Thanh toán:</span>
              <select
                className="table-input"
                style={{ width: '160px', padding: '0.45rem 0.65rem', fontWeight: 600 }}
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
              >
                <option value="">Tất cả đơn bán</option>
                <option value="paid">🟢 Đã thanh toán</option>
                <option value="partial">🟡 Trả một phần</option>
                <option value="unpaid">🔴 Chưa thanh toán</option>
              </select>
            </div>

            <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }} onClick={handleResetCurrentMonth}>
              <RefreshCw size={14} /> Tháng Hiện Tại
            </button>

          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải danh sách đơn bán hàng...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <ShoppingBag size={48} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>Không có đơn bán hàng nào trong khoảng thời gian được chọn.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Mã Đơn</th>
                  <th>Tên Khách Hàng</th>
                  <th>SĐT Khách</th>
                  <th>Ngày Bán</th>
                  <th>Số Lượng SP</th>
                  <th>Tổng Tiền (đ)</th>
                  <th>Đã Trả (đ)</th>
                  <th>Trạng Thái</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700, color: '#064e3b' }}>#{o.id}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{o.customer_name}</td>
                    <td>{o.customer_phone || 'Chưa có SĐT'}</td>
                    <td>
                      <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: '#64748b' }} />
                      {new Date(o.sale_date || o.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td>{o.item_count} sản phẩm</td>
                    <td style={{ fontWeight: 700, color: '#064e3b' }}>{o.total_amount.toLocaleString('vi-VN')} đ</td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>{o.paid_amount.toLocaleString('vi-VN')} đ</td>
                    <td>
                      {o.payment_status === 'paid' && (
                        <span className="badge badge-confirmed">
                          <CheckCircle2 size={12} /> Đã Trả Hết
                        </span>
                      )}
                      {o.payment_status === 'partial' && (
                        <span className="badge badge-pending">
                          <Clock size={12} /> Trả 1 Phần (Còn {o.remaining_debt.toLocaleString('vi-VN')}đ)
                        </span>
                      )}
                      {o.payment_status === 'unpaid' && (
                        <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                          <AlertCircle size={12} /> Ghi Nợ (Nợ {o.total_amount.toLocaleString('vi-VN')}đ)
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => handleViewDetail(o.id)}
                      >
                        <Eye size={14} /> Chi tiết FIFO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal View Detail with FIFO allocation */}
      <SalesOrderDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        salesOrderId={selectedOrderId}
        onRefresh={fetchOrders}
      />
    </div>
  );
}
