-- Database Schema for Herbalife Warehouse & Sales Management System (SQLite)

-- 1. Products (Kho sản phẩm)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'cái',
    quantity INTEGER NOT NULL DEFAULT 0,
    image_url TEXT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Purchase Orders (Đơn nhập hàng)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_image_url TEXT NULL,
    import_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending_confirmation',
    total_amount REAL NOT NULL DEFAULT 0,
    created_by TEXT NULL DEFAULT 'Chủ shop',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL
);

-- 3. Purchase Order Details (Chi tiết đơn nhập hàng)
CREATE TABLE IF NOT EXISTS purchase_order_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL,
    product_id INTEGER NULL,
    product_code_raw TEXT NULL,
    product_name_raw TEXT NULL,
    unit TEXT NOT NULL DEFAULT 'EA',
    quantity INTEGER NOT NULL,
    unit_price_before_tax REAL NOT NULL,
    tax_rate REAL NOT NULL DEFAULT 8,
    import_price REAL NOT NULL,
    is_new_product BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- 4. Inventory Batches (Lô hàng tồn kho cho FIFO)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    purchase_detail_id INTEGER NOT NULL,
    initial_quantity INTEGER NOT NULL,
    remaining_qty INTEGER NOT NULL,
    import_price REAL NOT NULL,
    import_date DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (purchase_detail_id) REFERENCES purchase_order_details(id) ON DELETE CASCADE
);

-- 5. Customers (Khách hàng)
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NULL,
    total_debt REAL NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sales Orders (Đơn bán hàng)
CREATE TABLE IF NOT EXISTS sales_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0,
    created_by TEXT NULL DEFAULT 'Chủ shop',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- 7. Sales Order Details (Chi tiết đơn bán hàng)
CREATE TABLE IF NOT EXISTS sales_order_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    selling_price REAL NOT NULL,
    cost_of_goods_sold REAL NOT NULL,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 8. Inventory Batch Allocations (Bảng trung gian phân bổ FIFO)
CREATE TABLE IF NOT EXISTS inventory_batch_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_order_detail_id INTEGER NOT NULL,
    batch_id INTEGER NOT NULL,
    quantity_taken INTEGER NOT NULL,
    unit_cost REAL NOT NULL,
    FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_details(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE RESTRICT
);

-- 9. Payments (Lịch sử thanh toán)
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_order_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT NULL,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_batches_product_date ON inventory_batches(product_id, import_date);
CREATE INDEX IF NOT EXISTS idx_purchase_details_order ON purchase_order_details(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_details_order ON sales_order_details(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(sale_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(import_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
