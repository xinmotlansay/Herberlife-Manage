import React, { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, Package, ShoppingCart, Calendar, ArrowRightLeft,
  Award, AlertTriangle, RefreshCw, BarChart2, CheckCircle2, Clock, Layers, Archive, Printer
} from 'lucide-react';

export default function Statistics() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [unpaidOrders, setUnpaidOrders] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllReports();
  }, [selectedMonth, selectedYear]);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [mRes, yRes, topRes, unpRes] = await Promise.all([
        fetch(`/api/reports/monthly?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/reports/yearly?year=${selectedYear}`),
        fetch('/api/reports/top-products?limit=5'),
        fetch('/api/reports/unpaid-orders')
      ]);

      const mData = await mRes.json();
      const yData = await yRes.json();
      const topData = await topRes.json();
      const unpData = await unpRes.json();

      if (mData.success) setMonthlyData(mData.data);
      if (yData.success) setYearlyData(yData.data);
      if (topData.success) setTopProducts(topData.data);
      if (unpData.success) setUnpaidOrders(unpData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetCurrentMonth = () => {
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  };

  const handlePrint = () => {
    window.print();
  };

  const mSummary = monthlyData ? monthlyData.summary : {};
  const ySummary = yearlyData ? yearlyData.summary : {};
  const nxtList = monthlyData ? (monthlyData.nxt_table || []) : [];

  // Totals for NXT Summary Table Footer
  const totalNxtOpeningValue = nxtList.reduce((acc, r) => acc + (r.opening_value || 0), 0);
  const totalNxtImportedValue = nxtList.reduce((acc, r) => acc + (r.imported_value || 0), 0);
  const totalNxtSoldValue = nxtList.reduce((acc, r) => acc + (r.sold_value || 0), 0);
  const totalNxtClosingValue = nxtList.reduce((acc, r) => acc + (r.closing_value || 0), 0);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }} className="print-area">
      
      {/* Header Selector Bar */}
      <div className="card no-print" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart2 color="#059669" size={26} />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#064e3b', margin: 0 }}>
                Thống Kê Doanh Thu, Lợi Nhuận & Báo Cáo Nhập - Xuất - Tồn (NXT)
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Đầy đủ Giá trị Hàng tồn đầu kỳ, Tồn cuối kỳ và kết chuyển số dư giữa các tháng
              </span>
            </div>
          </div>

          {/* Month & Year Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Tháng:</span>
              <select
                className="table-input"
                style={{ width: '110px', padding: '0.45rem 0.65rem', fontWeight: 700 }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Năm:</span>
              <select
                className="table-input"
                style={{ width: '110px', padding: '0.45rem 0.65rem', fontWeight: 700 }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              >
                {[2026, 2025, 2024, 2023].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }} onClick={handleResetCurrentMonth}>
              <RefreshCw size={14} /> Tháng Hiện Tại
            </button>

            <button className="btn btn-primary" style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem', fontWeight: 700 }} onClick={handlePrint}>
              <Printer size={15} /> In Báo Cáo / PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>Đang tính toán thống kê tài chính và kết chuyển tồn kho...</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: MONTHLY FINANCIAL & INVENTORY VALUE KPI CARDS */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={18} color="#059669" />
              1. Thống Kê Chi Tiết & Giá Trị Hàng Tồn Tháng {selectedMonth}/{selectedYear}:
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {/* Revenue Card */}
              <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Doanh Thu Tháng {selectedMonth}</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#064e3b', marginTop: '0.2rem' }}>
                  {mSummary.monthly_revenue ? mSummary.monthly_revenue.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.4rem' }}>
                  {mSummary.monthly_order_count || 0} đơn bán hàng trong tháng
                </div>
              </div>

              {/* Profit Card */}
              <div className="card" style={{ marginBottom: 0, padding: '1.25rem', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Lợi Nhuận Gộp Tháng</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857', marginTop: '0.2rem' }}>
                  {mSummary.monthly_profit ? mSummary.monthly_profit.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.4rem' }}>
                  (Đã trừ giá vốn xuất kho FIFO)
                </div>
              </div>

              {/* Order Count Card */}
              <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Số Lượng Bán Trong Tháng</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#d97706', marginTop: '0.2rem' }}>
                  {mSummary.monthly_sold_qty || 0} SP
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                  Giá vốn xuất: {mSummary.monthly_cost_of_goods_sold ? mSummary.monthly_cost_of_goods_sold.toLocaleString('vi-VN') + 'đ' : '0đ'}
                </div>
              </div>
            </div>

            {/* OPENING & CLOSING INVENTORY VALUE CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              
              {/* Opening Inventory Value Card */}
              <div className="card" style={{ marginBottom: 0, padding: '1.25rem', backgroundColor: '#f8fafc', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                      🏢 GIÁ TRỊ HÀNG TỒN ĐẦU KỲ (THÁNG {selectedMonth})
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e40af', marginTop: '0.25rem' }}>
                      {totalNxtOpeningValue.toLocaleString('vi-VN')} đ
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      (Kết chuyển từ giá trị tồn cuối tháng trước)
                    </span>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#dbeafe', borderRadius: '0.75rem', color: '#1e40af' }}>
                    <Archive size={28} />
                  </div>
                </div>
              </div>

              {/* Closing Inventory Value Card */}
              <div className="card" style={{ marginBottom: 0, padding: '1.25rem', backgroundColor: '#ecfdf5', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>
                      🏬 GIÁ TRỊ HÀNG TỒN CUỐI KỲ (THÁNG {selectedMonth})
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#064e3b', marginTop: '0.25rem' }}>
                      {totalNxtClosingValue.toLocaleString('vi-VN')} đ
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#059669' }}>
                      (Tự động chuyển thành giá trị tồn đầu tháng sau)
                    </span>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#d1fae5', borderRadius: '0.75rem', color: '#047857' }}>
                    <Package size={28} />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: INVENTORY ROLL-FORWARD (NHẬP - XUẤT - TỒN NXT) TABLE WITH VALUES */}
          <div className="card" style={{ marginBottom: '1.75rem' }}>
            <div className="card-header">
              <div className="card-title">
                <ArrowRightLeft color="#059669" size={24} />
                2. Báo Cáo Nhập - Xuất - Tồn Kho (Kế Chuyển Tồn Đầu & Tồn Cuối Kỳ Tháng {selectedMonth}/{selectedYear})
              </div>
            </div>

            <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
              💡 <strong>Giá trị hàng tồn:</strong> <strong style={{ color: '#1e40af' }}>Tồn Đầu Kỳ (đ)</strong> được tính theo giá nhập bình quân kết chuyển từ cuối tháng trước. <strong style={{ color: '#047857' }}>Tồn Cuối Kỳ (đ)</strong> = Tồn Đầu + Nhập Trong Kỳ - Xuất Trong Kỳ.
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '70px' }}>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th style={{ width: '60px' }}>ĐVT</th>
                    <th style={{ width: '160px', textAlign: 'right', backgroundColor: '#eff6ff' }}>
                      1. Tồn Đầu Kỳ (SL / Giá Trị)
                    </th>
                    <th style={{ width: '160px', textAlign: 'right' }}>
                      2. Nhập Trong Kỳ (SL / Giá Trị)
                    </th>
                    <th style={{ width: '160px', textAlign: 'right' }}>
                      3. Xuất Trong Kỳ (SL / Giá Trị)
                    </th>
                    <th style={{ width: '180px', textAlign: 'right', backgroundColor: '#ecfdf5', color: '#064e3b' }}>
                      4. Tồn Cuối Kỳ (SL / Giá Trị)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {nxtList.map((row) => (
                    <tr key={row.product_id}>
                      <td style={{ fontWeight: 700, color: '#064e3b', fontSize: '0.8rem' }}>#{row.product_code}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{row.product_name}</td>
                      <td>{row.unit}</td>

                      {/* 1. Tồn Đầu Kỳ (Số lượng & Giá trị) */}
                      <td style={{ textAlign: 'right', backgroundColor: '#f8fafc' }}>
                        <strong style={{ display: 'block', color: '#1e40af' }}>{row.opening_stock} {row.unit}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {row.opening_value ? row.opening_value.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                        </span>
                      </td>

                      {/* 2. Nhập Trong Kỳ (Số lượng & Giá trị) */}
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', color: row.imported_qty > 0 ? '#2563eb' : '#94a3b8' }}>
                          +{row.imported_qty} {row.unit}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {row.imported_value ? row.imported_value.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                        </span>
                      </td>

                      {/* 3. Xuất Trong Kỳ (Số lượng & Giá trị) */}
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ display: 'block', color: row.sold_qty > 0 ? '#d97706' : '#94a3b8' }}>
                          -{row.sold_qty} {row.unit}
                        </strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {row.sold_value ? row.sold_value.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                        </span>
                      </td>

                      {/* 4. Tồn Cuối Kỳ (Số lượng & Giá trị) */}
                      <td style={{ textAlign: 'right', backgroundColor: '#ecfdf5' }}>
                        <strong style={{ display: 'block', color: '#047857', fontSize: '0.95rem' }}>
                          = {row.closing_stock} {row.unit}
                        </strong>
                        <span style={{ fontSize: '0.82rem', color: '#064e3b', fontWeight: 800 }}>
                          {row.closing_value ? row.closing_value.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* NXT Table Summary Total Row */}
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 800 }}>
                    <td colSpan="3" style={{ textAlign: 'right', color: '#0f172a', fontSize: '0.9rem' }}>
                      TỔNG CỘNG GIÁ TRỊ TOÀN KHO:
                    </td>
                    <td style={{ textAlign: 'right', color: '#1e40af', fontSize: '0.95rem' }}>
                      {totalNxtOpeningValue.toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ textAlign: 'right', color: '#2563eb', fontSize: '0.95rem' }}>
                      {totalNxtImportedValue.toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ textAlign: 'right', color: '#d97706', fontSize: '0.95rem' }}>
                      {totalNxtSoldValue.toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ textAlign: 'right', color: '#064e3b', fontSize: '1rem', backgroundColor: '#d1fae5' }}>
                      {totalNxtClosingValue.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* SECTION 3: YEARLY STATS & 12-MONTH TREND */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={18} color="#059669" />
              3. Thống Kê Tổng Quan Cả Năm {selectedYear}:
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              
              <div className="card" style={{ marginBottom: 0, padding: '1.1rem', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Doanh Thu Cả Năm {selectedYear}</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', marginTop: '0.15rem' }}>
                  {ySummary.yearly_revenue ? ySummary.yearly_revenue.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 0, padding: '1.1rem', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>Lợi Nhuận Cả Năm {selectedYear}</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#047857', marginTop: '0.15rem' }}>
                  {ySummary.yearly_profit ? ySummary.yearly_profit.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 0, padding: '1.1rem', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Nhập Cả Năm</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.15rem' }}>
                  {ySummary.yearly_imported_qty || 0} SP
                </div>
              </div>

              <div className="card" style={{ marginBottom: 0, padding: '1.1rem', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Bán Cả Năm</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', marginTop: '0.15rem' }}>
                  {ySummary.yearly_sold_qty || 0} SP
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 4: 12-MONTH YEARLY BREAKDOWN & TOP SELLING PRODUCTS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
            
            {/* 12 Monthly Breakdown Table */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  <TrendingUp color="#059669" size={20} />
                  Biểu Đồ & Xu Hướng 12 Tháng Năm {selectedYear}
                </div>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Doanh Thu (đ)</th>
                      <th>Lợi Nhuận (đ)</th>
                      <th>Nhập / Bán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData && yearlyData.monthly_breakdown && yearlyData.monthly_breakdown.map((m) => (
                      <tr key={m.month} style={{ backgroundColor: m.month === selectedMonth ? '#ecfdf5' : 'transparent' }}>
                        <td style={{ fontWeight: 700, color: m.month === selectedMonth ? '#047857' : '#0f172a' }}>
                          Tháng {m.month} {m.month === selectedMonth ? '👈' : ''}
                        </td>
                        <td style={{ fontWeight: 700, color: '#064e3b' }}>
                          {m.revenue ? m.revenue.toLocaleString('vi-VN') + ' đ' : '-'}
                        </td>
                        <td style={{ fontWeight: 700, color: m.profit > 0 ? '#059669' : '#64748b' }}>
                          {m.profit ? m.profit.toLocaleString('vi-VN') + ' đ' : '-'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                          📥 {m.imported_qty} / 📤 {m.sold_qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  <Award color="#059669" size={20} />
                  Top 5 Sản Phẩm Bán Chạy Nhất
                </div>
              </div>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Hạng</th>
                      <th>Sản Phẩm</th>
                      <th style={{ width: '90px' }}>Đã Bán</th>
                      <th>Doanh Thu (đ)</th>
                      <th>Lợi Nhuận (đ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 800, color: idx === 0 ? '#d97706' : '#64748b' }}>
                          #{idx + 1}
                        </td>
                        <td>
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.85rem' }}>{p.product_name}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>#{p.product_code}</span>
                        </td>
                        <td style={{ fontWeight: 800, color: '#059669' }}>
                          {p.total_sold_qty} {p.unit}
                        </td>
                        <td style={{ fontWeight: 700, color: '#064e3b' }}>
                          {p.total_revenue ? p.total_revenue.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#047857' }}>
                          {p.total_profit ? p.total_profit.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* SECTION 5: UNPAID ORDERS & OUTSTANDING DEBT */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '0.95rem' }}>
                <AlertTriangle color="#d97706" size={20} />
                Thống Kê Đơn Hàng Chưa Thanh Toán ({unpaidOrders ? unpaidOrders.order_count : 0} Đơn Nợ)
              </div>

              {unpaidOrders && (
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#b45309', backgroundColor: '#fffbeb', padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #fde68a' }}>
                  Tổng nợ cần thu hồi: {unpaidOrders.total_unpaid_debt.toLocaleString('vi-VN')} đ
                </div>
              )}
            </div>

            {!unpaidOrders || unpaidOrders.orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#059669' }}>
                <CheckCircle2 size={36} style={{ marginBottom: '0.4rem' }} />
                <p style={{ fontWeight: 700 }}>Tất cả các đơn bán hàng đã được thanh toán đầy đủ!</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Mã Đơn</th>
                      <th>Khách Hàng Mua</th>
                      <th>Ngày Bán</th>
                      <th>Tổng Tiền Đơn (đ)</th>
                      <th>Đã Trả (đ)</th>
                      <th>Còn Nợ Đọng (đ)</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidOrders.orders.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 700, color: '#064e3b' }}>#{o.id}</td>
                        <td style={{ fontWeight: 600 }}>{o.customer_name} ({o.customer_phone || 'Chưa có SĐT'})</td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {new Date(o.sale_date || o.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ fontWeight: 700 }}>{o.total_amount.toLocaleString('vi-VN')} đ</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>{o.paid_amount.toLocaleString('vi-VN')} đ</td>
                        <td style={{ color: '#b45309', fontWeight: 800, fontSize: '0.95rem' }}>
                          {o.remaining_debt.toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          {o.payment_status === 'partial' ? (
                            <span className="badge badge-pending"><Clock size={12} /> Trả 1 Phần</span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}><AlertTriangle size={12} /> Chưa Trả</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
