require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db/connection');
const purchaseOrdersRouter = require('./routes/purchaseOrders');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for invoice images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/products', productsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Herbalife Management Server running on port ${PORT}`);
  console.log(` Base API: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});

module.exports = app;
