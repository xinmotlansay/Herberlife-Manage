import React, { useState, useEffect } from 'react';
import { Package, Search, ImageOff, Plus, Edit, Trash2, Layers, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import ProductFormModal from '../components/ProductFormModal';
import BatchDetailsModal from '../components/BatchDetailsModal';

export default function InventoryView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'inactive', 'all'

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, statusFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `/api/products?status=${statusFilter}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
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

  const handleCreateNew = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (prod) => {
    setEditingProduct(prod);
    setIsFormOpen(true);
  };

  const handleViewBatches = (prodId) => {
    setSelectedProductId(prodId);
    setIsBatchModalOpen(true);
  };

  const handleDelete = async (prod) => {
    if (window.confirm(`Bạn có chắc chắn muốn ngừng kinh doanh sản phẩm "${prod.product_name}" (#${prod.product_code})?\nSản phẩm sẽ được chuyển sang trạng thái Ngừng kinh doanh (Soft Delete) và không thể chọn khi tạo đơn mới.`)) {
      try {
        const res = await fetch(`/api/products/${prod.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchProducts();
        } else {
          alert('Lỗi: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Không thể kết nối máy chủ');
      }
    }
  };

  // Stats calculation
  const totalProducts = products.length;
  const inStockCount = products.filter(p => p.status === 'active' && p.quantity > 5).length;
  const lowStockCount = products.filter(p => p.status === 'active' && p.quantity > 0 && p.quantity <= 5).length;
  const outOfStockCount = products.filter(p => p.status === 'active' && p.quantity === 0).length;

  const totalValue = products.reduce((acc, p) => acc + (p.quantity * (p.avg_import_price || 0)), 0);

  return (
    <div>
      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Loại SP</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{totalProducts}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '0.75rem', color: '#059669' }}>
              <Package size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Còn Hàng ( &gt; 5)</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>{inStockCount}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#d1fae5', borderRadius: '0.75rem', color: '#047857' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Sắp Hết & Hết Hàng</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
                {lowStockCount + outOfStockCount}
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '0.75rem', color: '#b45309' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Ước Tính Giá Trị Kho</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#064e3b', marginTop: '0.2rem' }}>
                {totalValue.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '0.75rem', color: '#059669' }}>
              <Layers size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="card-title">
            <Package color="#059669" size={24} />
            Quản Lý Danh Mục Kho Sản Phẩm Herbalife
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: '0.5rem' }}>
              <button
                className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => setStatusFilter('active')}
              >
                Đang Kinh Doanh
              </button>
              <button
                className={`btn ${statusFilter === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => setStatusFilter('inactive')}
              >
                Ngừng Kinh Doanh
              </button>
              <button
                className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', border: 'none' }}
                onClick={() => setStatusFilter('all')}
              >
                Tất Cả
              </button>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên SP..."
                className="table-input"
                style={{ paddingLeft: '2.2rem', width: '220px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={handleCreateNew}>
              <Plus size={18} />
              Thêm Sản Phẩm Mới
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={24} className="icon" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '0.5rem' }}>Đang tải danh sách kho...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            <Package size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>Không tìm thấy sản phẩm nào phù hợp trong kho.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Ảnh</th>
                  <th style={{ width: '110px' }}>Mã SP</th>
                  <th>Tên Sản Phẩm</th>
                  <th style={{ width: '70px' }}>ĐVT</th>
                  <th style={{ width: '120px' }}>Tồn Kho</th>
                  <th style={{ width: '150px' }}>Giá Nhập TB (Gia Quyền)</th>
                  <th style={{ width: '160px' }}>Ngày Nhập Gần Nhất</th>
                  <th style={{ width: '150px' }}>Tình Trạng Kho</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr key={prod.id} style={{ opacity: prod.status === 'inactive' ? 0.65 : 1 }}>
                    <td>
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.product_name}
                          style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '38px',
                          height: '38px',
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
                    <td>{prod.unit || 'EA'}</td>
                    <td>
                      <span style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: prod.quantity > 5 ? '#059669' : prod.quantity > 0 ? '#d97706' : '#ef4444'
                      }}>
                        {prod.quantity}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#047857' }}>
                      {prod.avg_import_price ? prod.avg_import_price.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(prod.latest_import_date || prod.updated_at || prod.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      {prod.status === 'inactive' ? (
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                          ⚪ Ngừng Kinh Doanh
                        </span>
                      ) : prod.quantity > 5 ? (
                        <span className="badge badge-confirmed">
                          <CheckCircle2 size={12} /> Còn Hàng
                        </span>
                      ) : prod.quantity > 0 ? (
                        <span className="badge badge-pending">
                          <AlertTriangle size={12} /> Sắp Hết ({prod.quantity})
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                          <AlertCircle size={12} /> Hết Hàng
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <button
                          style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: '0.2rem' }}
                          onClick={() => handleViewBatches(prod.id)}
                          title="Xem các lô hàng FIFO"
                        >
                          <Layers size={18} />
                        </button>
                        <button
                          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.2rem' }}
                          onClick={() => handleEdit(prod)}
                          title="Sửa thông tin"
                        >
                          <Edit size={18} />
                        </button>
                        {prod.status === 'active' && (
                          <button
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                            onClick={() => handleDelete(prod)}
                            title="Ngừng kinh doanh (Soft delete)"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal (Create & Edit) */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={fetchProducts}
        initialData={editingProduct}
      />

      {/* FIFO Batch Details Modal */}
      <BatchDetailsModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        productId={selectedProductId}
      />
    </div>
  );
}
