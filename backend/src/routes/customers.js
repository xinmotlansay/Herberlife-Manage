const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * Helper function to re-calculate customer total_debt
 */
function recalculateCustomerDebt(customerId) {
  const result = db.prepare(`
    SELECT SUM(total_amount - paid_amount) as total_debt
    FROM sales_orders
    WHERE customer_id = ? AND payment_status != 'paid'
  `).get(customerId);

  const totalDebt = result && result.total_debt ? Math.max(0, result.total_debt) : 0;
  db.prepare('UPDATE customers SET total_debt = ? WHERE id = ?').run(totalDebt, customerId);
  return totalDebt;
}

/**
 * GET /api/customers
 * List all customers with total_debt and order count
 */
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY id DESC';

    const customers = db.prepare(query).all(...params);

    const getOrderStats = db.prepare(`
      SELECT COUNT(*) as order_count, SUM(total_amount - paid_amount) as calc_debt
      FROM sales_orders
      WHERE customer_id = ?
    `);

    const result = customers.map(c => {
      const stats = getOrderStats.get(c.id);
      // Recalculate debt dynamically
      const calcDebt = stats && stats.calc_debt ? Math.max(0, stats.calc_debt) : 0;
      return {
        ...c,
        total_debt: calcDebt,
        order_count: stats ? stats.order_count : 0
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Customers API] GET Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/customers/:id
 * Get customer detail with sales order history and payment history
 */
router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng' });
    }

    const orders = db.prepare(`
      SELECT * FROM sales_orders
      WHERE customer_id = ?
      ORDER BY sale_date DESC
    `).all(req.params.id);

    const getPayments = db.prepare('SELECT * FROM payments WHERE sales_order_id = ? ORDER BY payment_date DESC');
    const getOrderItems = db.prepare(`
      SELECT sod.*, p.product_name, p.product_code
      FROM sales_order_details sod
      JOIN products p ON sod.product_id = p.id
      WHERE sod.sales_order_id = ?
    `);

    const enrichedOrders = orders.map(o => ({
      ...o,
      remaining_debt: Math.max(0, o.total_amount - o.paid_amount),
      payments: getPayments.all(o.id),
      items: getOrderItems.all(o.id)
    }));

    const calcDebt = enrichedOrders
      .filter(o => o.payment_status !== 'paid')
      .reduce((acc, o) => acc + o.remaining_debt, 0);

    res.json({
      success: true,
      data: {
        ...customer,
        total_debt: calcDebt,
        orders: enrichedOrders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', (req, res) => {
  try {
    const { full_name, phone } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Họ và tên khách hàng không được để trống' });
    }

    const name = full_name.trim();
    const cleanPhone = phone ? phone.trim() : null;

    const stmt = db.prepare(`
      INSERT INTO customers (full_name, phone, total_debt)
      VALUES (?, ?, 0)
    `);

    const result = stmt.run(name, cleanPhone);

    res.json({
      success: true,
      message: 'Tạo khách hàng mới thành công',
      data: {
        id: result.lastInsertRowid,
        full_name: name,
        phone: cleanPhone,
        total_debt: 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/customers/:id
 * Update customer info
 */
router.put('/:id', (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const customerId = req.params.id;

    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng' });
    }

    const name = full_name ? full_name.trim() : existing.full_name;
    const cleanPhone = phone !== undefined ? (phone ? phone.trim() : null) : existing.phone;

    db.prepare('UPDATE customers SET full_name = ?, phone = ? WHERE id = ?').run(name, cleanPhone, customerId);

    res.json({
      success: true,
      message: 'Cập nhật thông tin khách hàng thành công'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sales-orders/:id/payments
 * Record a payment for a sales order in a DB transaction
 */
router.post('/sales-orders/:id/payments', (req, res) => {
  const salesOrderId = req.params.id;
  const { amount, note } = req.body;

  const payAmount = parseFloat(amount);
  if (!payAmount || payAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Số tiền thanh toán phải lớn hơn 0' });
  }

  try {
    const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(salesOrderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn bán hàng' });
    }

    const currentRemaining = Math.max(0, order.total_amount - order.paid_amount);
    if (payAmount > currentRemaining) {
      return res.status(400).json({
        success: false,
        error: `Số tiền thanh toán (${payAmount.toLocaleString('vi-VN')}đ) vượt quá nợ còn lại của đơn (${currentRemaining.toLocaleString('vi-VN')}đ)`
      });
    }

    const now = new Date().toISOString();

    const paymentTx = db.transaction(() => {
      // 1. Insert payment record
      db.prepare(`
        INSERT INTO payments (sales_order_id, amount, payment_date, note)
        VALUES (?, ?, ?, ?)
      `).run(salesOrderId, payAmount, now, note || null);

      // 2. Update paid_amount
      const newPaidAmount = order.paid_amount + payAmount;

      // 3. Determine new payment_status
      let newStatus = 'unpaid';
      if (newPaidAmount >= order.total_amount) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      db.prepare(`
        UPDATE sales_orders SET
          paid_amount = ?,
          payment_status = ?
        WHERE id = ?
      `).run(newPaidAmount, newStatus, salesOrderId);

      // 4. Recalculate customer debt
      const updatedDebt = recalculateCustomerDebt(order.customer_id);

      return { newPaidAmount, newStatus, updatedDebt };
    });

    const result = paymentTx();

    res.json({
      success: true,
      message: 'Ghi nhận thanh toán thành công!',
      data: {
        sales_order_id: salesOrderId,
        paid_amount: result.newPaidAmount,
        payment_status: result.newStatus,
        customer_debt: result.updatedDebt
      }
    });
  } catch (err) {
    console.error('[Payments API] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
