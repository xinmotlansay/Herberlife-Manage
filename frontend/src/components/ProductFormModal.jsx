import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Edit, AlertCircle } from 'lucide-react';

export default function ProductFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    product_code: '',
    product_name: '',
    unit: 'EA',
    image_url: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        product_code: initialData.product_code || '',
        product_name: initialData.product_name || '',
        unit: initialData.unit || 'EA',
        image_url: initialData.image_url || '',
        status: initialData.status || 'active'
      });
    } else {
      setFormData({
        product_code: '',
        product_name: '',
        unit: 'EA',
        image_url: '',
        status: 'active'
      });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product_code.trim() || !formData.product_name.trim()) {
      setError('Mã SP và Tên sản phẩm không được để trống');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isEdit = !!initialData;
      const url = isEdit ? `/api/products/${initialData.id}` : '/api/products';
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
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {initialData ? <Edit size={24} color="#a7f3d0" /> : <PackagePlus size={24} color="#a7f3d0" />}
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {initialData ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Thêm Sản Phẩm Mới Thủ Công'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>
                {initialData ? `Mã SP: ${initialData.product_code}` : 'Tạo mới danh mục sản phẩm vào kho'}
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
                Mã Số Sản Phẩm (Product Code) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="table-input"
                placeholder="VD: 0065, 0146, 4T89..."
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Tên Sản Phẩm <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="table-input"
                placeholder="VD: Herbalifeline, Niteworks..."
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  Đơn Vị Tính (Unit)
                </label>
                <input
                  type="text"
                  className="table-input"
                  placeholder="EA, cái, hộp, thùng..."
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>

              {initialData && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Trạng Thái Kinh Doanh
                  </label>
                  <select
                    className="table-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">🟢 Đang Kinh Doanh</option>
                    <option value="inactive">⚪ Ngừng Kinh Doanh (Soft Delete)</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Link Ảnh Sản Phẩm (Optional)
              </label>
              <input
                type="url"
                className="table-input"
                placeholder="https://..."
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Để trống nếu không có ảnh nhận diện (ảnh sẽ hiển thị icon mặc định).
              </p>
            </div>

            <div style={{
              backgroundColor: '#ecfdf5',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              color: '#065f46',
              border: '1px solid #a7f3d0'
            }}>
              💡 <strong>Lưu ý:</strong> Số lượng tồn kho được tự động cộng khi Nhập hàng theo hoá đơn và giảm khi Bán hàng theo cơ chế FIFO. Không chỉnh sửa tồn kho thủ công.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Huỷ
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : (initialData ? 'Cập Nhật' : 'Tạo Sản Phẩm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
