import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X, PackagePlus, DollarSign, Layers, Calendar } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, summary, loading }) {
  // Default to current local date-time formatted as YYYY-MM-DDTHH:mm
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDateTime = now.toISOString().slice(0, 16);

  const [importDate, setImportDate] = useState(defaultDateTime);

  if (!isOpen) return null;

  const { totalItems, newProductsCount, totalAmount } = summary;

  const handleConfirmClick = () => {
    onConfirm(importDate);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={28} color="#a7f3d0" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Xác Nhận Nhập Hàng Vào Kho</h2>
              <p style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>Chọn ngày giờ nhập kho (Hỗ trợ nhập bổ sung tháng trước)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          
          {/* Backdated Import Date Selector Box */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1.5px solid #60a5fa',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.4rem' }}>
              <Calendar size={18} color="#2563eb" />
              Ngày Giờ Nhập Kho (Chọn lùi ngày bổ sung cho tháng trước):
            </label>
            <input
              type="datetime-local"
              className="table-input"
              style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#1e3a8a', backgroundColor: '#ffffff' }}
              value={importDate}
              onChange={(e) => setImportDate(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem', display: 'block' }}>
              💡 Nếu bạn đang nhập bổ sung hàng cho các tháng trước (VD: Tháng 7/2026), vui lòng chọn ngày giờ trong tháng đó.
            </span>
          </div>

          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                  <Layers size={18} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Tổng dòng SP</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#064e3b' }}>{totalItems}</div>
              </div>

              <div>
                <div style={{ color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                  <PackagePlus size={18} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>SP mới chưa có</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e' }}>{newProductsCount}</div>
              </div>

              <div>
                <div style={{ color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                  <DollarSign size={18} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Tổng tiền sau thuế</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                  {totalAmount.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>
          </div>

          {newProductsCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '0.5rem',
              padding: '1rem',
              color: '#92400e',
              fontSize: '0.9rem',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Lưu ý:</strong> Hệ thống sẽ tự động khởi tạo <strong>{newProductsCount} sản phẩm mới</strong> vào danh mục kho và cộng đúng số lượng tồn kho theo ngày nhập đã chọn.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Quay lại kiểm tra
          </button>
          <button className="btn btn-primary" onClick={handleConfirmClick} disabled={loading}>
            {loading ? 'Đang cộng vào kho...' : 'Xác Nhận Nhập Kho'}
          </button>
        </div>
      </div>
    </div>
  );
}
