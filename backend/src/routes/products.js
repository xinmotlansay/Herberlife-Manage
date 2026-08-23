const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * GET /api/products
 * List products with stock level and optional filters
 */
router.get('/', (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    } else {
      query += " AND status = 'active'";
    }

    if (search) {
      query += ' AND (product_code LIKE ? OR product_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY updated_at DESC';

    const products = db.prepare(query).all(...params);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:id
 */
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm' });
    }

    // Get active inventory batches for this product
    const batches = db.prepare(`
      SELECT * FROM inventory_batches
      WHERE product_id = ? AND remaining_qty > 0
      ORDER BY import_date ASC
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...product,
        batches
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
