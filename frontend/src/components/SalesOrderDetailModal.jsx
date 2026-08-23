import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Layers, Calendar, User, DollarSign, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function SalesOrderDetailModal({ isOpen, onClose, orderId }) {
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId && isOpen) {
      fetchOrderDetail();
    }
  }, [orderId, isOpen]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setOrderDetail(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '840px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingBag size={24} color="#a7f3d0" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Chi Tiết Đơn Bán Hàng #{orderId}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                {orderDetail ? `Khách hàng: ${orderDetail.customer_name}` : 'Đang tải...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Đang tải chi tiết...</div>
          ) : !orderDetail ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>Không tìm thấy đơn hàng</div>
          ) : (
            <div>
              {/* Order Info Cards */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                textAlign: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Ngày Bán</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                    {new Date(orderDetail.sale_date || orderDetail.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Tiền Đơn</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#064e3b', marginTop: '0.2rem' }}>
                    {orderDetail.total_amount.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Đã Thanh Toán</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                    {orderDetail.paid_amount.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Trạng Thái</span>
                  <div style={{ marginTop: '0.2rem' }}>
                    {orderDetail.payment_status === 'paid' && <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Đã Trả Hết</span>}
                    {orderDetail.payment_status === 'partial' && <span className="badge badge-pending"><Clock size={12} /> Trả Một Phần</span>}
                    {orderDetail.payment_status === 'unpaid' && <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}><AlertCircle size={12} /> Chưa Trả</span>}
                  </div>
                </div>
              </div>

              {/* Items & FIFO Traceability */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                Chi tiết sản phẩm bán & Truy vết phân bổ kho FIFO:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orderDetail.items && orderDetail.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#064e3b' }}>
                        {item.product_name} ({item.product_code})
                      </strong>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        Bán: {item.quantity} {item.unit} x {item.selling_price.toLocaleString('vi-VN')}đ = {(item.quantity * item.selling_price).toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      Giá vốn xuất kho thực tế (FIFO): <strong style={{ color: '#047857' }}>{item.cost_of_goods_sold ? item.cost_of_goods_sold.toLocaleString('vi-VN') + ' đ' : '0 đ'}</strong>
                      <span style={{ marginLeft: '1rem', color: '#059669', fontWeight: 600 }}>
                        Lợi nhuận gộp dòng này: {((item.quantity * item.selling_price) - item.cost_of_goods_sold).toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    {/* FIFO Allocation Trace */}
                    {item.allocations && item.allocations.length > 0 && (
                      <div style={{ backgroundColor: '#ecfdf5', borderRadius: '0.5rem', padding: '0.65rem', border: '1px solid #a7f3d0' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Layers size={14} /> Chi tiết trừ lô hàng FIFO:
                        </div>
                        {item.allocations.map(alloc => (
                          <div key={alloc.id} style={{ fontSize: '0.8rem', color: '#065f46', display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                            <span>• Lấy <strong>{alloc.quantity_taken} {item.unit}</strong> từ Lô #{alloc.batch_id} (Nhập ngày {new Date(alloc.import_date).toLocaleDateString('vi-VN')})</span>
                            <span>Giá vốn lô: <strong>{alloc.unit_cost.toLocaleString('vi-VN')} đ/cái</strong></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
