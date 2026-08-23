import React, { useState, useEffect } from 'react';
import { X, User, ShoppingBag, DollarSign, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import PaymentModal from './PaymentModal';

export default function CustomerDetailModal({ isOpen, onClose, customerId, onRefresh }) {
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  useEffect(() => {
    if (customerId && isOpen) {
      fetchCustomerDetails();
    }
  }, [customerId, isOpen]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (data.success) {
        setCustomerDetails(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleOpenPayment = (order) => {
    setSelectedOrder({
      ...order,
      customer_name: customerDetails ? customerDetails.full_name : ''
    });
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchCustomerDetails();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={26} color="#a7f3d0" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {customerDetails ? customerDetails.full_name : 'Chi Tiết Khách Hàng'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                {customerDetails && customerDetails.phone ? `SĐT: ${customerDetails.phone}` : 'Chưa có SĐT'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>Đang tải lịch sử...</div>
          ) : !customerDetails ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>Không tìm thấy dữ liệu</div>
          ) : (
            <div>
              {/* Summary Debt Header */}
              <div style={{
                backgroundColor: customerDetails.total_debt > 0 ? '#fffbeb' : '#ecfdf5',
                border: `1px solid ${customerDetails.total_debt > 0 ? '#fde68a' : '#a7f3d0'}`,
                borderRadius: '0.75rem',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                textAlign: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Đơn Đã Mua</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                    {customerDetails.orders ? customerDetails.orders.length : 0} Đơn
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: customerDetails.total_debt > 0 ? '#b45309' : '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Công Nợ</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: customerDetails.total_debt > 0 ? '#92400e' : '#059669' }}>
                    {customerDetails.total_debt.toLocaleString('vi-VN')} đ
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Trạng Thái Công Nợ</span>
                  <div style={{ marginTop: '0.25rem' }}>
                    {customerDetails.total_debt > 0 ? (
                      <span className="badge badge-pending">Đang Nợ Tiền</span>
                    ) : (
                      <span className="badge badge-confirmed">Đã Thanh Toán Hết</span>
                    )}
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                Lịch Sử Mua Hàng & Thanh Toán:
              </h4>

              {!customerDetails.orders || customerDetails.orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                  <ShoppingBag size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                  <p>Khách hàng chưa có đơn mua hàng nào.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {customerDetails.orders.map(order => (
                    <div
                      key={order.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.75rem',
                        padding: '1.25rem',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem', color: '#064e3b' }}>Đơn Bán #{order.id}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.75rem' }}>
                            <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                            {new Date(order.sale_date || order.created_at).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div>
                          {order.payment_status === 'paid' && (
                            <span className="badge badge-confirmed"><CheckCircle2 size={12} /> Đã Thanh Toán</span>
                          )}
                          {order.payment_status === 'partial' && (
                            <span className="badge badge-pending"><Clock size={12} /> Trả Một Phần</span>
                          )}
                          {order.payment_status === 'unpaid' && (
                            <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                              <AlertCircle size={12} /> Chưa Thanh Toán
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Line items table */}
                      <div className="table-container" style={{ marginBottom: '0.75rem' }}>
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Sản Phẩm</th>
                              <th>Số Lượng</th>
                              <th>Đơn Giá Bán</th>
                              <th>Thành Tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items && order.items.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.product_name} ({item.product_code})</td>
                                <td>{item.quantity}</td>
                                <td>{item.selling_price ? item.selling_price.toLocaleString('vi-VN') + ' đ' : '-'}</td>
                                <td style={{ fontWeight: 600, color: '#047857' }}>
                                  {((item.quantity || 0) * (item.selling_price || 0)).toLocaleString('vi-VN')} đ
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Payment Progress Bar & Action */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #f1f5f9'
                      }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: '#64748b' }}>Tổng: </span>
                          <strong style={{ color: '#0f172a' }}>{order.total_amount.toLocaleString('vi-VN')}đ</strong>
                          <span style={{ color: '#64748b', marginLeft: '1rem' }}>Đã trả: </span>
                          <strong style={{ color: '#059669' }}>{order.paid_amount.toLocaleString('vi-VN')}đ</strong>
                          {order.remaining_debt > 0 && (
                            <>
                              <span style={{ color: '#64748b', marginLeft: '1rem' }}>Còn nợ: </span>
                              <strong style={{ color: '#d97706' }}>{order.remaining_debt.toLocaleString('vi-VN')}đ</strong>
                            </>
                          )}
                        </div>

                        {order.remaining_debt > 0 && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                            onClick={() => handleOpenPayment(order)}
                          >
                            <DollarSign size={14} /> Ghi Nhận Thanh Toán
                          </button>
                        )}
                      </div>

                      {/* Payment History Log */}
                      {order.payments && order.payments.length > 0 && (
                        <div style={{ marginTop: '0.75rem', backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.8rem' }}>
                          <strong style={{ color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Lịch sử đợt trả tiền:</strong>
                          {order.payments.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginTop: '0.15rem' }}>
                              <span>• {new Date(p.payment_date).toLocaleString('vi-VN')} {p.note ? `(${p.note})` : ''}</span>
                              <strong style={{ color: '#059669' }}>+{p.amount.toLocaleString('vi-VN')} đ</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>

      {/* Payment Popup Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        order={selectedOrder}
      />
    </div>
  );
}
