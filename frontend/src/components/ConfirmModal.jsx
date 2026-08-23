import React from 'react';
import { AlertTriangle, CheckCircle2, X, PackagePlus, DollarSign, Layers } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, summary, loading }) {
  if (!isOpen) return null;

  const { totalItems, newProductsCount, totalAmount } = summary;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={28} color="#a7f3d0" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Xác Nhận Nhập Hàng Vào Kho</h2>
              <p style={{ fontSize: '0.85rem', color: '#a7f3d0' }}>Vui lòng kiểm tra lại thông tin trước khi xác nhận</p>
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
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem'
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
                <strong>Lưu ý:</strong> Hệ thống sẽ tự động khởi tạo <strong>{newProductsCount} sản phẩm mới</strong> vào danh mục kho với hình ảnh nhận diện trống (NULL) và cộng đúng số lượng tồn kho theo hoá đơn.
              </div>
            </div>
          )}

          <p style={{ fontSize: '0.9rem', color: '#475569', textAlign: 'center' }}>
            Sau khi bấm <strong>"Xác Nhận Nhập Kho"</strong>, số lượng sẽ được cộng trực tiếp vào kho và đơn hàng sẽ không thể chỉnh sửa.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Quay lại kiểm tra
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang cộng vào kho...' : 'Xác Nhận Nhập Kho'}
          </button>
        </div>
      </div>
    </div>
  );
}
