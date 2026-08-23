import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit, AlertCircle } from 'lucide-react';

export default function CustomerFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || '',
        phone: initialData.phone || ''
      });
    } else {
      setFormData({
        full_name: '',
        phone: ''
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError('Họ và tên khách hàng không được để trống');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isEdit = !!initialData;
      const url = isEdit ? `/api/customers/${initialData.id}` : '/api/customers';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        onSave();
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
            {initialData ? <Edit size={24} color="#a7f3d0" /> : <UserPlus size={24} color="#a7f3d0" />}
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {initialData ? 'Chỉnh Sửa Thông Tin Khách Hàng' : 'Thêm Khách Hàng Mới'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                {initialData ? `Mã KH: #${initialData.id}` : 'Nhập thông tin khách hàng mua sản phẩm Herbalife'}
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

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Họ Và Tên Khách Hàng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="table-input"
                placeholder="VD: Nguyễn Văn A, Trương Thị Mỹ Hạnh..."
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Số Điện Thoại (Optional)
              </label>
              <input
                type="tel"
                className="table-input"
                placeholder="VD: 0983827919, 0905123456..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : (initialData ? 'Cập Nhật' : 'Tạo Khách Hàng')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
