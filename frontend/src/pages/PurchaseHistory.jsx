import React, { useState, useEffect } from 'react';
import { History, FileText, CheckCircle, Clock, Eye, X, Calendar, User } from 'lucide-react';

export default function PurchaseHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = '/api/purchase-orders';
      if (statusFilter) {
        url += `?status=${statusFilter}`;
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
        <div className="card-header">
          <div className="card-title">
            <History color="#059669" size={24} />
            Lịch Sử Nhập Hàng
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Lọc theo trạng thái:</span>
            <select
              className="table-input"
              style={{ width: '180px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tất cả đơn nhập</option>
              <option value="confirmed">Đã xác nhận (Cộng kho)</option>
              <option value="pending_confirmation">Chờ xác nhận</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Đang tải lịch sử...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <FileText size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>Chưa có đơn nhập hàng nào trong hệ thống.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Mã Đơn</th>
                  <th>Ngày Nhập (Real-time)</th>
                  <th>Trạng Thái</th>
                  <th>Số Dòng SP</th>
                  <th>Người Tạo</th>
                  <th>Tổng Tiền (gồm thuế)</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Chi Tiết</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 700, color: '#064e3b' }}>#{order.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <Calendar size={14} color="#64748b" />
                        {new Date(order.import_date || order.created_at).toLocaleString('vi-VN')}
                      </div>
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
                          Đã Huỷ
                        </span>
                      )}
                    </td>
                    <td>{order.item_count || 0} mặt hàng</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <User size={14} color="#64748b" />
                        {order.created_by || 'Chủ shop'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#059669', fontSize: '1rem' }}>
                      {order.total_amount ? order.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => handleViewDetail(order.id)}
                      >
                        <Eye size={14} /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={24} color="#a7f3d0" />
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Chi Tiết Đơn Nhập Hàng #{selectedOrder.id}</h2>
                  <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                    {new Date(selectedOrder.import_date || selectedOrder.created_at).toLocaleString('vi-VN')}
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

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Trạng Thái:</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {selectedOrder.status === 'confirmed' ? (
                      <span className="badge badge-confirmed"><CheckCircle size={12} /> Đã Nhập Kho</span>
                    ) : (
                      <span className="badge badge-pending"><Clock size={12} /> Chờ Xác Nhận</span>
                    )}
                  </div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#047857' }}>Tổng Tiền Đơn Nhập:</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#064e3b', marginTop: '0.25rem' }}>
                    {selectedOrder.total_amount ? selectedOrder.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0f172a' }}>
                Danh sách dòng sản phẩm:
              </h4>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã SP</th>
                      <th>Tên Sản Phẩm</th>
                      <th>ĐVT</th>
                      <th>Số Lượng</th>
                      <th>Đơn Giá Gốc</th>
                      <th>Giá Nhập (8% VAT)</th>
                      <th>Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td style={{ fontWeight: 600 }}>{item.product_code || item.product_code_raw}</td>
                        <td>{item.product_name || item.product_name_raw}</td>
                        <td>{item.unit || 'EA'}</td>
                        <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                        <td>{item.unit_price_before_tax ? item.unit_price_before_tax.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                        <td style={{ color: '#047857', fontWeight: 600 }}>
                          {item.import_price ? item.import_price.toLocaleString('vi-VN') + ' đ' : '-'}
                        </td>
                        <td style={{ color: '#064e3b', fontWeight: 700 }}>
                          {((item.quantity || 0) * (item.import_price || 0)).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
