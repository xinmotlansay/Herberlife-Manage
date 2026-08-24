import React, { useState, useEffect } from 'react';
import { History, FileText, CheckCircle, Clock, Eye, X, Calendar, User, RefreshCw } from 'lucide-react';

export default function PurchaseHistory() {
  const now = new Date();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Month & Year Filter State
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, selectedMonth, selectedYear]);

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

  return (
    <div>
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="card-title">
            <History color="#059669" size={24} />
            Lịch Sử Nhập Hàng
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
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <FileText size={48} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>Không có đơn nhập hàng nào trong khoảng thời gian được chọn.</p>
          </div>
        ) : (
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
                {orders.map(order => (
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
        )}
      </div>

      {/* Modal View Detail */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={24} color="#a7f3d0" />
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    Chi Tiết Đơn Nhập Hàng #{selectedOrder.id}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                    Ngày nhập: {new Date(selectedOrder.import_date || selectedOrder.created_at).toLocaleString('vi-VN')}
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

            <div className="modal-body">
              <div className="table-container" style={{ marginBottom: '1rem' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Mã SP</th>
                      <th>Tên Sản Phẩm</th>
                      <th>ĐVT</th>
                      <th>Số Lượng</th>
                      <th>Đơn Giá Trước Thuế</th>
                      <th>Thuế VAT</th>
                      <th>Giá Nhập (gồm thuế)</th>
                      <th>Thành Tiền (đ)</th>
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
                          <td style={{ fontWeight: 700, color: '#064e3b' }}>{item.product_code_raw || item.product_code}</td>
                          <td>{item.product_name_raw || item.product_name}</td>
                          <td>{item.unit || 'EA'}</td>
                          <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                          <td>{item.unit_price_before_tax ? item.unit_price_before_tax.toLocaleString('vi-VN') + 'đ' : '-'}</td>
                          <td>{item.tax_rate || 8}%</td>
                          <td style={{ fontWeight: 600, color: '#047857' }}>{importPrice.toLocaleString('vi-VN')}đ</td>
                          <td style={{ fontWeight: 700, color: '#064e3b' }}>{lineTotal.toLocaleString('vi-VN')}đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ textAlign: 'right', padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: '#047857' }}>Tổng Tiền Nhập Hàng: </span>
                <strong style={{ fontSize: '1.25rem', color: '#064e3b', marginLeft: '0.5rem' }}>
                  {selectedOrder.total_amount ? selectedOrder.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </strong>
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
