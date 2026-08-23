import React, { useState, useEffect } from 'react';
import { ShoppingBag, User, Plus, Trash2, CheckCircle, AlertCircle, Calendar, DollarSign, Layers } from 'lucide-react';

export default function SalesCreate({ onNavigateHistory }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerNameNew, setCustomerNameNew] = useState('');
  const [customerPhoneNew, setCustomerPhoneNew] = useState('');

  // Localized date format (YYYY-MM-DDTHH:mm)
  const nowStr = new Date().toISOString().slice(0, 16);
  const [saleDate, setSaleDate] = useState(nowStr);
  const [paymentStatus, setPaymentStatus] = useState('unpaid'); // 'unpaid', 'paid'

  // Items state: [{ product_id, quantity, selling_price, max_stock, unit, product_code, product_name }]
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, selling_price: 0, max_stock: 0, unit: 'EA', product_code: '', product_name: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchCustomersAndProducts();
  }, []);

  const fetchCustomersAndProducts = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/products?status=active')
      ]);
      const custData = await custRes.json();
      const prodData = await prodRes.json();

      if (custData.success) setCustomers(custData.data);
      if (prodData.success) {
        // Filter out products with quantity <= 0
        const inStockProds = prodData.data.filter(p => p.quantity > 0);
        setProducts(inStockProds);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductSelect = (index, prodId) => {
    const selectedProd = products.find(p => p.id === parseInt(prodId, 10));
    const newItems = [...items];

    if (selectedProd) {
      newItems[index] = {
        ...newItems[index],
        product_id: selectedProd.id,
        product_code: selectedProd.product_code,
        product_name: selectedProd.product_name,
        unit: selectedProd.unit || 'EA',
        max_stock: selectedProd.quantity,
        selling_price: selectedProd.avg_import_price ? Math.round(selectedProd.avg_import_price * 1.2) : 100000,
        quantity: Math.min(newItems[index].quantity || 1, selectedProd.quantity)
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        product_id: '',
        product_code: '',
        product_name: '',
        max_stock: 0,
        selling_price: 0
      };
    }

    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setItems(newItems);
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      { product_id: '', quantity: 1, selling_price: 0, max_stock: 0, unit: 'EA', product_code: '', product_name: '' }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => {
      const q = parseInt(item.quantity, 10) || 0;
      const p = parseFloat(item.selling_price) || 0;
      return acc + (q * p);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotification(null);

    // Validation
    if (!isNewCustomer && !selectedCustomerId) {
      setError('Vui lòng chọn khách hàng hoặc chọn nhập khách hàng mới');
      return;
    }
    if (isNewCustomer && !customerNameNew.trim()) {
      setError('Vui lòng nhập Họ tên khách hàng mới');
      return;
    }

    const validItems = items.filter(i => i.product_id && parseInt(i.quantity, 10) > 0);
    if (validItems.length === 0) {
      setError('Đơn hàng phải chọn ít nhất 1 sản phẩm hợp lệ');
      return;
    }

    // Check stock overflow
    for (const item of validItems) {
      if (parseInt(item.quantity, 10) > item.max_stock) {
        setError(`Sản phẩm "${item.product_name}" vượt quá tồn kho khả dụng (${item.max_stock})`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        customer_id: isNewCustomer ? null : parseInt(selectedCustomerId, 10),
        customer_name_new: isNewCustomer ? customerNameNew.trim() : null,
        customer_phone_new: isNewCustomer ? customerPhoneNew.trim() : null,
        sale_date: saleDate,
        payment_status: paymentStatus,
        created_by: 'Chủ shop',
        items: validItems.map(i => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity, 10),
          selling_price: parseFloat(i.selling_price) || 0
        }))
      };

      const res = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setNotification({
          type: 'success',
          message: `Tạo đơn bán hàng #${data.data.id} thành công! Đã trừ kho theo nguyên tắc FIFO.`
        });

        // Reset form
        setItems([{ product_id: '', quantity: 1, selling_price: 0, max_stock: 0, unit: 'EA', product_code: '', product_name: '' }]);
        setSelectedCustomerId('');
        setIsNewCustomer(false);
        setCustomerNameNew('');
        setCustomerPhoneNew('');

        // Refresh customers & products
        fetchCustomersAndProducts();
      } else {
        setError(data.error || 'Tạo đơn bán thất bại');
      }
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {notification && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #10b981',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#064e3b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle size={24} color="#059669" />
            <span style={{ fontWeight: 600 }}>{notification.message}</span>
          </div>
          {onNavigateHistory && (
            <button className="btn btn-primary" onClick={onNavigateHistory}>
              Xem Lịch Sử Bán Hàng
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          {/* Left Panel: Customer & Line Items */}
          <div>
            {/* Customer Box */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <div className="card-title">
                  <User color="#059669" size={22} />
                  Thông Tin Khách Hàng Nguồn
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="chk-new-customer"
                    checked={isNewCustomer}
                    onChange={(e) => setIsNewCustomer(e.target.checked)}
                  />
                  <label htmlFor="chk-new-customer" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#065f46' }}>
                    + Khách hàng mới chưa có trong hệ thống
                  </label>
                </div>
              </div>

              {!isNewCustomer ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Chọn Khách Hàng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="table-input"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required={!isNewCustomer}
                  >
                    <option value="">-- Chọn khách hàng sẵn có --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} {c.phone ? `(${c.phone})` : ''} {c.total_debt > 0 ? `[Đang nợ: ${c.total_debt.toLocaleString('vi-VN')}đ]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                      Tên Khách Hàng Mới <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="table-input"
                      placeholder="VD: Trương Thị Mỹ Hạnh..."
                      value={customerNameNew}
                      onChange={(e) => setCustomerNameNew(e.target.value)}
                      required={isNewCustomer}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                      Số Điện Thoại (Optional)
                    </label>
                    <input
                      type="tel"
                      className="table-input"
                      placeholder="VD: 0983827919..."
                      value={customerPhoneNew}
                      onChange={(e) => setCustomerPhoneNew(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <ShoppingBag color="#059669" size={22} />
                  Danh Sách Sản Phẩm Bán
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleAddItemRow}>
                  <Plus size={16} /> Thêm Dòng Sản Phẩm
                </button>
              </div>

              <div className="table-container" style={{ marginBottom: '1rem' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Sản Phẩm (Tồn Kho Khả Dụng)</th>
                      <th style={{ width: '90px' }}>ĐVT</th>
                      <th style={{ width: '100px' }}>Số Lượng</th>
                      <th style={{ width: '160px' }}>Đơn Giá Bán (đ)</th>
                      <th style={{ width: '150px' }}>Thành Tiền (đ)</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const qty = parseInt(item.quantity, 10) || 0;
                      const price = parseFloat(item.selling_price) || 0;
                      const lineTotal = qty * price;

                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <select
                              className="table-input"
                              value={item.product_id}
                              onChange={(e) => handleProductSelect(idx, e.target.value)}
                              required
                            >
                              <option value="">-- Chọn sản phẩm trong kho --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.product_name} ({p.product_code}) - Tồn kho: {p.quantity} {p.unit}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.unit}</td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              max={item.max_stock || 9999}
                              className="table-input"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              required
                            />
                            {item.max_stock > 0 && (
                              <span style={{ fontSize: '0.7rem', color: '#059669', display: 'block', marginTop: '2px' }}>
                                Tối đa: {item.max_stock}
                              </span>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="table-input"
                              value={item.selling_price}
                              onChange={(e) => handleItemChange(idx, 'selling_price', e.target.value)}
                              required
                            />
                          </td>
                          <td style={{ fontWeight: 700, color: '#064e3b' }}>
                            {lineTotal.toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {items.length > 1 && (
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                onClick={() => handleRemoveItemRow(idx)}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Summary & Options */}
          <div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <DollarSign color="#059669" size={22} />
                  Thanh Toán & Cấu Hình
                </div>
              </div>

              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Ngày Bán Hàng (Cho phép sửa)
                  </label>
                  <input
                    type="datetime-local"
                    className="table-input"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Trạng Thái Thanh Toán Ban Đầu
                  </label>
                  <select
                    className="table-input"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="unpaid">🔴 Chưa Thanh Toán (Ghi Nợ Khách)</option>
                    <option value="paid">🟢 Đã Thanh Toán (Thu Tiền Ngay)</option>
                  </select>
                </div>

                <div style={{
                  backgroundColor: '#ecfdf5',
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #a7f3d0',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>
                    Tổng Số Tiền Đơn Hàng
                  </span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#064e3b', margin: '0.3rem 0' }}>
                    {calculateTotal().toLocaleString('vi-VN')} đ
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#059669' }}>
                    Áp dụng xuất kho FIFO tự động
                  </span>
                </div>

                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#475569',
                  border: '1px solid #e2e8f0'
                }}>
                  💡 <strong>Cơ chế FIFO:</strong> Sản phẩm sẽ được trừ tự động vào các lô nhập kho cũ nhất tới mới nhất để tính chính xác giá vốn thực tế.
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
                  disabled={loading}
                >
                  {loading ? 'Đang xuất kho FIFO...' : 'Tạo Đơn Bán Hàng & Trừ Kho'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
