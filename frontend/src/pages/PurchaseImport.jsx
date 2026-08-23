import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, Trash2, Plus, Sparkles, AlertCircle, Eye, Edit3, XCircle, Clock, ListFilter, Calendar, Package } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function PurchaseImport({ onNavigateHistory }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [draftOrder, setDraftOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Existing Products List from Database for matching stock & accurate price lookup
  const [existingProducts, setExistingProducts] = useState([]);

  // Draft Import Date state (defaults to current date-time)
  const [draftImportDate, setDraftImportDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Pending confirmation orders state
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
    fetchExistingProducts();
  }, []);

  const fetchExistingProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setExistingProducts(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingOrders = async () => {
    setLoadingPending(true);
    try {
      const res = await fetch('/api/purchase-orders?status=pending_confirmation');
      const data = await res.json();
      if (data.success) {
        setPendingOrders(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleSelectPendingOrder = async (orderId) => {
    setLoadingOcr(true);
    try {
      const res = await fetch(`/api/purchase-orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        const po = data.data;

        // Populate stock and correct price info for existing draft items
        const populatedItems = (po.items || []).map(item => {
          const cleanCode = (item.product_code_raw || '').trim().toUpperCase();
          const matchedProd = existingProducts.find(p => p.product_code.toUpperCase() === cleanCode);
          return {
            ...item,
            current_stock: matchedProd ? matchedProd.quantity : 0
          };
        });

        setDraftOrder({
          ...po,
          items: populatedItems
        });
        setPreviewUrl(po.invoice_image_url || null);

        if (po.import_date) {
          const dt = new Date(po.import_date);
          dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
          setDraftImportDate(dt.toISOString().slice(0, 16));
        }
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể nạp chi tiết đơn nháp');
    } finally {
      setLoadingOcr(false);
    }
  };

  // Create clean manual import draft starting with an empty line (no pre-filled dummy product)
  const handleCreateManualOrder = async () => {
    setLoadingOcr(true);
    setNotification(null);
    try {
      const res = await fetch('/api/purchase-orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          created_by: 'Chủ shop',
          items: [] // Start empty
        })
      });
      const data = await res.json();

      if (data.success) {
        // Start with 1 clean empty item line waiting for user input
        const emptyItem = {
          id: Date.now(),
          product_code_raw: '',
          product_name_raw: '',
          unit: 'EA',
          quantity: 1,
          unit_price_before_tax: 0,
          tax_rate: 8,
          import_price: 0,
          is_new_product: true,
          current_stock: 0
        };

        setDraftOrder({
          ...data.data,
          items: [emptyItem],
          total_amount: 0
        });
        fetchPendingOrders();
      } else {
        alert('Lỗi tạo đơn thủ công: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối máy chủ');
    } finally {
      setLoadingOcr(false);
    }
  };

  const handleCancelDraftOrder = async (idToCancel) => {
    const targetId = idToCancel || (draftOrder ? draftOrder.id : null);
    if (!targetId) return;

    if (window.confirm(`Bạn có chắc muốn huỷ đơn nháp #${targetId}? Đơn nháp sẽ bị loại bỏ khỏi danh sách chờ.`)) {
      try {
        const res = await fetch(`/api/purchase-orders/${targetId}/cancel`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (draftOrder && draftOrder.id === targetId) {
            setDraftOrder(null);
            setPreviewUrl(null);
          }
          fetchPendingOrders();
        } else {
          alert('Lỗi huỷ đơn: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi kết nối máy chủ');
      }
    }
  };

  // Handle file select or drag-drop for OCR
  const handleFileChange = (e) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      processOcr(selectedFile, false);
    }
  };

  const handleUseSample = () => {
    setFile(null);
    setPreviewUrl('/uploads/purchase_invoices/sample_herbalife.jpg');
    processOcr(null, true);
  };

  const processOcr = async (uploadFile, useSample = false) => {
    setLoadingOcr(true);
    setNotification(null);
    try {
      const formData = new FormData();
      if (uploadFile) {
        formData.append('image', uploadFile);
      }
      if (useSample) {
        formData.append('sample', 'true');
      }

      const res = await fetch('/api/purchase-orders/ocr', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setDraftOrder(data.data);
        fetchPendingOrders();
      } else {
        alert('Lỗi đọc OCR: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối máy chủ backend');
    } finally {
      setLoadingOcr(false);
    }
  };

  // Accurate Line item editing & Real-time Product Matching
  const handleItemChange = (index, field, value) => {
    if (!draftOrder) return;
    const newItems = [...draftOrder.items];

    let updatedItem = {
      ...newItems[index],
      [field]: value
    };

    // If user changes product_code_raw, auto-match product & calculate price accurately
    if (field === 'product_code_raw') {
      const cleanCode = value.trim().toUpperCase();
      const matchedProd = existingProducts.find(p => p.product_code.toUpperCase() === cleanCode);

      if (matchedProd) {
        const taxRate = parseFloat(updatedItem.tax_rate) || 8;
        // Calculate pre-tax price accurately from matched average import price
        const calculatedPreTax = matchedProd.avg_import_price > 0
          ? Math.round(matchedProd.avg_import_price / (1 + (taxRate / 100)))
          : 0;

        updatedItem.product_id = matchedProd.id;
        updatedItem.product_name_raw = matchedProd.product_name;
        updatedItem.unit = matchedProd.unit || 'EA';
        updatedItem.unit_price_before_tax = calculatedPreTax;
        updatedItem.is_new_product = false;
        updatedItem.current_stock = matchedProd.quantity;
      } else {
        updatedItem.product_id = null;
        updatedItem.is_new_product = true;
        updatedItem.current_stock = 0;
      }
    }

    // Recalculate import price (after tax) and total line amount
    const qty = parseInt(updatedItem.quantity, 10) || 0;
    const unitPriceBeforeTax = parseFloat(updatedItem.unit_price_before_tax) || 0;
    const taxRate = parseFloat(updatedItem.tax_rate) || 8;
    const importPrice = Math.round(unitPriceBeforeTax * (1 + taxRate / 100));

    updatedItem.import_price = importPrice;
    newItems[index] = updatedItem;

    // Recalculate total amount for draft
    const totalAmount = newItems.reduce((acc, curr) => {
      const q = parseInt(curr.quantity, 10) || 0;
      const p = curr.import_price || 0;
      return acc + (q * p);
    }, 0);

    setDraftOrder({
      ...draftOrder,
      items: newItems,
      total_amount: totalAmount
    });
  };

  const handleRemoveItem = (index) => {
    if (!draftOrder) return;
    const newItems = draftOrder.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((acc, curr) => {
      const q = parseInt(curr.quantity, 10) || 0;
      const p = curr.import_price || 0;
      return acc + (q * p);
    }, 0);

    setDraftOrder({
      ...draftOrder,
      items: newItems,
      total_amount: totalAmount
    });
  };

  const handleAddItem = () => {
    if (!draftOrder) return;
    const newItem = {
      id: Date.now(),
      product_code_raw: '',
      product_name_raw: '',
      unit: 'EA',
      quantity: 1,
      unit_price_before_tax: 0,
      tax_rate: 8,
      import_price: 0,
      is_new_product: true,
      current_stock: 0
    };
    const newItems = [...draftOrder.items, newItem];
    const totalAmount = newItems.reduce((acc, curr) => (acc + (curr.quantity * curr.import_price)), 0);

    setDraftOrder({
      ...draftOrder,
      items: newItems,
      total_amount: totalAmount
    });
  };

  // Submit confirmation
  const handleConfirmSubmit = async (selectedImportDate) => {
    if (!draftOrder) return;

    // Validate that items are not empty
    const validItems = draftOrder.items.filter(i => i.product_code_raw || i.product_name_raw);
    if (validItems.length === 0) {
      alert('Vui lòng nhập mã hoặc tên sản phẩm trước khi xác nhận nhập kho.');
      return;
    }

    setSubmitting(true);
    const finalDate = selectedImportDate || draftImportDate;

    try {
      const res = await fetch(`/api/purchase-orders/${draftOrder.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems,
          import_date: finalDate
        })
      });
      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        setNotification({
          type: 'success',
          message: `Xác nhận đơn nhập #${draftOrder.id} thành công! Đã cộng kho ngày: ${new Date(finalDate).toLocaleDateString('vi-VN')}.`
        });
        setDraftOrder(null);
        setPreviewUrl(null);
        fetchPendingOrders();
        fetchExistingProducts(); // Refresh products list
      } else {
        alert('Lỗi xác nhận: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi xác nhận');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSummary = () => {
    if (!draftOrder) return { totalItems: 0, newProductsCount: 0, totalAmount: 0 };
    const validItems = draftOrder.items.filter(i => i.product_code_raw || i.product_name_raw);
    const totalItems = validItems.length;
    const newProductsCount = validItems.filter(i => i.is_new_product).length;
    const totalAmount = validItems.reduce((acc, i) => acc + ((parseInt(i.quantity, 10) || 0) * (i.import_price || 0)), 0);
    return { totalItems, newProductsCount, totalAmount };
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
              Xem Lịch Sử Nhập Hàng
            </button>
          )}
        </div>
      )}

      {/* Pending Draft Orders Notification Bar */}
      {pendingOrders.length > 0 && !draftOrder && (
        <div className="card" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Clock color="#d97706" size={24} />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#92400e', margin: 0 }}>
                Bạn có {pendingOrders.length} đơn nhập kho nháp đang chờ xử lý!
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#b45309', margin: '2px 0 0 0' }}>
                Bấm vào đơn nháp bên dưới để tiếp tục kiểm tra, sửa lùi ngày nhập kho và cộng kho.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {pendingOrders.map(po => (
              <div
                key={po.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #fde68a',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleSelectPendingOrder(po.id)}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                    Đơn Nháp #{po.id} {po.invoice_image_url ? '(OCR)' : '(Thủ công)'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {po.item_count || 0} mặt hàng • {po.total_amount ? po.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                    onClick={(e) => { e.stopPropagation(); handleSelectPendingOrder(po.id); }}
                  >
                    <Edit3 size={14} /> Xử lý
                  </button>
                  <button
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                    onClick={(e) => { e.stopPropagation(); handleCancelDraftOrder(po.id); }}
                    title="Huỷ đơn nháp này"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Upload / Manual Import Option */}
      {!draftOrder && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <UploadCloud color="#059669" size={24} />
              Tạo Đơn Nhập Hàng Herbalife Mới
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={handleCreateManualOrder}>
                <Edit3 size={16} color="#059669" />
                Nhập Hàng Thủ Công
              </button>
              <button className="btn btn-secondary" onClick={handleUseSample}>
                <Sparkles size={16} color="#059669" />
                Thử Mẫu Hoá Đơn Herbalife VAT
              </button>
            </div>
          </div>

          <div
            className="upload-dropzone"
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div className="upload-icon-wrapper">
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Kéo thả hoặc bấm để chọn tệp hoá đơn VAT Herbalife
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
              Hỗ trợ tệp <strong>JPG, JPEG, PNG, WEBP và PDF</strong>. Hệ thống OCR sẽ tự động bóc tách Mã SP, Tên SP, ĐVT, Số lượng & Đơn giá trước thuế (8% VAT).
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="button">
                Quét Tệp Hoá Đơn (OCR)
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={(e) => { e.stopPropagation(); handleCreateManualOrder(); }}
              >
                Nhập Hàng Thủ Công
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingOcr && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div className="upload-icon-wrapper" style={{ animation: 'spin 1.5s linear infinite' }}>
            <Sparkles size={32} color="#059669" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#064e3b', marginBottom: '0.5rem' }}>
            Đang Xử Lý Đơn Nhập Hàng Herbalife...
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Vui lòng chờ trong giây lát. Hệ thống đang phân tích các dòng sản phẩm, tính toán giá vốn và đối soát kho.
          </p>
        </div>
      )}

      {draftOrder && !loadingOcr && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <FileText color="#059669" size={24} />
                Bảng Kiểm Tra & Chỉnh Sửa Đơn Nhập Hàng (Bản Nháp #{draftOrder.id})
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                Trạng thái: <span className="badge badge-pending">Chờ Xác Nhận</span> — Nhập Mã SP (VD: 0065, 0146...) để tự động điền Tên SP, Giá & Tồn Kho hiện tại.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-danger" onClick={() => handleCancelDraftOrder(draftOrder.id)}>
                <XCircle size={16} /> Huỷ Đơn Nháp
              </button>
              <button className="btn btn-secondary" onClick={() => setDraftOrder(null)}>
                Đóng / Chọn Đơn Khác
              </button>
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <CheckCircle size={18} />
                Xác Nhận Nhập Hàng
              </button>
            </div>
          </div>

          {/* Direct Backdated Date Time Selector Toolbar */}
          <div style={{
            backgroundColor: '#eff6ff',
            border: '1.5px solid #3b82f6',
            borderRadius: '0.75rem',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar color="#2563eb" size={20} />
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#1e40af', display: 'block' }}>
                  📅 Ngày Giờ Nhập Kho (Chỉnh sửa trực tiếp lùi ngày tháng trước):
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#3b82f6' }}>
                  Thay đổi ngày giờ tại đây để ghi nhận nhập bổ sung cho các tháng cũ
                </span>
              </div>
            </div>

            <input
              type="datetime-local"
              className="table-input"
              style={{ width: '220px', padding: '0.45rem 0.65rem', fontWeight: 800, fontSize: '0.9rem', color: '#1e3a8a', backgroundColor: '#ffffff' }}
              value={draftImportDate}
              onChange={(e) => setDraftImportDate(e.target.value)}
            />
          </div>

          {previewUrl && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Eye size={20} color="#059669" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ảnh Hoá Đơn Gốc Đã Upload</span>
              </div>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600, textDecoration: 'none' }}
              >
                Mở xem ảnh lớn
              </a>
            </div>
          )}

          <div className="table-container" style={{ marginBottom: '1.5rem' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th style={{ width: '130px' }}>Mã SP</th>
                  <th>Tên Sản Phẩm</th>
                  <th style={{ width: '70px' }}>ĐVT</th>
                  <th style={{ width: '90px' }}>Số Lượng</th>
                  <th style={{ width: '140px' }}>Đơn Giá Trước Thuế (đ)</th>
                  <th style={{ width: '75px' }}>Thuế (%)</th>
                  <th style={{ width: '130px' }}>Giá Nhập (gồm thuế)</th>
                  <th style={{ width: '140px' }}>Thành Tiền (đ)</th>
                  <th style={{ width: '160px' }}>Trạng Thái & Tồn Hiện Tại</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {draftOrder.items.map((item, idx) => {
                  const qty = parseInt(item.quantity, 10) || 0;
                  const importPrice = item.import_price || 0;
                  const lineTotal = qty * importPrice;

                  // Find matched product in db for stock info display
                  const cleanCode = (item.product_code_raw || '').trim().toUpperCase();
                  const matchedProd = existingProducts.find(p => p.product_code.toUpperCase() === cleanCode);

                  return (
                    <tr key={item.id || idx}>
                      <td>{idx + 1}</td>

                      {/* Product Code Input with suggestions list */}
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          style={{ fontWeight: 700, color: '#064e3b' }}
                          value={item.product_code_raw || ''}
                          onChange={(e) => handleItemChange(idx, 'product_code_raw', e.target.value)}
                          placeholder="Mã SP (VD: 0065)"
                          list="existing-product-codes"
                        />
                      </td>

                      {/* Product Name Input */}
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          value={item.product_name_raw || ''}
                          onChange={(e) => handleItemChange(idx, 'product_name_raw', e.target.value)}
                          placeholder="Tên sản phẩm"
                        />
                      </td>

                      {/* Unit Input */}
                      <td>
                        <input
                          type="text"
                          className="table-input"
                          value={item.unit || 'EA'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        />
                      </td>

                      {/* Quantity Input */}
                      <td>
                        <input
                          type="number"
                          min="1"
                          className="table-input"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        />
                      </td>

                      {/* Unit Price Before Tax */}
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={item.unit_price_before_tax}
                          onChange={(e) => handleItemChange(idx, 'unit_price_before_tax', e.target.value)}
                        />
                      </td>

                      {/* Tax Rate % */}
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={item.tax_rate}
                          onChange={(e) => handleItemChange(idx, 'tax_rate', e.target.value)}
                        />
                      </td>

                      <td style={{ fontWeight: 600, color: '#047857' }}>
                        {importPrice.toLocaleString('vi-VN')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#064e3b' }}>
                        {lineTotal.toLocaleString('vi-VN')}
                      </td>

                      {/* Existing Stock Info Display Badge */}
                      <td>
                        {matchedProd ? (
                          <div style={{ fontSize: '0.78rem' }}>
                            <span className="badge badge-exist" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Package size={12} /> Đã có trong kho
                            </span>
                            <span style={{ display: 'block', color: '#059669', fontWeight: 800, marginTop: '2px' }}>
                              Tồn khả dụng: {matchedProd.quantity} {matchedProd.unit}
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-new">SP Mới (Tồn: 0)</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          onClick={() => handleRemoveItem(idx)}
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

          {/* Datalist for existing product code suggestions */}
          <datalist id="existing-product-codes">
            {existingProducts.map(p => (
              <option key={p.id} value={p.product_code}>
                {p.product_code} - {p.product_name} (Tồn: {p.quantity} {p.unit})
              </option>
            ))}
          </datalist>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={handleAddItem}>
              <Plus size={16} /> Thêm Dòng Sản Phẩm Mới
            </button>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Tổng Tiền Nhập Hàng Sau Thuế: </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginLeft: '0.5rem' }}>
                {draftOrder.total_amount ? draftOrder.total_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal with Backdated Import Date Selector */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        summary={calculateSummary()}
        loading={submitting}
      />
    </div>
  );
}
