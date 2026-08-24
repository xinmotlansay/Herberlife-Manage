import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Eye, Calendar, User, CheckCircle2, Clock, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import SalesOrderDetailModal from '../components/SalesOrderDetailModal';

export default function SalesHistory() {
  const now = new Date();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');

  // Month & Year Filter State
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [paymentStatusFilter, selectedMonth, selectedYear]);

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [paymentStatusFilter, selectedMonth, selectedYear, searchQuery, itemsPerPage]);

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
    setSearchQuery('');
  };

  const handleViewDetail = (id) => {
    setSelectedOrderId(id);
    setIsDetailOpen(true);
  };

  // Filter orders by search query (Customer name or phone or order ID)
  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const customerName = (o.customer_name || '').toLowerCase();
    const customerPhone = (o.customer_phone || '').toLowerCase();
    const orderId = `#${o.id}`;
    return customerName.includes(q) || customerPhone.includes(q) || orderId.includes(q);
  });

  // Calculate Pagination slice
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <div>
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="card-title">
            <ShoppingBag color="#059669" size={24} />
            Lịch Sử Đơn Bán Hàng & Phân Bổ FIFO
          </div>

          {/* Search, Month, Year & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="table-input"
                style={{ paddingLeft: '2.1rem', width: '180px', fontSize: '0.85rem' }}
                placeholder="Tìm mã đơn, tên, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

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
                style={{ width: '150px', padding: '0.45rem 0.65rem', fontWeight: 600 }}
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
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <ShoppingBag size={48} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>Không có đơn bán hàng nào trong khoảng thời gian hoặc từ khoá tìm kiếm.</p>
          </div>
        ) : (
          <>
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
                  {currentOrders.map(o => (
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

            {/* Pagination Controls Footer Bar */}
            <div style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Counter status */}
              <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                Hiển thị <strong>{startIndex + 1}</strong> - <strong>{endIndex}</strong> trên tổng <strong>{totalItems}</strong> đơn bán
              </div>

              {/* Page Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  title="Trang trước"
                >
                  <ChevronLeft size={16} /> Trang trước
                </button>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        borderRadius: '0.375rem',
                        border: page === validCurrentPage ? '1px solid #059669' : '1px solid #cbd5e1',
                        backgroundColor: page === validCurrentPage ? '#059669' : '#ffffff',
                        color: page === validCurrentPage ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  title="Trang sau"
                >
                  Trang sau <ChevronRight size={16} />
                </button>
              </div>

              {/* Items Per Page Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Hiển thị:</span>
                <select
                  className="table-input"
                  style={{ width: '110px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', fontWeight: 600 }}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                >
                  <option value={10}>10 đơn/trang</option>
                  <option value={20}>20 đơn/trang</option>
                  <option value={50}>50 đơn/trang</option>
                  <option value={100}>100 đơn/trang</option>
                </select>
              </div>
            </div>
          </>
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
