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
 * 1. POST /api/sales-orders
 * Create a new sales order with strict FIFO inventory deduction in a DB Transaction
 */
router.post('/', (req, res) => {
  const {
    customer_id,
    customer_name_new,
    customer_phone_new,
    sale_date,
    payment_status,
    items,
    created_by
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
  }

  try {
    const saleTx = db.transaction(() => {
      // 1. Resolve Customer (Select existing or create new)
      let resolvedCustomerId = customer_id;

      if (!resolvedCustomerId && customer_name_new && customer_name_new.trim()) {
        const name = customer_name_new.trim();
        const phone = customer_phone_new ? customer_phone_new.trim() : null;

        // Check if existing customer with same name/phone
        const existingCust = db.prepare('SELECT id FROM customers WHERE full_name = ? AND (phone = ? OR phone IS NULL)').get(name, phone);
        if (existingCust) {
          resolvedCustomerId = existingCust.id;
        } else {
          const newCustRes = db.prepare('INSERT INTO customers (full_name, phone, total_debt) VALUES (?, ?, 0)').run(name, phone);
          resolvedCustomerId = newCustRes.lastInsertRowid;
        }
      }

      if (!resolvedCustomerId) {
        throw new Error('Vui lòng chọn khách hàng hoặc nhập tên khách hàng mới');
      }

      const orderSaleDate = sale_date ? new Date(sale_date).toISOString() : new Date().toISOString();
      const initialPaymentStatus = payment_status === 'paid' ? 'paid' : 'unpaid';

      // 2. Insert Sales Order Header
      const insertOrderStmt = db.prepare(`
        INSERT INTO sales_orders (customer_id, sale_date, payment_status, total_amount, paid_amount, created_by)
        VALUES (?, ?, ?, 0, 0, ?)
      `);
      const orderRes = insertOrderStmt.run(
        resolvedCustomerId,
        orderSaleDate,
        initialPaymentStatus,
        created_by || 'Chủ shop'
      );
      const salesOrderId = orderRes.lastInsertRowid;

      let grandTotalAmount = 0;

      // Prepared Statements for Details & FIFO
      const insertDetailStmt = db.prepare(`
        INSERT INTO sales_order_details (sales_order_id, product_id, quantity, selling_price, cost_of_goods_sold)
        VALUES (?, ?, ?, ?, ?)
      `);

      const getActiveBatchesStmt = db.prepare(`
        SELECT id, remaining_qty, import_price, import_date
        FROM inventory_batches
        WHERE product_id = ? AND remaining_qty > 0
        ORDER BY import_date ASC
      `);

      const insertAllocationStmt = db.prepare(`
        INSERT INTO inventory_batch_allocations (sales_order_detail_id, batch_id, quantity_taken, unit_cost)
        VALUES (?, ?, ?, ?)
      `);

      const updateBatchQtyStmt = db.prepare(`
        UPDATE inventory_batches SET remaining_qty = remaining_qty - ? WHERE id = ?
      `);

      const updateProductQtyStmt = db.prepare(`
        UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?
      `);

      const getProductStmt = db.prepare('SELECT id, product_code, product_name, quantity, status FROM products WHERE id = ?');

      // 3. Process Line Items and Apply FIFO Inventory Deduction
      for (const line of items) {
        const prodId = line.product_id;
        const qtyToSell = parseInt(line.quantity, 10) || 0;
        const sellingPrice = parseFloat(line.selling_price) || 0;

        if (qtyToSell <= 0) {
          throw new Error('Số lượng bán phải lớn hơn 0');
        }

        const product = getProductStmt.get(prodId);
        if (!product || product.status === 'inactive') {
          throw new Error(`Sản phẩm (ID: ${prodId}) không tồn tại hoặc đã ngừng kinh doanh`);
        }

        if (product.quantity < qtyToSell) {
          throw new Error(`Sản phẩm "${product.product_name}" (${product.product_code}) không đủ hàng tồn kho. (Tồn kho hiện tại: ${product.quantity}, Cần bán: ${qtyToSell})`);
        }

        const lineTotal = qtyToSell * sellingPrice;
        grandTotalAmount += lineTotal;

        // FIFO Deduction loop over active batches
        const activeBatches = getActiveBatchesStmt.all(prodId);
        let remainingToDeduct = qtyToSell;
        let lineCostOfGoodsSold = 0;

        const allocationsToCreate = [];

        for (const batch of activeBatches) {
          if (remainingToDeduct <= 0) break;

          const take = Math.min(batch.remaining_qty, remainingToDeduct);
          const unitCost = batch.import_price;

          allocationsToCreate.push({
            batch_id: batch.id,
            quantity_taken: take,
            unit_cost: unitCost
          });

          lineCostOfGoodsSold += take * unitCost;
          remainingToDeduct -= take;
        }

        if (remainingToDeduct > 0) {
          throw new Error(`Không đủ hàng tồn kho lô thực tế cho sản phẩm "${product.product_name}"`);
        }

        // Insert Detail Line
        const detailRes = insertDetailStmt.run(
          salesOrderId,
          prodId,
          qtyToSell,
          sellingPrice,
          lineCostOfGoodsSold
        );
        const detailId = detailRes.lastInsertRowid;

        // Apply allocations & decrement batch remaining_qty
        for (const alloc of allocationsToCreate) {
          insertAllocationStmt.run(detailId, alloc.batch_id, alloc.quantity_taken, alloc.unit_cost);
          updateBatchQtyStmt.run(alloc.quantity_taken, alloc.batch_id);
        }

        // Update product overall cached quantity
        updateProductQtyStmt.run(qtyToSell, new Date().toISOString(), prodId);
      }

      // 4. Update Sales Order Total Amount & Handle Initial Payment
      let initialPaidAmount = 0;
      if (initialPaymentStatus === 'paid') {
        initialPaidAmount = grandTotalAmount;
        // Insert full payment record
        db.prepare(`
          INSERT INTO payments (sales_order_id, amount, payment_date, note)
          VALUES (?, ?, ?, ?)
        `).run(salesOrderId, grandTotalAmount, orderSaleDate, 'Thanh toán full khi tạo đơn bán');
      }

      db.prepare(`
        UPDATE sales_orders SET
          total_amount = ?,
          paid_amount = ?
        WHERE id = ?
      `).run(grandTotalAmount, initialPaidAmount, salesOrderId);

      // 5. Update Customer Total Debt
      recalculateCustomerDebt(resolvedCustomerId);

      return {
        salesOrderId,
        customerId: resolvedCustomerId,
        totalAmount: grandTotalAmount,
        paidAmount: initialPaidAmount,
        paymentStatus: initialPaymentStatus
      };
    });

    const result = saleTx();

    res.json({
      success: true,
      message: 'Tạo đơn bán hàng thành công! Đã trừ kho theo cơ chế FIFO.',
      data: {
        id: result.salesOrderId,
        customer_id: result.customerId,
        total_amount: result.totalAmount,
        paid_amount: result.paidAmount,
        payment_status: result.paymentStatus
      }
    });
  } catch (err) {
    console.error('[Sales API] Create Error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 2. GET /api/sales-orders
 * List sales orders with filters (from, to, payment_status, customer_id)
 */
router.get('/', (req, res) => {
  try {
    const { from, to, payment_status, customer_id } = req.query;
    let query = `
      SELECT so.*, c.full_name as customer_name, c.phone as customer_phone
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (payment_status) {
      query += ' AND so.payment_status = ?';
      params.push(payment_status);
    }
    if (customer_id) {
      query += ' AND so.customer_id = ?';
      params.push(customer_id);
    }
    if (from) {
      query += ' AND so.sale_date >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND so.sale_date <= ?';
      params.push(to);
    }

    query += ' ORDER BY so.id DESC';

    const orders = db.prepare(query).all(...params);

    const getItemCount = db.prepare('SELECT COUNT(*) as count FROM sales_order_details WHERE sales_order_id = ?');
    const result = orders.map(o => ({
      ...o,
      item_count: getItemCount.get(o.id).count,
      remaining_debt: Math.max(0, o.total_amount - o.paid_amount)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/sales-orders/:id
 * Single sales order detail with line items and FIFO batch allocations
 */
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT so.*, c.full_name as customer_name, c.phone as customer_phone
      FROM sales_orders so
      JOIN customers c ON so.customer_id = c.id
      WHERE so.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn bán hàng' });
    }

    const items = db.prepare(`
      SELECT sod.*, p.product_name, p.product_code, p.unit
      FROM sales_order_details sod
      JOIN products p ON sod.product_id = p.id
      WHERE sod.sales_order_id = ?
    `).all(req.params.id);

    const getAllocations = db.prepare(`
      SELECT iba.*, ib.import_date, ib.import_price
      FROM inventory_batch_allocations iba
      JOIN inventory_batches ib ON iba.batch_id = ib.id
      WHERE iba.sales_order_detail_id = ?
    `);

    const enrichedItems = items.map(item => ({
      ...item,
      allocations: getAllocations.all(item.id)
    }));

    const payments = db.prepare('SELECT * FROM payments WHERE sales_order_id = ? ORDER BY payment_date DESC').all(req.params.id);

    res.json({
      success: true,
      data: {
        ...order,
        remaining_debt: Math.max(0, order.total_amount - order.paid_amount),
        items: enrichedItems,
        payments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
