const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/connection');
const { processInvoiceImage } = require('../services/ocrService');

// Multer storage setup
const uploadDir = path.join(__dirname, '../../uploads/purchase_invoices');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'invoice-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file hoá đơn có định dạng JPG, JPEG, PNG, WEBP hoặc PDF'));
    }
  }
});

/**
 * 1. POST /api/purchase-orders/ocr
 * Upload invoice image -> Call OCR -> Create draft pending_confirmation order
 */
router.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    let filePath = '';
    let relativeUrl = '';

    if (req.file) {
      filePath = req.file.path;
      relativeUrl = '/uploads/purchase_invoices/' + req.file.filename;
    } else if (req.body.sample) {
      // Allow testing with sample Herbalife invoice
      relativeUrl = '/uploads/purchase_invoices/sample_herbalife.jpg';
    }

    // Call OCR service
    const ocrResult = await processInvoiceImage(filePath);

    // Insert purchase order with status 'pending_confirmation' and extracted import date
    const importDateToSave = ocrResult.extractedDate || new Date().toISOString();
    const insertPo = db.prepare(`
      INSERT INTO purchase_orders (invoice_image_url, status, import_date, created_by)
      VALUES (?, 'pending_confirmation', ?, ?)
    `);

    const result = insertPo.run(relativeUrl || null, importDateToSave, req.body.created_by || 'Chủ shop');
    const purchaseOrderId = result.lastInsertRowid;

    // Check existing products in DB for matching
    const findProductByCode = db.prepare('SELECT id, product_name, unit FROM products WHERE product_code = ?');
    const insertPod = db.prepare(`
      INSERT INTO purchase_order_details (
        purchase_order_id, product_id, product_code_raw, product_name_raw,
        unit, quantity, unit_price_before_tax, tax_rate, import_price, is_new_product
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let draftTotal = 0;
    const insertedItems = [];

    for (const item of ocrResult.items) {
      const cleanCode = (item.product_code_raw || '').trim().toUpperCase();
      const existingProd = findProductByCode.get(cleanCode);
      const isNew = existingProd ? 0 : 1;
      const productId = existingProd ? existingProd.id : null;
      // If product already exists in DB, use the updated/custom name set by user in inventory
      const nameToUse = existingProd ? existingProd.product_name : (item.product_name_raw || '');
      const unitToUse = existingProd ? (existingProd.unit || item.unit || 'EA') : (item.unit || 'EA');
      const importPrice = Math.round(item.unit_price_before_tax * (1 + (item.tax_rate || 8) / 100));

      const detailRes = insertPod.run(
        purchaseOrderId,
        productId,
        cleanCode,
        nameToUse,
        unitToUse,
        item.quantity,
        item.unit_price_before_tax,
        item.tax_rate || 8,
        importPrice,
        isNew
      );

      const lineTotal = importPrice * item.quantity;
      draftTotal += lineTotal;

      insertedItems.push({
        id: detailRes.lastInsertRowid,
        purchase_order_id: purchaseOrderId,
        product_id: productId,
        product_code_raw: cleanCode,
        product_name_raw: nameToUse,
        unit: unitToUse,
        quantity: item.quantity,
        unit_price_before_tax: item.unit_price_before_tax,
        tax_rate: item.tax_rate || 8,
        import_price: importPrice,
        is_new_product: isNew === 1
      });
    }

    // Update draft total
    db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(draftTotal, purchaseOrderId);

    res.json({
      success: true,
      data: {
        id: purchaseOrderId,
        invoice_image_url: relativeUrl,
        status: 'pending_confirmation',
        total_amount: draftTotal,
        items: insertedItems
      }
    });
  } catch (err) {
    console.error('[Purchase API] OCR Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1b. POST /api/purchase-orders/manual
 * Create a new manual draft purchase order (status = 'pending_confirmation')
 */
router.post('/manual', (req, res) => {
  try {
    const { items, created_by } = req.body;
    const initialItems = items && Array.isArray(items) ? items : [];

    const insertPo = db.prepare(`
      INSERT INTO purchase_orders (invoice_image_url, status, created_by)
      VALUES (NULL, 'pending_confirmation', ?)
    `);
    const result = insertPo.run(created_by || 'Chủ shop');
    const purchaseOrderId = result.lastInsertRowid;

    const findProductByCode = db.prepare('SELECT id FROM products WHERE product_code = ?');
    const insertPod = db.prepare(`
      INSERT INTO purchase_order_details (
        purchase_order_id, product_id, product_code_raw, product_name_raw,
        unit, quantity, unit_price_before_tax, tax_rate, import_price, is_new_product
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let draftTotal = 0;
    const insertedItems = [];

    for (const item of initialItems) {
      if (!item.product_code_raw && !item.product_name_raw) continue;

      const code = (item.product_code_raw || 'SP001').trim().toUpperCase();
      const existingProd = findProductByCode.get(code);
      const isNew = existingProd ? 0 : 1;
      const productId = existingProd ? existingProd.id : null;
      const qty = parseInt(item.quantity, 10) || 1;
      const unitPriceBefTax = parseFloat(item.unit_price_before_tax) || 0;
      const taxRate = parseFloat(item.tax_rate) || 8;
      const importPrice = Math.round(unitPriceBefTax * (1 + taxRate / 100));

      const detailRes = insertPod.run(
        purchaseOrderId,
        productId,
        code,
        item.product_name_raw || 'Sản phẩm mới',
        item.unit || 'EA',
        qty,
        unitPriceBefTax,
        taxRate,
        importPrice,
        isNew
      );

      const lineTotal = importPrice * qty;
      draftTotal += lineTotal;

      insertedItems.push({
        id: detailRes.lastInsertRowid,
        purchase_order_id: purchaseOrderId,
        product_id: productId,
        product_code_raw: code,
        product_name_raw: item.product_name_raw || 'Sản phẩm mới',
        unit: item.unit || 'EA',
        quantity: qty,
        unit_price_before_tax: unitPriceBefTax,
        tax_rate: taxRate,
        import_price: importPrice,
        is_new_product: isNew === 1
      });
    }

    db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(draftTotal, purchaseOrderId);

    res.json({
      success: true,
      data: {
        id: purchaseOrderId,
        invoice_image_url: null,
        status: 'pending_confirmation',
        total_amount: draftTotal,
        items: insertedItems
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/purchase-orders/:id/confirm
 * Confirm purchase order in a DB Transaction
 * Creates new products if needed, creates inventory_batches, and updates products stock
 */
router.post('/:id/confirm', (req, res) => {
  const purchaseOrderId = req.params.id;
  const editedItems = req.body.items || [];

  try {
    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(purchaseOrderId);
    if (!po) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn nhập hàng' });
    }
    if (po.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, error: 'Đơn nhập hàng đã được xử lý hoặc huỷ' });
    }

    let effectiveImportDate = new Date().toISOString();
    if (req.body.import_date) {
      const parsedDate = new Date(req.body.import_date);
      if (!isNaN(parsedDate.getTime())) {
        effectiveImportDate = parsedDate.toISOString();
      }
    }

    // Execute in Database Transaction
    const confirmTx = db.transaction(() => {
      let grandTotal = 0;
      let newProductsCreatedCount = 0;

      const checkPodStmt = db.prepare('SELECT id FROM purchase_order_details WHERE id = ? AND purchase_order_id = ?');

      const insertPodStmt = db.prepare(`
        INSERT INTO purchase_order_details (
          purchase_order_id, product_id, product_code_raw, product_name_raw,
          unit, quantity, unit_price_before_tax, tax_rate, import_price, is_new_product
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updatePodStmt = db.prepare(`
        UPDATE purchase_order_details SET
          product_id = ?,
          product_code_raw = ?,
          product_name_raw = ?,
          unit = ?,
          quantity = ?,
          unit_price_before_tax = ?,
          tax_rate = ?,
          import_price = ?,
          is_new_product = ?
        WHERE id = ?
      `);

      const findProductByCode = db.prepare('SELECT * FROM products WHERE product_code = ?');
      const insertProductStmt = db.prepare(`
        INSERT INTO products (product_code, product_name, unit, quantity, image_url, status)
        VALUES (?, ?, ?, 0, NULL, 'active')
      `);

      const insertBatchStmt = db.prepare(`
        INSERT INTO inventory_batches (product_id, purchase_detail_id, initial_quantity, remaining_qty, import_price, import_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateProductQtyStmt = db.prepare(`
        UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?
      `);

      for (const item of editedItems) {
        let productId = item.product_id;
        const code = (item.product_code_raw || '').trim().toUpperCase();
        const name = (item.product_name_raw || '').trim();
        const unit = (item.unit || 'EA').trim();
        const qty = parseInt(item.quantity, 10) || 1;
        const unitPriceBefTax = parseFloat(item.unit_price_before_tax) || 0;
        const taxRate = parseFloat(item.tax_rate) || 8;
        const importPrice = Math.round(unitPriceBefTax * (1 + taxRate / 100));

        if (!code && !name) continue;

        let existingProd = findProductByCode.get(code);

        let isNewProduct = 0;
        if (!existingProd) {
          // Create new product with NULL image_url
          const prodRes = insertProductStmt.run(code, name, unit);
          productId = prodRes.lastInsertRowid;
          isNewProduct = 1;
          newProductsCreatedCount++;
        } else {
          productId = existingProd.id;
        }

        let detailId = null;
        const existingPod = item.id ? checkPodStmt.get(item.id, purchaseOrderId) : null;

        if (existingPod) {
          detailId = existingPod.id;
          updatePodStmt.run(
            productId,
            code,
            name,
            unit,
            qty,
            unitPriceBefTax,
            taxRate,
            importPrice,
            isNewProduct,
            detailId
          );
        } else {
          const podRes = insertPodStmt.run(
            purchaseOrderId,
            productId,
            code,
            name,
            unit,
            qty,
            unitPriceBefTax,
            taxRate,
            importPrice,
            isNewProduct
          );
          detailId = podRes.lastInsertRowid;
        }

        // Create inventory batch for FIFO
        insertBatchStmt.run(
          productId,
          detailId,
          qty,
          qty,
          importPrice,
          effectiveImportDate
        );

        // Update total product stock in products table
        updateProductQtyStmt.run(qty, effectiveImportDate, productId);

        grandTotal += importPrice * qty;
      }

      // Finalize purchase order status
      db.prepare(`
        UPDATE purchase_orders SET
          status = 'confirmed',
          import_date = ?,
          confirmed_at = ?,
          total_amount = ?
        WHERE id = ?
      `).run(effectiveImportDate, effectiveImportDate, grandTotal, purchaseOrderId);

      return { grandTotal, newProductsCreatedCount };
    });

    const result = confirmTx();

    res.json({
      success: true,
      message: 'Xác nhận nhập hàng thành công! Đã cộng vào kho.',
      data: {
        id: purchaseOrderId,
        status: 'confirmed',
        total_amount: result.grandTotal,
        new_products_count: result.newProductsCreatedCount
      }
    });
  } catch (err) {
    console.error('[Purchase API] Confirm error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. POST /api/purchase-orders/:id/cancel
 */
router.post('/:id/cancel', (req, res) => {
  try {
    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    if (!po) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn' });
    }
    if (po.status !== 'pending_confirmation') {
      return res.status(400).json({ success: false, error: 'Đơn hàng không ở trạng thái chờ xác nhận' });
    }

    db.prepare("UPDATE purchase_orders SET status = 'cancelled' WHERE id = ?").run(req.params.id);

    res.json({ success: true, message: 'Đã huỷ đơn nhập hàng thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. GET /api/purchase-orders
 * List purchase orders with status, date filters
 */
router.get('/', (req, res) => {
  try {
    const { status, from, to, month, year } = req.query;
    let query = 'SELECT * FROM purchase_orders WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (month && year && month !== 'all') {
      const mInt = parseInt(month, 10);
      const yInt = parseInt(year, 10);
      const mStr = mInt.toString().padStart(2, '0');
      const lastDay = new Date(yInt, mInt, 0).getDate();
      const startOfMonth = `${yInt}-${mStr}-01T00:00:00.000Z`;
      const endOfMonth = `${yInt}-${mStr}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`;

      query += ' AND import_date >= ? AND import_date <= ?';
      params.push(startOfMonth, endOfMonth);
    } else if (year) {
      const yInt = parseInt(year, 10);
      const startOfYear = `${yInt}-01-01T00:00:00.000Z`;
      const endOfYear = `${yInt}-12-31T23:59:59.999Z`;

      query += ' AND import_date >= ? AND import_date <= ?';
      params.push(startOfYear, endOfYear);
    } else {
      if (from) {
        query += ' AND import_date >= ?';
        params.push(from);
      }
      if (to) {
        query += ' AND import_date <= ?';
        params.push(to);
      }
    }

    query += ' ORDER BY id DESC';

    const orders = db.prepare(query).all(...params);

    // Attach item count to each order
    const getItemCount = db.prepare('SELECT COUNT(*) as count FROM purchase_order_details WHERE purchase_order_id = ?');
    const result = orders.map(o => ({
      ...o,
      item_count: getItemCount.get(o.id).count
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. GET /api/purchase-orders/:id
 * Get single purchase order details with line items
 */
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn nhập hàng' });
    }

    const items = db.prepare(`
      SELECT pod.*, p.product_name, p.product_code
      FROM purchase_order_details pod
      LEFT JOIN products p ON pod.product_id = p.id
      WHERE pod.purchase_order_id = ?
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
