import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, User, Plus, Trash2, CheckCircle, AlertCircle, Calendar,
  DollarSign, Search, UserPlus, ArrowRight, Minus, Sparkles, Check, CreditCard, X, ShoppingCart
} from 'lucide-react';

export default function SalesCreate({ onNavigateHistory }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // Toggle form display state (Only show form when user clicks "Tạo Đơn Bán Hàng Mới")
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Customer states
  const [customerMode, setCustomerMode] = useState('existing'); // 'existing' | 'new'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerNameNew, setCustomerNameNew] = useState('');
  const [customerPhoneNew, setCustomerPhoneNew] = useState('');

  // Order settings
  const nowStr = new Date().toISOString().slice(0, 16);
  const [saleDate, setSaleDate] = useState(nowStr);
  const [paymentStatus, setPaymentStatus] = useState('unpaid'); // 'unpaid' | 'partial' | 'paid'
  const [customPaidAmount, setCustomPaidAmount] = useState('0');

  // Cart Items: [{ product_id, product_code, product_name, unit, quantity, selling_price, max_stock }]
  const [cartItems, setCartItems] = useState([]);

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
        setProducts(prodData.data.filter(p => p.quantity > 0));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add product to cart
  const handleAddProductToCart = (prod) => {
    const existingIndex = cartItems.findIndex(item => item.product_id === prod.id);

    if (existingIndex >= 0) {
      const currentQty = cartItems[existingIndex].quantity;
      if (currentQty < prod.quantity) {
        const updated = [...cartItems];
        updated[existingIndex].quantity += 1;
        setCartItems(updated);
      } else {
        alert(`Sản phẩm "${prod.product_name}" chỉ còn ${prod.quantity} ${prod.unit} trong kho`);
      }
    } else {
      const suggestedPrice = prod.avg_import_price ? Math.round(prod.avg_import_price * 1.2) : 100000;
      setCartItems([
        ...cartItems,
        {
          product_id: prod.id,
          product_code: prod.product_code,
          product_name: prod.product_name,
          unit: prod.unit || 'EA',
          max_stock: prod.quantity,
          quantity: 1,
          selling_price: suggestedPrice
        }
      ]);
    }
  };

  const handleUpdateQuantity = (index, delta) => {
    const updated = [...cartItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }
    if (newQty > updated[index].max_stock) {
      alert(`Số lượng tồn kho tối đa là ${updated[index].max_stock}`);
      return;
    }
    updated[index].quantity = newQty;
    setCartItems(updated);
  };

  const handleItemPriceChange = (index, value) => {
    const updated = [...cartItems];
    updated[index].selling_price = parseFloat(value) || 0;
    setCartItems(updated);
  };

  const handleRemoveCartItem = (index) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const q = parseInt(item.quantity, 10) || 0;
      const p = parseFloat(item.selling_price) || 0;
      return acc + (q * p);
    }, 0);
  };

  const grandTotal = calculateTotal();

  // Payment calculations based on status mode
  const getPaidAndDebtAmount = () => {
    if (paymentStatus === 'paid') {
      return { paid: grandTotal, debt: 0 };
    }
    if (paymentStatus === 'unpaid') {
      return { paid: 0, debt: grandTotal };
    }
    // partial
    const inputVal = parseFloat(customPaidAmount) || 0;
    const paid = Math.min(grandTotal, Math.max(0, inputVal));
    const debt = Math.max(0, grandTotal - paid);
    return { paid, debt };
  };

  const { paid: calculatedPaid, debt: calculatedDebt } = getPaidAndDebtAmount();

  const handleStatusChange = (status) => {
    setPaymentStatus(status);
    if (status === 'paid') {
      setCustomPaidAmount(grandTotal.toString());
    } else if (status === 'unpaid') {
      setCustomPaidAmount('0');
    } else if (status === 'partial') {
      setCustomPaidAmount(Math.round(grandTotal / 2).toString());
    }
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');
    setNotification(null);

    if (cartItems.length === 0) {
      setError('Giỏ hàng bán đang trống. Vui lòng chọn sản phẩm.');
      return;
    }

    if (customerMode === 'existing' && !selectedCustomerId) {
      setError('Vui lòng chọn khách hàng mua hàng');
      return;
    }

    if (customerMode === 'new' && !customerNameNew.trim()) {
      setError('Vui lòng nhập Họ tên cho khách hàng mới');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customer_id: customerMode === 'existing' ? parseInt(selectedCustomerId, 10) : null,
        customer_name_new: customerMode === 'new' ? customerNameNew.trim() : null,
        customer_phone_new: customerMode === 'new' ? customerPhoneNew.trim() : null,
        sale_date: saleDate,
        payment_status: paymentStatus,
        created_by: 'Chủ shop',
        items: cartItems.map(i => ({
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
        if (paymentStatus === 'partial' && calculatedPaid > 0) {
          await fetch(`/api/sales-orders/${data.data.id}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: calculatedPaid, note: 'Trả trước 1 phần khi tạo đơn' })
          });
        }

        setNotification({
          type: 'success',
          message: `Tạo đơn bán hàng #${data.data.id} thành công! Đã trừ kho tự động theo cơ chế FIFO.`
        });

        // Reset & Collapse Form
        setCartItems([]);
        setSelectedCustomerId('');
        setCustomerNameNew('');
        setCustomerPhoneNew('');
        setPaymentStatus('unpaid');
        setCustomPaidAmount('0');
        setIsCreatingOrder(false);
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

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedCustomerObj = customers.find(c => c.id === parseInt(selectedCustomerId, 10));

  return (
    <div>
      {/* Success Notification Bar */}
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
          color: '#064e3b',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle size={26} color="#059669" />
            <div>
              <strong style={{ fontSize: '1rem', display: 'block' }}>{notification.message}</strong>
              <span style={{ fontSize: '0.85rem', color: '#047857' }}>Số lượng sản phẩm đã được trừ kho và cập nhật công nợ.</span>
            </div>
          </div>
          {onNavigateHistory && (
            <button className="btn btn-primary" onClick={onNavigateHistory}>
              Xem Lịch Sử Bán Hàng <ArrowRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* Primary Action Header Banner */}
      {!isCreatingOrder ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)', border: '1.5px solid #a7f3d0' }}>
          <div className="upload-icon-wrapper" style={{ width: '72px', height: '72px', backgroundColor: '#059669', color: 'white', marginBottom: '1.25rem' }}>
            <ShoppingCart size={36} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#064e3b', marginBottom: '0.5rem' }}>
            Quản Lý Bán Hàng & Trừ Kho FIFO Herbalife
          </h2>
          <p style={{ color: '#475569', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto 1.75rem auto', lineHeight: 1.5 }}>
            Bấm nút bên dưới để bắt đầu tạo đơn bán hàng mới. Hệ thống sẽ tự động đối soát tồn kho, hỗ trợ chọn sản phẩm, giá bán tự do và trừ kho theo thứ tự FIFO.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', fontWeight: 800, borderRadius: '0.75rem', boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)' }}
              onClick={() => setIsCreatingOrder(true)}
            >
              <Plus size={22} /> TẠO ĐƠN BÁN HÀNG MỚI
            </button>
            {onNavigateHistory && (
              <button className="btn btn-secondary" style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }} onClick={onNavigateHistory}>
                Xem Lịch Sử Bán Hàng
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Form Active Header Bar */
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShoppingCart size={24} color="#059669" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#064e3b' }}>
                Đang Khởi Tạo Đơn Bán Hàng Mới
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Vui lòng điền thông tin khách hàng, chọn sản phẩm và bấm xác nhận
              </span>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            onClick={() => setIsCreatingOrder(false)}
          >
            <X size={16} /> Đóng Form Bán Hàng
          </button>
        </div>
      )}

      {/* POS Grid Layout - Only visible when isCreatingOrder === true */}
      {isCreatingOrder && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Customer Selection & Product Catalog + Cart Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* STEP 1: Customer Selection Box */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
                <div className="card-title" style={{ fontSize: '1rem' }}>
                  <User color="#059669" size={20} />
                  1. Chọn Khách Hàng Mua Hàng
                </div>

                {/* Mode Toggle Buttons */}
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: '0.5rem', gap: '0.2rem' }}>
                  <button
                    type="button"
                    className={`btn ${customerMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', border: 'none' }}
                    onClick={() => setCustomerMode('existing')}
                  >
                    <User size={13} /> Khách Hàng Sẵn Có ({customers.length})
                  </button>
                  <button
                    type="button"
                    className={`btn ${customerMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', border: 'none' }}
                    onClick={() => setCustomerMode('new')}
                  >
                    <UserPlus size={13} /> + Khách Mới
                  </button>
                </div>
              </div>

              {customerMode === 'existing' ? (
                <div>
                  <select
                    className="table-input"
                    style={{ padding: '0.65rem 0.85rem', fontSize: '0.9rem', fontWeight: 600 }}
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">-- Bấm vào đây để chọn tên khách hàng --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        👤 {c.full_name} {c.phone ? `(${c.phone})` : ''} {c.total_debt > 0 ? ` ⚠️ [Đang nợ: ${c.total_debt.toLocaleString('vi-VN')} đ]` : ' 🟢 [Không nợ]'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem', color: '#334155' }}>
                      Họ Và Tên Khách Mới <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="table-input"
                      placeholder="VD: Trương Thị Mỹ Hạnh..."
                      value={customerNameNew}
                      onChange={(e) => setCustomerNameNew(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem', color: '#334155' }}>
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

            {/* STEP 2: Product Quick Picker */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header" style={{ marginBottom: '0.65rem' }}>
                <div className="card-title" style={{ fontSize: '1rem' }}>
                  <Sparkles color="#059669" size={20} />
                  2. Chọn Sản Phẩm Từ Kho (Click Để Thêm)
                </div>

                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Tìm tên/mã SP kho..."
                    className="table-input"
                    style={{ paddingLeft: '2.1rem', padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem' }}>
                  Không tìm thấy sản phẩm khả dụng trong kho.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.65rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {filteredProducts.map(p => {
                    const isInCart = cartItems.some(i => i.product_id === p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleAddProductToCart(p)}
                        style={{
                          padding: '0.55rem 0.75rem',
                          borderRadius: '0.6rem',
                          border: `1.5px solid ${isInCart ? '#10b981' : '#e2e8f0'}`,
                          backgroundColor: isInCart ? '#ecfdf5' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#064e3b', backgroundColor: '#d1fae5', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            #{p.product_code}
                          </span>
                          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem', lineHeight: '1.2' }}>
                            {p.product_name}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.72rem' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>Tồn: {p.quantity} {p.unit}</span>
                          {isInCart ? (
                            <span style={{ color: '#047857', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Check size={13} /> Đã chọn
                            </span>
                          ) : (
                            <span style={{ color: '#3b82f6', fontWeight: 600 }}>+ Thêm</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STEP 3: Order Cart Table */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1rem' }}>
                  <ShoppingBag color="#059669" size={20} />
                  3. Giỏ Hàng Chi Tiết ({cartItems.length} Sản Phẩm)
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                  <ShoppingBag size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Giỏ hàng bán đang trống</p>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Bấm sản phẩm ở ô phía trên để thêm vào giỏ hàng.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35px' }}>#</th>
                        <th style={{ width: '90px' }}>Mã SP</th>
                        <th>Tên Sản Phẩm</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Số Lượng Bán</th>
                        <th style={{ width: '150px' }}>Đơn Giá Bán (đ)</th>
                        <th style={{ width: '150px' }}>Thành Tiền (đ)</th>
                        <th style={{ width: '45px', textAlign: 'center' }}>Xoá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, idx) => {
                        const qty = item.quantity;
                        const price = item.selling_price;
                        const lineTotal = qty * price;

                        return (
                          <tr key={item.product_id}>
                            <td>{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: '#064e3b' }}>#{item.product_code}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                <button
                                  type="button"
                                  style={{ background: '#f1f5f9', border: 'none', padding: '0.3rem 0.45rem', cursor: 'pointer', color: '#334155' }}
                                  onClick={() => handleUpdateQuantity(idx, -1)}
                                >
                                  <Minus size={13} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.max_stock}
                                  style={{ width: '40px', textAlign: 'center', border: 'none', outline: 'none', fontWeight: 800, fontSize: '0.88rem' }}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 1;
                                    const clamped = Math.min(Math.max(1, val), item.max_stock);
                                    const updated = [...cartItems];
                                    updated[idx].quantity = clamped;
                                    setCartItems(updated);
                                  }}
                                />
                                <button
                                  type="button"
                                  style={{ background: '#f1f5f9', border: 'none', padding: '0.3rem 0.45rem', cursor: 'pointer', color: '#334155' }}
                                  onClick={() => handleUpdateQuantity(idx, 1)}
                                >
                                  <Plus size={13} />
                                </button>
                              </div>
                              <span style={{ fontSize: '0.68rem', color: '#059669', display: 'block', marginTop: '2px' }}>
                                (Tối đa: {item.max_stock} {item.unit})
                              </span>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="table-input"
                                style={{ fontWeight: 700, color: '#047857' }}
                                value={item.selling_price}
                                onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                              />
                            </td>
                            <td style={{ fontWeight: 800, color: '#064e3b', fontSize: '0.92rem' }}>
                              {lineTotal.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                onClick={() => handleRemoveCartItem(idx)}
                                title="Xoá dòng"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Clear Receipt-Style Payment Summary Card */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <div className="card" style={{ boxShadow: 'var(--shadow-xl)', border: '1px solid #cbd5e1' }}>
              <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>
                <div className="card-title" style={{ fontSize: '1.1rem' }}>
                  <CreditCard color="#059669" size={22} />
                  Tổng Kết & Thanh Toán Đơn Bán
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Receipt Breakdown Table */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem' }}>
                    <span>Khách hàng mua:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {customerMode === 'new' ? (customerNameNew || 'Khách hàng mới') : (selectedCustomerObj ? selectedCustomerObj.full_name : 'Chưa chọn')}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    <span>Số loại sản phẩm:</span>
                    <strong style={{ color: '#0f172a' }}>{cartItems.length} mặt hàng</strong>
                  </div>

                  <div style={{ height: '1px', backgroundColor: '#cbd5e1', margin: '0.5rem 0' }} />

                  {/* Subtotal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>TỔNG TIỀN ĐƠN HÀNG:</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#064e3b' }}>
                      {grandTotal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* Payment Status Segmented Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                    Hình Thức Thanh Toán Ngay
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.55rem 0.25rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: `1.5px solid ${paymentStatus === 'unpaid' ? '#ef4444' : '#e2e8f0'}`,
                        backgroundColor: paymentStatus === 'unpaid' ? '#fef2f2' : '#ffffff',
                        color: paymentStatus === 'unpaid' ? '#b91c1c' : '#64748b'
                      }}
                      onClick={() => handleStatusChange('unpaid')}
                    >
                      🔴 Ghi Nợ
                    </button>

                    <button
                      type="button"
                      style={{
                        padding: '0.55rem 0.25rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: `1.5px solid ${paymentStatus === 'partial' ? '#f59e0b' : '#e2e8f0'}`,
                        backgroundColor: paymentStatus === 'partial' ? '#fffbeb' : '#ffffff',
                        color: paymentStatus === 'partial' ? '#b45309' : '#64748b'
                      }}
                      onClick={() => handleStatusChange('partial')}
                    >
                      🟡 Trả 1 Phần
                    </button>

                    <button
                      type="button"
                      style={{
                        padding: '0.55rem 0.25rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: `1.5px solid ${paymentStatus === 'paid' ? '#10b981' : '#e2e8f0'}`,
                        backgroundColor: paymentStatus === 'paid' ? '#ecfdf5' : '#ffffff',
                        color: paymentStatus === 'paid' ? '#047857' : '#64748b'
                      }}
                      onClick={() => handleStatusChange('paid')}
                    >
                      🟢 Trả Hết Ngay
                    </button>
                  </div>
                </div>

                {/* Dynamic Payment & Remaining Debt Calculation Box */}
                <div style={{
                  backgroundColor: paymentStatus === 'paid' ? '#ecfdf5' : '#fffbeb',
                  border: `1px solid ${paymentStatus === 'paid' ? '#a7f3d0' : '#fde68a'}`,
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  {paymentStatus === 'partial' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem', color: '#b45309' }}>
                        Số tiền khách đặt cọc / trả trước (đ):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        className="table-input"
                        style={{ fontWeight: 800, fontSize: '0.95rem' }}
                        value={customPaidAmount}
                        onChange={(e) => setCustomPaidAmount(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Số tiền thu ngay:</span>
                    <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                      {calculatedPaid.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Số tiền ghi sổ công nợ:</span>
                    <strong style={{ color: calculatedDebt > 0 ? '#b45309' : '#64748b', fontSize: '1rem', fontWeight: 800 }}>
                      {calculatedDebt.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                {/* Sale Date Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem', color: '#334155' }}>
                    <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Thời Gian Tạo Đơn (Mặc định hôm nay)
                  </label>
                  <input
                    type="datetime-local"
                    className="table-input"
                    style={{ fontSize: '0.82rem' }}
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    required
                  />
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: '0.75rem',
                    marginTop: '0.25rem'
                  }}
                  disabled={loading || cartItems.length === 0}
                  onClick={handleSubmitOrder}
                >
                  {loading ? 'Đang Trừ Kho FIFO...' : '🚀 XÁC NHẬN TẠO ĐƠN & TRỪ KHO'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
