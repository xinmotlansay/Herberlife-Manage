import React, { useState, useEffect } from 'react';
import { Package, Search, ImageOff, Layers, CheckCircle2 } from 'lucide-react';

export default function InventoryView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [searchTerm]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/api/products';
      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Package color="#059669" size={24} />
            Danh Mục Kho Sản Phẩm Herbalife
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Tìm tên hoặc mã SP..."
                className="table-input"
                style={{ paddingLeft: '2.2rem', width: '240px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Đang tải danh sách kho...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <Package size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>Chưa có sản phẩm nào trong kho. Hãy nhập hàng để tạo sản phẩm mới.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Hình Ảnh</th>
                  <th style={{ width: '110px' }}>Mã SP</th>
                  <th>Tên Sản Phẩm</th>
                  <th style={{ width: '80px' }}>ĐVT</th>
                  <th style={{ width: '130px' }}>Số Lượng Tồn Kho</th>
                  <th style={{ width: '140px' }}>Trạng Thái Kho</th>
                  <th>Thời Gian Cập Nhật</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr key={prod.id}>
                    <td>
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.product_name}
                          style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8'
                        }} title="Không có ảnh nhận diện (Tạo từ OCR)">
                          <ImageOff size={18} />
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: '#064e3b' }}>{prod.product_code}</td>
                    <td style={{ fontWeight: 600 }}>{prod.product_name}</td>
                    <td>{prod.unit || 'cái'}</td>
                    <td>
                      <span style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: prod.quantity > 0 ? '#059669' : '#ef4444'
                      }}>
                        {prod.quantity}
                      </span>
                    </td>
                    <td>
                      {prod.quantity > 5 && (
                        <span className="badge badge-confirmed">
                          <CheckCircle2 size={12} /> Còn Hàng
                        </span>
                      )}
                      {prod.quantity > 0 && prod.quantity <= 5 && (
                        <span className="badge badge-pending">Sắp Hết</span>
                      )}
                      {prod.quantity === 0 && (
                        <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                          Hết Hàng
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(prod.updated_at || prod.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
