require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db/connection');
const purchaseOrdersRouter = require('./routes/purchaseOrders');
const productsRouter = require('./routes/products');
const customersRouter = require('./routes/customers');
const salesOrdersRouter = require('./routes/salesOrders');
const reportsRouter = require('./routes/reports');
const backupRouter = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for invoice images
const uploadsStaticDir = process.env.HERBALIFE_UPLOADS_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsStaticDir)) {
  fs.mkdirSync(uploadsStaticDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsStaticDir));

// Routes
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/sales-orders', salesOrdersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/backup', backupRouter);
app.use('/api', customersRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static build files if present
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

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
