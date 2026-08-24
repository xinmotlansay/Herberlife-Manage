import React, { useState, useEffect } from 'react';
import { History, FileText, CheckCircle, Clock, Eye, X, Calendar, User, RefreshCw, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export default function PurchaseHistory() {
  const now = new Date();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Month & Year Filter State
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, selectedMonth, selectedYear]);

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedMonth, selectedYear, searchQuery, itemsPerPage]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedYear) params.append('year', selectedYear);

      const res = await fetch(`/api/purchase-orders?${params.toString()}`);
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
    setStatusFilter('');
    setSearchQuery('');
  };

  const handleViewDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filter orders by search query (Order ID, created_by)
  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const orderId = `#${o.id}`;
    const createdBy = (o.created_by || '').toLowerCase();
    const type = o.invoice_image_url ? 'ocr' : 'thủ công';
    return orderId.includes(q) || createdBy.includes(q) || type.includes(q);
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
            <History color="#059669" size={24} />
            Lịch Sử Nhập Hàng Kho
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
                placeholder="Tìm mã đơn nhập..."
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

            {/* Status selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 700 }}>Trạng thái:</span>
              <select
                className="table-input"
                style={{ width: '150px', padding: '0.45rem 0.65rem', fontWeight: 600 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="confirmed">Đã nhập kho</option>
                <option value="pending_confirmation">Chờ xác nhận</option>
                <option value="cancelled">Đã huỷ</option>
              </select>
            </div>

            <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }} onClick={handleResetCurrentMonth}>
              <RefreshCw size={14} /> Tháng Hiện Tại
            </button>

          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Đang tải lịch sử đơn nhập kho...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <FileText size={48} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>Không có đơn nhập hàng nào trong khoảng thời gian hoặc từ khoá tìm kiếm.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Mã Đơn</th>
                    <th>Loại Đơn Nhập</th>
                    <th>Ngày Nhập Kho</th>
                    <th>Số Mặt Hàng</th>
                    <th>Tổng Tiền Nhập (đ)</th>
                    <th>Trạng Thái</th>
                    <th>Người Tạo</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 700, color: '#064e3b' }}>#{order.id}</td>
                      <td>
                        {order.invoice_image_url ? (
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>📄 Quét VAT (OCR)</span>
                        ) : (
                          <span style={{ color: '#d97706', fontWeight: 600 }}>✏️ Nhập thủ công</span>
                        )}
                      </td>
                      <td>
                        <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: '#64748b' }} />
                        {new Date(order.import_date || order.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td>{order.item_count} mặt hàng</td>
                      <td style={{ fontWeight: 700, color: '#047857' }}>
                        {order.total_amount ? order.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                      </td>
                      <td>
                        {order.status === 'confirmed' && (
                          <span className="badge badge-confirmed">
                            <CheckCircle size={12} /> Đã Nhập Kho
                          </span>
                        )}
                        {order.status === 'pending_confirmation' && (
                          <span className="badge badge-pending">
                            <Clock size={12} /> Chờ Xác Nhận
                          </span>
                        )}
                        {order.status === 'cancelled' && (
                          <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                            X Đã Huỷ
                          </span>
                        )}
                      </td>
                      <td>{order.created_by || 'Chủ shop'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleViewDetail(order.id)}
                        >
                          <Eye size={14} /> Chi tiết
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
                Hiển thị <strong>{startIndex + 1}</strong> - <strong>{endIndex}</strong> trên tổng <strong>{totalItems}</strong> đơn nhập
              </div>

              {/* Page Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
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
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
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

      {/* Modal View Detail */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '920px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={26} color="#a7f3d0" />
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    Chi Tiết Đơn Nhập Hàng #{selectedOrder.id}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                    Ngày nhập kho: {new Date(selectedOrder.import_date || selectedOrder.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '1.25rem' }}>
              {selectedOrder.invoice_image_url && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
                    📄 Hoá đơn này được tải lên từ file/ảnh gốc
                  </span>
                  <a
                    href={selectedOrder.invoice_image_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Xem hoá đơn gốc <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <div className="table-container" style={{ marginBottom: '1rem', overflowX: 'auto' }}>
                <table className="custom-table" style={{ minWidth: '820px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th style={{ width: '100px' }}>Mã SP</th>
                      <th>Tên Sản Phẩm</th>
                      <th style={{ width: '60px' }}>ĐVT</th>
                      <th style={{ width: '80px' }}>Số Lượng</th>
                      <th style={{ width: '130px' }}>Đơn Giá Trước Thuế</th>
                      <th style={{ width: '70px' }}>Thuế</th>
                      <th style={{ width: '130px' }}>Giá Nhập (gồm thuế)</th>
                      <th style={{ width: '140px' }}>Thành Tiền (đ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items && selectedOrder.items.map((item, idx) => {
                      const qty = item.quantity;
                      const importPrice = item.import_price || 0;
                      const lineTotal = qty * importPrice;
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 800, color: '#064e3b' }}>{item.product_code_raw || item.product_code || '-'}</td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name_raw || item.product_name || '-'}</td>
                          <td>{item.unit || 'EA'}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.quantity}</td>
                          <td>{item.unit_price_before_tax ? item.unit_price_before_tax.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                          <td>{item.tax_rate || 8}%</td>
                          <td style={{ fontWeight: 600, color: '#047857' }}>{importPrice.toLocaleString('vi-VN')} đ</td>
                          <td style={{ fontWeight: 700, color: '#064e3b' }}>{lineTotal.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Order Total */}
              <div style={{
                padding: '1rem 1.25rem',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 600 }}>
                  Trạng thái: <span className="badge badge-confirmed" style={{ marginLeft: '4px' }}>{selectedOrder.status === 'confirmed' ? 'Đã Nhập Kho' : selectedOrder.status}</span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.88rem', color: '#047857', fontWeight: 600 }}>Tổng Tiền Nhập Kho: </span>
                  <strong style={{ fontSize: '1.35rem', color: '#064e3b', marginLeft: '0.5rem' }}>
                    {selectedOrder.total_amount ? selectedOrder.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
