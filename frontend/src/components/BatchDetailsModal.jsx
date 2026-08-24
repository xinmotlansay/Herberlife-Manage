import React, { useState, useEffect } from 'react';
import { X, Layers, Calendar, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BatchDetailsModal({ isOpen, onClose, productId }) {
  const [productDetails, setProductDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId && isOpen) {
      fetchBatches();
    }
  }, [productId, isOpen]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();
      if (data.success) {
        setProductDetails(data.data);
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
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers size={24} color="#a7f3d0" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Chi Tiết Lô Hàng Tồn Kho (FIFO)
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                {productDetails ? `${productDetails.product_name} (#${productDetails.product_code})` : 'Đang tải...'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Đang tải thông tin lô...</div>
          ) : !productDetails || !productDetails.batches || productDetails.batches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
              <AlertCircle size={40} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
              <p>Chưa có lô hàng nhập kho nào cho sản phẩm này.</p>
            </div>
          ) : (
            <div>
              <div style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '0.75rem',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                textAlign: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Tồn Hiện Tại</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#064e3b' }}>
                    {productDetails.quantity} {productDetails.unit || 'cái'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Giá Nhập TB Gia Quyền</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
                    {productDetails.avg_import_price ? productDetails.avg_import_price.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Số Lô Đang Còn Tồn</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#064e3b' }}>
                    {productDetails.batches.filter(b => b.remaining_qty > 0).length} Lô
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                Danh sách các lô hàng (Sắp xếp theo thứ tự ưu tiên xuất kho FIFO):
              </h4>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>Mã Đơn Nhập & Lô</th>
                      <th>Ngày Nhập Kho</th>
                      <th>Số Nhập Ban Đầu</th>
                      <th>Số Còn Tồn</th>
                      <th>Giá Vốn / SP</th>
                      <th>Trạng Thái Lô</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productDetails.batches.map((batch, idx) => (
                      <tr key={batch.id}>
                        <td style={{ fontWeight: 700, color: '#064e3b' }}>
                          Đơn nhập #{batch.purchase_order_id}
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                            (Lô thứ {idx + 1})
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                            <Calendar size={14} color="#64748b" />
                            {new Date(batch.import_date).toLocaleString('vi-VN')}
                          </div>
                        </td>
                        <td>{batch.initial_quantity} {productDetails.unit}</td>
                        <td>
                          <strong style={{ color: batch.remaining_qty > 0 ? '#059669' : '#94a3b8', fontSize: '0.95rem' }}>
                            {batch.remaining_qty}
                          </strong>
                        </td>
                        <td style={{ fontWeight: 600, color: '#047857' }}>
                          {batch.import_price.toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          {batch.remaining_qty > 0 ? (
                            <span className="badge badge-confirmed">
                              <CheckCircle2 size={12} /> Đang Xuất Kho (FIFO #{idx + 1})
                            </span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                              Đã Xuất Hết
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
