import React, { useState } from 'react';
import { X, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess, order }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const remaining = Math.max(0, order.total_amount - order.paid_amount);

  const handlePayFull = () => {
    setAmount(remaining.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payNum = parseFloat(amount);

    if (!payNum || payNum <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ (> 0)');
      return;
    }

    if (payNum > remaining) {
      setError(`Số tiền vượt quá số tiền nợ còn lại (${remaining.toLocaleString('vi-VN')} đ)`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/sales-orders/${order.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payNum, note })
      });

      const data = await res.json();

      if (data.success) {
        onPaymentSuccess();
        onClose();
      } else {
        setError(data.error || 'Đã có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DollarSign size={24} color="#a7f3d0" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Ghi Nhận Thanh Toán Đơn Bán #{order.id}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                Khách hàng: {order.customer_name || 'Khách hàng'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div style={{
              backgroundColor: '#ecfdf5',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid #a7f3d0',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Đơn Hàng</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#064e3b' }}>
                  {order.total_amount.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Còn Nợ Lại</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e' }}>
                  {remaining.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Số Tiền Thu Nợ (đ) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handlePayFull}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Trả hết nợ ({remaining.toLocaleString('vi-VN')}đ)
                </button>
              </div>

              <input
                type="number"
                min="1"
                max={remaining}
                className="table-input"
                placeholder="Nhập số tiền trả..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Ghi Chú Thanh Toán (Optional)
              </label>
              <input
                type="text"
                className="table-input"
                placeholder="VD: Chuyển khoản Vietcombank, tiền mặt..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang ghi nhận...' : 'Xác Nhận Thanh Toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
