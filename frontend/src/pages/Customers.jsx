import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Edit, Eye, DollarSign, Calendar, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import CustomerFormModal from '../components/CustomerFormModal';
import CustomerDetailModal from '../components/CustomerDetailModal';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let url = '/api/customers';
      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleEdit = (c) => {
    setEditingCustomer(c);
    setIsFormOpen(true);
  };

  const handleViewDetail = (cId) => {
    setSelectedCustomerId(cId);
    setIsDetailOpen(true);
  };

  // Stats
  const totalCustomers = customers.length;
  const totalDebtSum = customers.reduce((acc, c) => acc + (c.total_debt || 0), 0);
  const debtorsCount = customers.filter(c => (c.total_debt || 0) > 0).length;

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Số Khách Hàng</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{totalCustomers}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#ecfdf5', borderRadius: '0.75rem', color: '#059669' }}>
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Khách Hàng Đang Nợ</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{debtorsCount} Khách</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '0.75rem', color: '#b45309' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Công Nợ Toàn Shop</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>
                {totalDebtSum.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', borderRadius: '0.75rem', color: '#b45309' }}>
              <DollarSign size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Users color="#059669" size={24} />
            Danh Sách Quản Lý Khách Hàng & Công Nợ
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
                placeholder="Tìm tên hoặc SĐT..."
                className="table-input"
                style={{ paddingLeft: '2.2rem', width: '230px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={handleCreateNew}>
              <UserPlus size={18} />
              Thêm Khách Hàng Mới
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={24} className="icon" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '0.5rem' }}>Đang tải danh sách khách hàng...</p>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            <Users size={48} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>Chưa có thông tin khách hàng nào. Bấm nút bên trên để tạo mới.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Họ Và Tên Khách Hàng</th>
                  <th style={{ width: '130px' }}>Số Điện Thoại</th>
                  <th style={{ width: '110px' }}>Số Đơn Mua</th>
                  <th style={{ width: '170px' }}>Tổng Nợ Hiện Tại (đ)</th>
                  <th style={{ width: '140px' }}>Trạng Thái Nợ</th>
                  <th style={{ width: '160px' }}>Ngày Tạo</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: '#064e3b' }}>#{c.id}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{c.full_name}</td>
                    <td>{c.phone || 'Chưa có SĐT'}</td>
                    <td style={{ fontWeight: 600 }}>{c.order_count || 0} đơn</td>
                    <td style={{ fontWeight: 800, color: c.total_debt > 0 ? '#b45309' : '#059669', fontSize: '1rem' }}>
                      {c.total_debt ? c.total_debt.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </td>
                    <td>
                      {c.total_debt > 0 ? (
                        <span className="badge badge-pending">
                          <AlertTriangle size={12} /> Đang Nợ Tiền
                        </span>
                      ) : (
                        <span className="badge badge-confirmed">
                          <CheckCircle2 size={12} /> Không Nợ
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                      {new Date(c.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleViewDetail(c.id)}
                          title="Xem lịch sử mua hàng & thu nợ"
                        >
                          <Eye size={14} /> Lịch Sử / Thu Nợ
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                          onClick={() => handleEdit(c)}
                          title="Sửa thông tin"
                        >
                          <Edit size={14} /> Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Form Modal (Create & Edit) */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={fetchCustomers}
        initialData={editingCustomer}
      />

      {/* Customer Detail & Payment Modal */}
      <CustomerDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        customerId={selectedCustomerId}
        onRefresh={fetchCustomers}
      />
    </div>
  );
}
