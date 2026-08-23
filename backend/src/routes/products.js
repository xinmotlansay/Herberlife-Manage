const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/connection');

// Product Image Storage
const prodUploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(prodUploadDir)) {
  fs.mkdirSync(prodUploadDir, { recursive: true });
}

const prodStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, prodUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'prod-' + uniqueSuffix + ext);
  }
});

const uploadProductImage = multer({
  storage: prodStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh JPG, JPEG, PNG, WEBP'));
    }
  }
});

/**
 * POST /api/products/upload-image
 * Upload local product image file
 */
router.post('/upload-image', uploadProductImage.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy tệp ảnh tải lên' });
    }
    const relativeUrl = '/uploads/products/' + req.file.filename;
    res.json({ success: true, image_url: relativeUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products
 * List products with real-time cached stock quantity, weighted average import price,
 * latest import date, and status filter ('active', 'inactive', 'all')
 */
router.get('/', (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (product_code LIKE ? OR product_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY status ASC, updated_at DESC';

    const products = db.prepare(query).all(...params);

    // Prepared statements for batch calculations
    const getBatchesStmt = db.prepare(`
      SELECT remaining_qty, import_price, import_date
      FROM inventory_batches
      WHERE product_id = ? AND remaining_qty > 0
      ORDER BY import_date ASC
    `);

    const getLatestBatchStmt = db.prepare(`
      SELECT import_price, import_date
      FROM inventory_batches
      WHERE product_id = ?
      ORDER BY import_date DESC
      LIMIT 1
    `);

    const enrichedProducts = products.map(p => {
      const activeBatches = getBatchesStmt.all(p.id);

      let totalQty = 0;
      let totalVal = 0;
      let latestImportDate = null;

      if (activeBatches.length > 0) {
        activeBatches.forEach(b => {
          totalQty += b.remaining_qty;
          totalVal += b.remaining_qty * b.import_price;
        });
        latestImportDate = activeBatches[activeBatches.length - 1].import_date;
      }

      let avgImportPrice = 0;
      if (totalQty > 0) {
        avgImportPrice = Math.round(totalVal / totalQty);
      } else {
        const latestBatch = getLatestBatchStmt.get(p.id);
        if (latestBatch) {
          avgImportPrice = latestBatch.import_price;
          latestImportDate = latestBatch.import_date;
        }
      }

      return {
        ...p,
        quantity: totalQty, // Source of truth from active batches
        avg_import_price: avgImportPrice,
        latest_import_date: latestImportDate || p.created_at
      };
    });

    res.json({ success: true, data: enrichedProducts });
  } catch (err) {
    console.error('[Products API] GET Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id
 * Get single product details + full inventory batches for FIFO tracking
 */
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm' });
    }

    // Get active inventory batches ordered by import_date ASC (FIFO order)
    const activeBatches = db.prepare(`
      SELECT b.*, po.invoice_image_url
      FROM inventory_batches b
      LEFT JOIN purchase_order_details pod ON b.purchase_detail_id = pod.id
      LEFT JOIN purchase_orders po ON pod.purchase_order_id = po.id
      WHERE b.product_id = ?
      ORDER BY b.import_date ASC
    `).all(req.params.id);

    let totalQty = 0;
    let totalVal = 0;
    activeBatches.forEach(b => {
      if (b.remaining_qty > 0) {
        totalQty += b.remaining_qty;
        totalVal += b.remaining_qty * b.import_price;
      }
    });

    const avgImportPrice = totalQty > 0 ? Math.round(totalVal / totalQty) : 0;

    res.json({
      success: true,
      data: {
        ...product,
        quantity: totalQty,
        avg_import_price: avgImportPrice,
        batches: activeBatches
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/products
 * Create a new product manually (no direct quantity setting)
 */
router.post('/', (req, res) => {
  try {
    const { product_code, product_name, unit, image_url } = req.body;

    if (!product_code || !product_name) {
      return res.status(400).json({
        success: false,
        error: 'Mã sản phẩm và Tên sản phẩm là bắt buộc'
      });
    }

    const cleanCode = product_code.trim().toUpperCase();
    const cleanName = product_name.trim();
    const cleanUnit = (unit || 'EA').trim();

    // Check code uniqueness
    const existing = db.prepare('SELECT id FROM products WHERE product_code = ?').get(cleanCode);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Mã sản phẩm "${cleanCode}" đã tồn tại trong hệ thống`
      });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO products (product_code, product_name, unit, quantity, image_url, status, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, 'active', ?, ?)
    `);

    const result = stmt.run(cleanCode, cleanName, cleanUnit, image_url || null, now, now);

    res.json({
      success: true,
      message: 'Tạo sản phẩm mới thành công',
      data: {
        id: result.lastInsertRowid,
        product_code: cleanCode,
        product_name: cleanName,
        unit: cleanUnit,
        quantity: 0,
        image_url: image_url || null,
        status: 'active'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/products/:id
 * Update product info (does NOT allow editing stock quantity directly)
 */
router.put('/:id', (req, res) => {
  try {
    const productId = req.params.id;
    const { product_code, product_name, unit, image_url, status } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm' });
    }

    const cleanCode = (product_code || existing.product_code).trim().toUpperCase();
    const cleanName = (product_name || existing.product_name).trim();
    const cleanUnit = (unit || existing.unit).trim();
    const cleanStatus = status || existing.status;

    // Check code collision with other products
    const codeCheck = db.prepare('SELECT id FROM products WHERE product_code = ? AND id != ?').get(cleanCode, productId);
    if (codeCheck) {
      return res.status(400).json({
        success: false,
        error: `Mã sản phẩm "${cleanCode}" trùng với sản phẩm khác`
      });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE products SET
        product_code = ?,
        product_name = ?,
        unit = ?,
        image_url = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(cleanCode, cleanName, cleanUnit, image_url !== undefined ? image_url : existing.image_url, cleanStatus, now, productId);

    res.json({
      success: true,
      message: 'Cập nhật thông tin sản phẩm thành công'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/products/:id
 * Soft delete product (sets status = 'inactive')
 */
router.delete('/:id', (req, res) => {
  try {
    const productId = req.params.id;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE products SET status = 'inactive', updated_at = ? WHERE id = ?").run(now, productId);

    res.json({
      success: true,
      message: `Đã ngừng kinh doanh sản phẩm "${existing.product_name}" (Soft Delete)`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
