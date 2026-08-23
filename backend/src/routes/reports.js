const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * Helper to parse month and year or default to current date
 */
function getMonthYear(req) {
  const now = new Date();
  const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  return { month, year };
}

/**
 * 1. GET /api/reports/monthly
 * Returns Monthly Statistics & Monthly Inventory Roll-Forward (NXT) Table with Opening and Closing Inventory Values
 */
router.get('/monthly', (req, res) => {
  try {
    const { month, year } = getMonthYear(req);

    const mStr = month.toString().padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();

    const startOfMonth = `${year}-${mStr}-01T00:00:00.000Z`;
    const endOfMonth = `${year}-${mStr}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`;

    // 1. Monthly Revenue & Profit from sales_orders and sales_order_details
    const salesStmt = db.prepare(`
      SELECT
        COALESCE(SUM(so.total_amount), 0) as monthly_revenue,
        COALESCE(SUM(so.paid_amount), 0) as monthly_collected,
        COUNT(so.id) as monthly_order_count
      FROM sales_orders so
      WHERE so.sale_date >= ? AND so.sale_date <= ?
    `);
    const salesSummary = salesStmt.get(startOfMonth, endOfMonth);

    // Monthly Cost of Goods Sold & Sold Quantity
    const soldStmt = db.prepare(`
      SELECT
        COALESCE(SUM(sod.quantity), 0) as monthly_sold_qty,
        COALESCE(SUM(sod.cost_of_goods_sold), 0) as monthly_cost_of_goods_sold
      FROM sales_order_details sod
      JOIN sales_orders so ON sod.sales_order_id = so.id
      WHERE so.sale_date >= ? AND so.sale_date <= ?
    `);
    const soldSummary = soldStmt.get(startOfMonth, endOfMonth);

    const monthlyRevenue = salesSummary.monthly_revenue;
    const monthlyCostOfGoodsSold = soldSummary.monthly_cost_of_goods_sold;
    const monthlyProfit = monthlyRevenue - monthlyCostOfGoodsSold;
    const monthlySoldQty = soldSummary.monthly_sold_qty;

    // Monthly Imported Quantity & Import Cost from confirmed purchase orders
    const importStmt = db.prepare(`
      SELECT
        COALESCE(SUM(pod.quantity), 0) as monthly_imported_qty,
        COALESCE(SUM(pod.quantity * pod.import_price), 0) as monthly_imported_cost
      FROM purchase_order_details pod
      JOIN purchase_orders po ON pod.purchase_order_id = po.id
      WHERE po.status = 'confirmed' AND po.import_date >= ? AND po.import_date <= ?
    `);
    const importSummary = importStmt.get(startOfMonth, endOfMonth);

    // 2. Inventory Roll-Forward (Nhập - Xuất - Tồn NXT) per product with Values
    const products = db.prepare('SELECT id, product_code, product_name, unit FROM products ORDER BY id ASC').all();

    const getAvgImportPriceStmt = db.prepare(`
      SELECT COALESCE(SUM(pod.quantity * pod.import_price) / NULLIF(SUM(pod.quantity), 0), 0) as avg_price
      FROM purchase_order_details pod
      JOIN purchase_orders po ON pod.purchase_order_id = po.id
      WHERE po.status = 'confirmed' AND pod.product_id = ?
    `);

    const importedBeforeStmt = db.prepare(`
      SELECT COALESCE(SUM(pod.quantity), 0) as qty
      FROM purchase_order_details pod
      JOIN purchase_orders po ON pod.purchase_order_id = po.id
      WHERE po.status = 'confirmed' AND pod.product_id = ? AND po.import_date < ?
    `);

    const soldBeforeStmt = db.prepare(`
      SELECT COALESCE(SUM(sod.quantity), 0) as qty
      FROM sales_order_details sod
      JOIN sales_orders so ON sod.sales_order_id = so.id
      WHERE sod.product_id = ? AND so.sale_date < ?
    `);

    const importedMonthStmt = db.prepare(`
      SELECT COALESCE(SUM(pod.quantity), 0) as qty, COALESCE(SUM(pod.quantity * pod.import_price), 0) as cost
      FROM purchase_order_details pod
      JOIN purchase_orders po ON pod.purchase_order_id = po.id
      WHERE po.status = 'confirmed' AND pod.product_id = ? AND po.import_date >= ? AND po.import_date <= ?
    `);

    const soldMonthStmt = db.prepare(`
      SELECT COALESCE(SUM(sod.quantity), 0) as qty, COALESCE(SUM(sod.cost_of_goods_sold), 0) as cogs
      FROM sales_order_details sod
      JOIN sales_orders so ON sod.sales_order_id = so.id
      WHERE sod.product_id = ? AND so.sale_date >= ? AND so.sale_date <= ?
    `);

    let totalOpeningValue = 0;
    let totalImportedValue = 0;
    let totalSoldValue = 0;
    let totalClosingValue = 0;

    const nxtTable = products.map(p => {
      const avgPrice = getAvgImportPriceStmt.get(p.id).avg_price || 0;

      const impBefore = importedBeforeStmt.get(p.id, startOfMonth).qty;
      const soldBefore = soldBeforeStmt.get(p.id, startOfMonth).qty;
      const openingStock = Math.max(0, impBefore - soldBefore);
      const openingValue = Math.round(openingStock * avgPrice);

      const inMonthImp = importedMonthStmt.get(p.id, startOfMonth, endOfMonth);
      const inMonthImportQty = inMonthImp.qty;
      const inMonthImportCost = inMonthImp.cost;

      const inMonthSold = soldMonthStmt.get(p.id, startOfMonth, endOfMonth);
      const inMonthSoldQty = inMonthSold.qty;
      const inMonthSoldCost = inMonthSold.cogs;

      const closingStock = Math.max(0, openingStock + inMonthImportQty - inMonthSoldQty);
      const closingValue = Math.round(closingStock * avgPrice);

      totalOpeningValue += openingValue;
      totalImportedValue += inMonthImportCost;
      totalSoldValue += inMonthSoldCost;
      totalClosingValue += closingValue;

      return {
        product_id: p.id,
        product_code: p.product_code,
        product_name: p.product_name,
        unit: p.unit,
        avg_import_price: avgPrice,
        opening_stock: openingStock,       // Tồn Đầu Số Lượng
        opening_value: openingValue,       // Tồn Đầu Giá Trị (đ)
        imported_qty: inMonthImportQty,   // Nhập Số Lượng
        imported_value: inMonthImportCost, // Nhập Giá Trị (đ)
        sold_qty: inMonthSoldQty,         // Xuất Số Lượng
        sold_value: inMonthSoldCost,       // Xuất Giá Trị (đ)
        closing_stock: closingStock,       // Tồn Cuối Số Lượng
        closing_value: closingValue        // Tồn Cuối Giá Trị (đ)
      };
    });

    res.json({
      success: true,
      data: {
        month,
        year,
        summary: {
          monthly_revenue: monthlyRevenue,
          monthly_cost_of_goods_sold: monthlyCostOfGoodsSold,
          monthly_profit: monthlyProfit,
          monthly_imported_qty: importSummary.monthly_imported_qty,
          monthly_imported_cost: importSummary.monthly_imported_cost,
          monthly_sold_qty: monthlySoldQty,
          monthly_order_count: salesSummary.monthly_order_count,
          total_opening_inventory_value: totalOpeningValue, // Giá trị tồn đầu kỳ
          total_closing_inventory_value: totalClosingValue  // Giá trị tồn cuối kỳ
        },
        nxt_table: nxtTable
      }
    });
  } catch (err) {
    console.error('[Reports API] Monthly Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. GET /api/reports/yearly
 * Returns Yearly Statistics & 12-Month Breakdown Trend
 */
router.get('/yearly', (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    const startOfYear = `${year}-01-01T00:00:00.000Z`;
    const endOfYear = `${year}-12-31T23:59:59.999Z`;

    // 1. Overall Yearly Revenue, Cost, Profit
    const yearlyRevenue = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM sales_orders
      WHERE sale_date >= ? AND sale_date <= ?
    `).get(startOfYear, endOfYear).revenue;

    const yearlyCostAndSold = db.prepare(`
      SELECT
        COALESCE(SUM(sod.quantity), 0) as sold_qty,
        COALESCE(SUM(sod.cost_of_goods_sold), 0) as cogs
      FROM sales_order_details sod
      JOIN sales_orders so ON sod.sales_order_id = so.id
      WHERE so.sale_date >= ? AND so.sale_date <= ?
    `).get(startOfYear, endOfYear);

    const yearlyImported = db.prepare(`
      SELECT COALESCE(SUM(pod.quantity), 0) as imported_qty
      FROM purchase_order_details pod
      JOIN purchase_orders po ON pod.purchase_order_id = po.id
      WHERE po.status = 'confirmed' AND po.import_date >= ? AND po.import_date <= ?
    `).get(startOfYear, endOfYear).imported_qty;

    const yearlyProfit = yearlyRevenue - yearlyCostAndSold.cogs;

    // 2. 12 Monthly Trend Breakdown Array
    const monthlyBreakdown = [];

    for (let m = 1; m <= 12; m++) {
      const mStr = m.toString().padStart(2, '0');
      const lastDay = new Date(year, m, 0).getDate();
      const mStart = `${year}-${mStr}-01T00:00:00.000Z`;
      const mEnd = `${year}-${mStr}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`;

      const mRevenue = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as rev
        FROM sales_orders
        WHERE sale_date >= ? AND sale_date <= ?
      `).get(mStart, mEnd).rev;

      const mCogs = db.prepare(`
        SELECT COALESCE(SUM(sod.cost_of_goods_sold), 0) as cogs
        FROM sales_order_details sod
        JOIN sales_orders so ON sod.sales_order_id = so.id
        WHERE so.sale_date >= ? AND so.sale_date <= ?
      `).get(mStart, mEnd).cogs;

      const mImported = db.prepare(`
        SELECT COALESCE(SUM(pod.quantity), 0) as qty
        FROM purchase_order_details pod
        JOIN purchase_orders po ON pod.purchase_order_id = po.id
        WHERE po.status = 'confirmed' AND po.import_date >= ? AND po.import_date <= ?
      `).get(mStart, mEnd).qty;

      const mSold = db.prepare(`
        SELECT COALESCE(SUM(sod.quantity), 0) as qty
        FROM sales_order_details sod
        JOIN sales_orders so ON sod.sales_order_id = so.id
        WHERE so.sale_date >= ? AND so.sale_date <= ?
      `).get(mStart, mEnd).qty;

      monthlyBreakdown.push({
        month: m,
        revenue: mRevenue,
        cogs: mCogs,
        profit: mRevenue - mCogs,
        imported_qty: mImported,
        sold_qty: mSold
      });
    }

    res.json({
      success: true,
      data: {
        year,
        summary: {
          yearly_revenue: yearlyRevenue,
          yearly_cogs: yearlyCostAndSold.cogs,
          yearly_profit: yearlyProfit,
          yearly_imported_qty: yearlyImported,
          yearly_sold_qty: yearlyCostAndSold.sold_qty
        },
        monthly_breakdown: monthlyBreakdown
      }
    });
  } catch (err) {
    console.error('[Reports API] Yearly Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/reports/top-products
 * Returns Top Selling Products ranked by total quantity sold & total revenue
 */
router.get('/top-products', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const topProducts = db.prepare(`
      SELECT
        p.id,
        p.product_code,
        p.product_name,
        p.unit,
        p.quantity as current_stock,
        COALESCE(SUM(sod.quantity), 0) as total_sold_qty,
        COALESCE(SUM(sod.quantity * sod.selling_price), 0) as total_revenue,
        COALESCE(SUM(sod.quantity * sod.selling_price - sod.cost_of_goods_sold), 0) as total_profit
      FROM products p
      LEFT JOIN sales_order_details sod ON p.id = sod.product_id
      GROUP BY p.id
      ORDER BY total_sold_qty DESC, total_revenue DESC
      LIMIT ?
    `).all(limit);

    res.json({ success: true, data: topProducts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET /api/reports/unpaid-orders
 * Returns list of unpaid/partially paid sales orders and total unpaid debt
 */
router.get('/unpaid-orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT
        so.*,
        c.full_name as customer_name,
        c.phone as customer_phone,
        (so.total_amount - so.paid_amount) as remaining_debt
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      WHERE so.payment_status != 'paid'
      ORDER BY remaining_debt DESC
    `).all();

    const totalUnpaidDebt = orders.reduce((acc, o) => acc + o.remaining_debt, 0);

    res.json({
      success: true,
      data: {
        total_unpaid_debt: totalUnpaidDebt,
        order_count: orders.length,
        orders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
