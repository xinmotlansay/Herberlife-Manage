import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, User, Plus, Trash2, CheckCircle, AlertCircle, Calendar,
  DollarSign, Search, UserPlus, ArrowRight, Minus, Sparkles, Check, CreditCard, X, ShoppingCart, AlertTriangle, FileText
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

  // PROMINENT POPUP MODAL STATES
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, orderData: null });

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

  const showAlert = (title, message) => {
    setAlertModal({ isOpen: true, title, message });
  };

  const closeAlert = () => {
    setAlertModal({ isOpen: false, title: '', message: '' });
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
        showAlert('Cảnh Báo Giới Hạn Tồn Kho', `Sản phẩm "${prod.product_name}" chỉ còn ${prod.quantity} ${prod.unit} khả dụng trong kho.`);
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
      showAlert('Cảnh Báo Giới Hạn Tồn Kho', `Số lượng tồn kho tối đa của sản phẩm này là ${updated[index].max_stock} ${updated[index].unit}.`);
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

    // VALIDATION CHECKS WITH CLEAR POPUP ALERTS
    if (customerMode === 'existing' && !selectedCustomerId) {
      showAlert('Thiếu Thông Tin Khách Hàng', 'Vui lòng chọn khách hàng mua hàng từ danh sách.');
      return;
    }

    if (customerMode === 'new' && !customerNameNew.trim()) {
      showAlert('Thiếu Thông Tin Khách Hàng Mới', 'Vui lòng nhập Họ và tên cho khách hàng mới.');
      return;
    }

    if (cartItems.length === 0) {
      showAlert('Giỏ Hàng Đang Trống', 'Vui lòng bấm chọn ít nhất 1 sản phẩm ở danh mục phía trên để đưa vào đơn bán hàng.');
      return;
    }

    // Check individual items
    for (const item of cartItems) {
      if (item.quantity <= 0) {
        showAlert('Số Lượng Không Hợp Lệ', `Sản phẩm "${item.product_name}" phải có số lượng lớn hơn 0.`);
        return;
      }
      if (item.quantity > item.max_stock) {
        showAlert('Cảnh Báo Vượt Tồn Kho', `Sản phẩm "${item.product_name}" chọn bán ${item.quantity} ${item.unit}, vượt quá tồn kho khả dụng (${item.max_stock} ${item.unit}).`);
        return;
      }
    }

    setLoading(true);

    try {
      const selectedCustomerObj = customers.find(c => c.id === parseInt(selectedCustomerId, 10));
      const customerDisplayName = customerMode === 'new'
        ? customerNameNew.trim()
        : (selectedCustomerObj ? selectedCustomerObj.full_name : 'Khách hàng');

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

        // SHOW SUCCESS POPUP MODAL WITH FULL ORDER DETAILS
        setSuccessModal({
          isOpen: true,
          orderData: {
            id: data.data.id,
            customerName: customerDisplayName,
            totalAmount: grandTotal,
            paidAmount: calculatedPaid,
            debtAmount: calculatedDebt,
            itemCount: cartItems.length,
            paymentStatus
          }
        });

        // Reset Form
        setCartItems([]);
        setSelectedCustomerId('');
        setCustomerNameNew('');
        setCustomerPhoneNew('');
        setPaymentStatus('unpaid');
        setCustomPaidAmount('0');
        setIsCreatingOrder(false);
        fetchCustomersAndProducts();
      } else {
        showAlert('Tạo Đơn Bán Thất Bại', data.error || 'Đã có lỗi xảy ra khi tạo đơn hàng.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Lỗi Kết Nối Máy Chủ', 'Không thể kết nối tới máy chủ backend. Vui lòng kiểm tra lại.');
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
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      
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
        <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShoppingCart size={22} color="#059669" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#064e3b', margin: 0 }}>
                Đang Khởi Tạo Đơn Bán Hàng Mới
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Chọn khách hàng, chọn sản phẩm và bấm xác nhận ở góc phải
              </span>
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => setIsCreatingOrder(false)}
          >
            <X size={15} /> Đóng Form Bán Hàng
          </button>
        </div>
      )}

      {/* POS Grid Layout - Uses minmax(0, 1fr) for Left Column & 350px for Right Column */}
      {isCreatingOrder && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '1.25rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Customer Selection & Product Catalog + Cart Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>
            
            {/* STEP 1: Customer Selection Box */}
            <div className="card" style={{ marginBottom: 0, padding: '1rem 1.25rem' }}>
              <div className="card-header" style={{ marginBottom: '0.65rem', paddingBottom: '0.4rem' }}>
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  <User color="#059669" size={18} />
                  1. Chọn Khách Hàng Mua Hàng
                </div>

                {/* Mode Toggle Buttons */}
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '0.2rem', borderRadius: '0.5rem', gap: '0.2rem' }}>
                  <button
                    type="button"
                    className={`btn ${customerMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', border: 'none' }}
                    onClick={() => setCustomerMode('existing')}
                  >
                    <User size={12} /> Khách Hàng Sẵn Có ({customers.length})
                  </button>
                  <button
                    type="button"
                    className={`btn ${customerMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', border: 'none' }}
                    onClick={() => setCustomerMode('new')}
                  >
                    <UserPlus size={12} /> + Khách Mới
                  </button>
                </div>
              </div>

              {customerMode === 'existing' ? (
                <div>
                  <select
                    className="table-input"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem', color: '#334155' }}>
                      Họ Và Tên Khách Mới <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="table-input"
                      style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
                      placeholder="VD: Trương Thị Mỹ Hạnh..."
                      value={customerNameNew}
                      onChange={(e) => setCustomerNameNew(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.2rem', color: '#334155' }}>
                      Số Điện Thoại (Optional)
                    </label>
                    <input
                      type="tel"
                      className="table-input"
                      style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
                      placeholder="VD: 0983827919..."
                      value={customerPhoneNew}
                      onChange={(e) => setCustomerPhoneNew(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Product Quick Picker */}
            <div className="card" style={{ marginBottom: 0, padding: '1rem 1.25rem' }}>
              <div className="card-header" style={{ marginBottom: '0.55rem' }}>
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  <Sparkles color="#059669" size={18} />
                  2. Chọn Sản Phẩm Từ Kho (Click Để Thêm)
                </div>

                <div style={{ position: 'relative', width: '200px' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Tìm tên/mã SP kho..."
                    className="table-input"
                    style={{ paddingLeft: '1.9rem', padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '0.5rem' }}>
                  Không tìm thấy sản phẩm khả dụng trong kho.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.55rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                  {filteredProducts.map(p => {
                    const isInCart = cartItems.some(i => i.product_id === p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleAddProductToCart(p)}
                        style={{
                          padding: '0.5rem 0.65rem',
                          borderRadius: '0.5rem',
                          border: `1.5px solid ${isInCart ? '#10b981' : '#e2e8f0'}`,
                          backgroundColor: isInCart ? '#ecfdf5' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#064e3b', backgroundColor: '#d1fae5', padding: '0.08rem 0.3rem', borderRadius: '4px' }}>
                            #{p.product_code}
                          </span>
                          <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem', lineHeight: '1.25', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.product_name}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.7rem' }}>
                          <span style={{ color: '#059669', fontWeight: 700 }}>Tồn: {p.quantity} {p.unit}</span>
                          {isInCart ? (
                            <span style={{ color: '#047857', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <Check size={12} /> Đã chọn
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
            <div className="card" style={{ marginBottom: 0, padding: '1rem 1.25rem' }}>
              <div className="card-header" style={{ marginBottom: '0.65rem' }}>
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  <ShoppingBag color="#059669" size={18} />
                  3. Giỏ Hàng Chi Tiết ({cartItems.length} Sản Phẩm)
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                  <ShoppingBag size={36} style={{ opacity: 0.4, marginBottom: '0.4rem' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Giỏ hàng bán đang trống</p>
                  <p style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Bấm sản phẩm ở ô phía trên để thêm vào đơn hàng.</p>
                </div>
              ) : (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>#</th>
                        <th style={{ width: '70px' }}>Mã SP</th>
                        <th>Tên Sản Phẩm</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Số Lượng Bán</th>
                        <th style={{ width: '130px' }}>Đơn Giá Bán (đ)</th>
                        <th style={{ width: '130px' }}>Thành Tiền (đ)</th>
                        <th style={{ width: '35px', textAlign: 'center' }}>Xoá</th>
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
                            <td style={{ fontWeight: 700, color: '#064e3b', fontSize: '0.8rem' }}>#{item.product_code}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{item.product_name}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '0.4rem', overflow: 'hidden' }}>
                                <button
                                  type="button"
                                  style={{ background: '#f1f5f9', border: 'none', padding: '0.25rem 0.35rem', cursor: 'pointer', color: '#334155' }}
                                  onClick={() => handleUpdateQuantity(idx, -1)}
                                >
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.max_stock}
                                  style={{ width: '36px', textAlign: 'center', border: 'none', outline: 'none', fontWeight: 800, fontSize: '0.82rem' }}
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
                                  style={{ background: '#f1f5f9', border: 'none', padding: '0.25rem 0.35rem', cursor: 'pointer', color: '#334155' }}
                                  onClick={() => handleUpdateQuantity(idx, 1)}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              <span style={{ fontSize: '0.65rem', color: '#059669', display: 'block', marginTop: '1px' }}>
                                (Tối đa: {item.max_stock} {item.unit})
                              </span>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="table-input"
                                style={{ fontWeight: 700, color: '#047857', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                                value={item.selling_price}
                                onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                              />
                            </td>
                            <td style={{ fontWeight: 800, color: '#064e3b', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                              {lineTotal.toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                onClick={() => handleRemoveCartItem(idx)}
                                title="Xoá dòng"
                              >
                                <Trash2 size={15} />
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

          {/* RIGHT COLUMN: Clear Receipt-Style Payment Summary Card (350px width limit) */}
          <div style={{ position: 'sticky', top: '15px' }}>
            <div className="card" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid #cbd5e1', padding: '1.25rem 1rem' }}>
              <div className="card-header" style={{ marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0' }}>
                <div className="card-title" style={{ fontSize: '1rem' }}>
                  <CreditCard color="#059669" size={20} />
                  Tổng Kết & Thanh Toán
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                
                {/* Receipt Breakdown Table */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.65rem',
                  padding: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem' }}>
                    <span>Khách hàng mua:</span>
                    <strong style={{ color: '#0f172a', maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {customerMode === 'new' ? (customerNameNew || 'Khách hàng mới') : (selectedCustomerObj ? selectedCustomerObj.full_name : 'Chưa chọn')}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>
                    <span>Số loại sản phẩm:</span>
                    <strong style={{ color: '#0f172a' }}>{cartItems.length} mặt hàng</strong>
                  </div>

                  <div style={{ height: '1px', backgroundColor: '#cbd5e1', margin: '0.4rem 0' }} />

                  {/* Subtotal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>TỔNG TIỀN ĐƠN:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#064e3b', letterSpacing: '-0.02em' }}>
                      {grandTotal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* Payment Status Segmented Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem', color: '#334155' }}>
                    Hình Thức Thanh Toán Ngay
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem' }}>
                    <button
                      type="button"
                      style={{
                        padding: '0.45rem 0.15rem',
                        borderRadius: '0.45rem',
                        fontSize: '0.72rem',
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
                        padding: '0.45rem 0.15rem',
                        borderRadius: '0.45rem',
                        fontSize: '0.72rem',
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
                        padding: '0.45rem 0.15rem',
                        borderRadius: '0.45rem',
                        fontSize: '0.72rem',
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
                  borderRadius: '0.65rem',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  {paymentStatus === 'partial' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem', color: '#b45309' }}>
                        Số tiền cọc / trả trước (đ):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        className="table-input"
                        style={{ fontWeight: 800, fontSize: '0.88rem', padding: '0.35rem 0.5rem' }}
                        value={customPaidAmount}
                        onChange={(e) => setCustomPaidAmount(e.target.value)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Số tiền thu ngay:</span>
                    <strong style={{ color: '#059669', fontSize: '0.88rem' }}>
                      {calculatedPaid.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Số tiền ghi sổ công nợ:</span>
                    <strong style={{ color: calculatedDebt > 0 ? '#b45309' : '#64748b', fontSize: '0.92rem', fontWeight: 800 }}>
                      {calculatedDebt.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                {/* Sale Date Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem', color: '#334155' }}>
                    <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                    Thời Gian Tạo Đơn (Mặc định hôm nay)
                  </label>
                  <input
                    type="datetime-local"
                    className="table-input"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
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
                    padding: '0.75rem',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    borderRadius: '0.65rem',
                    marginTop: '0.1rem'
                  }}
                  disabled={loading}
                  onClick={handleSubmitOrder}
                >
                  {loading ? 'Đang Trừ Kho FIFO...' : '🚀 XÁC NHẬN TẠO ĐƠN & TRỪ KHO'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 1. WARNING / VALIDATION ALERT MODAL POPUP */}
      {alertModal.isOpen && (
        <div className="modal-overlay" onClick={closeAlert}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ backgroundColor: '#ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertTriangle size={24} color="white" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>
                  {alertModal.title}
                </h3>
              </div>
              <button onClick={closeAlert} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                {alertModal.message}
              </p>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', padding: '0.6rem 1.75rem' }} onClick={closeAlert}>
                Đã Hiểu / Kiểm Tra Lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ORDER SUCCESS POPUP MODAL WITH ORDER DETAILS */}
      {successModal.isOpen && successModal.orderData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header" style={{ backgroundColor: '#059669' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle size={26} color="white" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', margin: 0 }}>
                    Tạo Đơn Bán Hàng Thành Công!
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>
                    Mã đơn bán hàng: #{successModal.orderData.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', color: '#059669' }}>
                  <Sparkles size={34} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#064e3b' }}>
                  Đã Trừ Kho FIFO Tự Động
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Số lượng sản phẩm trong kho đã được khấu trừ từ các lô kho cũ nhất tới mới nhất.
                </p>
              </div>

              {/* Order Receipt Details Summary */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tên Khách Hàng:</span>
                  <strong style={{ color: '#0f172a' }}>{successModal.orderData.customerName}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tổng Loại Mặt Hàng:</span>
                  <strong style={{ color: '#0f172a' }}>{successModal.orderData.itemCount} loại sản phẩm</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tổng Giá Trị Đơn Hàng:</span>
                  <strong style={{ color: '#064e3b', fontSize: '1.05rem', fontWeight: 900 }}>
                    {successModal.orderData.totalAmount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '0.25rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Số Tiền Thu Ngay:</span>
                  <strong style={{ color: '#059669' }}>
                    {successModal.orderData.paidAmount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Công Nợ Ghi Sổ:</span>
                  <strong style={{ color: successModal.orderData.debtAmount > 0 ? '#b45309' : '#64748b' }}>
                    {successModal.orderData.debtAmount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setSuccessModal({ isOpen: false, orderData: null })}
              >
                ➕ Tiếp Tục Tạo Đơn Khác
              </button>
              {onNavigateHistory && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setSuccessModal({ isOpen: false, orderData: null });
                    onNavigateHistory();
                  }}
                >
                  <FileText size={16} /> Xem Lịch Sử Bán Hàng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
