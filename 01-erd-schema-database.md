# 01 — ERD & Database Schema (SQLite)

## 1. ERD điều chỉnh (dạng chữ)

So với ERD gốc user đưa, có 3 thay đổi chính:
1. **Bỏ bảng `USERS`** khỏi quan hệ khoá ngoại bắt buộc (vì không có đăng nhập). Thay vào đó `PURCHASE_ORDER` và `SALES_ORDER` có field text tự do `created_by`.
2. **Thêm bảng `INVENTORY_BATCH_ALLOCATION`** — bảng trung gian giữa `SALES_ORDER_DETAIL` và `INVENTORY_BATCH`, vì nguyên tắc FIFO có thể khiến **1 dòng bán hàng phải lấy hàng từ NHIỀU lô nhập khác nhau** (VD: bán 15 cái, lô cũ còn 10, phải lấy thêm 5 ở lô mới) → ERD gốc (1 sales_order_detail → 1 batch) không đủ biểu diễn việc này.
3. **`PURCHASE_ORDER` có trạng thái `pending_confirmation`** để phục vụ luồng "OCR xong → chờ user xác nhận → mới cộng vào kho".

```
CUSTOMER 1───N SALES_ORDER 1───N SALES_ORDER_DETAIL N───N INVENTORY_BATCH
                    │                                   (qua bảng trung gian
                    │ 1                                  INVENTORY_BATCH_ALLOCATION)
                    N
                PAYMENT

PRODUCT 1───N PURCHASE_ORDER_DETAIL N───1 PURCHASE_ORDER
PRODUCT 1───N INVENTORY_BATCH (mỗi batch sinh ra từ 1 purchase_order_detail)
PRODUCT 1───N SALES_ORDER_DETAIL
```

## 2. Danh sách bảng

### 2.1 `products` — Sản phẩm / Kho
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| product_code | TEXT | UNIQUE NOT NULL | Mã SP, do OCR đọc hoặc user tự đặt nếu OCR không đọc được |
| product_name | TEXT | NOT NULL | |
| unit | TEXT | NOT NULL DEFAULT 'cái' | Đơn vị tính |
| quantity | INTEGER | NOT NULL DEFAULT 0 | Tổng tồn kho hiện tại = SUM(remaining_qty) các batch — **cột này là cache, luôn đồng bộ lại từ inventory_batches khi có thay đổi**, không phải nguồn sự thật duy nhất |
| image_url | TEXT | NULL | NULL nếu sản phẩm mới tạo từ OCR chưa có ảnh |
| status | TEXT | NOT NULL DEFAULT 'active' | `active` \| `inactive` (soft delete) |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

> Giá nhập **không lưu ở đây** (vì mỗi lô nhập giá có thể khác nhau) — giá nhập nằm ở `inventory_batches`.

### 2.2 `purchase_orders` — Đơn nhập hàng
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| invoice_image_url | TEXT | NULL | Ảnh hoá đơn gốc user upload |
| import_date | DATETIME | NOT NULL | Tự ghi nhận real-time lúc **xác nhận** (không phải lúc upload) |
| status | TEXT | NOT NULL DEFAULT 'pending_confirmation' | `pending_confirmation` \| `confirmed` \| `cancelled` |
| total_amount | REAL | NOT NULL DEFAULT 0 | Tổng tiền nhập (đã gồm thuế), tính lại khi confirm |
| created_by | TEXT | NULL DEFAULT 'Chủ shop' | Không phải FK, chỉ là nhãn text |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| confirmed_at | DATETIME | NULL | |

### 2.3 `purchase_order_details` — Chi tiết đơn nhập (từng dòng SP trong hoá đơn)
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| purchase_order_id | INTEGER | FK → purchase_orders.id NOT NULL | |
| product_id | INTEGER | FK → products.id NULL | NULL cho tới khi confirm & match/tạo sản phẩm |
| product_code_raw | TEXT | NULL | Mã SP OCR đọc được (trước khi match) |
| product_name_raw | TEXT | NULL | Tên SP OCR đọc được |
| quantity | INTEGER | NOT NULL | |
| unit_price_before_tax | REAL | NOT NULL | Đơn giá trước thuế, OCR đọc hoặc user sửa tay |
| tax_rate | REAL | NOT NULL DEFAULT 8 | % thuế, mặc định 8 |
| import_price | REAL | NOT NULL | = unit_price_before_tax * (1 + tax_rate/100), tính sẵn để lưu batch |
| is_new_product | BOOLEAN | NOT NULL DEFAULT 0 | Đánh dấu để UI hiển thị "SP mới" khi user xác nhận |

### 2.4 `inventory_batches` — Lô hàng tồn kho (nguồn sự thật cho FIFO)
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| product_id | INTEGER | FK → products.id NOT NULL | |
| purchase_detail_id | INTEGER | FK → purchase_order_details.id NOT NULL | |
| initial_quantity | INTEGER | NOT NULL | Số lượng nhập ban đầu của lô |
| remaining_qty | INTEGER | NOT NULL | Số còn lại, giảm dần khi bán (FIFO) |
| import_price | REAL | NOT NULL | Giá vốn/đơn vị của lô này (đã gồm thuế) |
| import_date | DATETIME | NOT NULL | Dùng để sắp xếp FIFO (cũ nhất bán trước) |

> Chỉ tạo dòng batch khi `purchase_orders.status = 'confirmed'`.

### 2.5 `customers` — Khách hàng
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| full_name | TEXT | NOT NULL | |
| phone | TEXT | NULL | |
| total_debt | REAL | NOT NULL DEFAULT 0 | Cache, tính lại = SUM(sales_orders.total_amount - paid_amount) các đơn chưa trả hết |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

### 2.6 `sales_orders` — Đơn bán hàng
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| customer_id | INTEGER | FK → customers.id NOT NULL | |
| sale_date | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | Mặc định hôm nay, user sửa được |
| payment_status | TEXT | NOT NULL DEFAULT 'unpaid' | `unpaid` \| `partial` \| `paid` — tự tính lại từ bảng `payments` |
| total_amount | REAL | NOT NULL | SUM(sales_order_details.quantity * selling_price) |
| paid_amount | REAL | NOT NULL DEFAULT 0 | Cache = SUM(payments.amount) |
| created_by | TEXT | NULL DEFAULT 'Chủ shop' | |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | |

### 2.7 `sales_order_details` — Chi tiết đơn bán (từng dòng SP)
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| sales_order_id | INTEGER | FK → sales_orders.id NOT NULL | |
| product_id | INTEGER | FK → products.id NOT NULL | |
| quantity | INTEGER | NOT NULL | |
| selling_price | REAL | NOT NULL | Đơn giá bán, nhập tay mỗi đơn (không cố định) |
| cost_of_goods_sold | REAL | NOT NULL | Giá vốn thực tế = SUM theo các batch bị trừ (FIFO), tính khi tạo đơn |

### 2.8 `inventory_batch_allocations` — Bảng trung gian FIFO (MỚI so với ERD gốc)
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| sales_order_detail_id | INTEGER | FK → sales_order_details.id NOT NULL | |
| batch_id | INTEGER | FK → inventory_batches.id NOT NULL | |
| quantity_taken | INTEGER | NOT NULL | Số lượng lấy từ batch này |
| unit_cost | REAL | NOT NULL | = inventory_batches.import_price tại thời điểm lấy |

### 2.9 `payments` — Lịch sử thanh toán (hỗ trợ trả từng phần)
| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| sales_order_id | INTEGER | FK → sales_orders.id NOT NULL | |
| amount | REAL | NOT NULL | |
| payment_date | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| note | TEXT | NULL | |

## 3. Index đề xuất
```sql
CREATE INDEX idx_batches_product_date ON inventory_batches(product_id, import_date);
CREATE INDEX idx_purchase_details_order ON purchase_order_details(purchase_order_id);
CREATE INDEX idx_sales_details_order ON sales_order_details(sales_order_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_date ON sales_orders(sale_date);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(import_date);
CREATE UNIQUE INDEX idx_products_code ON products(product_code);
```

## 4. Ràng buộc toàn vẹn quan trọng (áp dụng ở tầng backend, SQLite không tự enforce hết)
- `inventory_batches.remaining_qty` phải luôn `>= 0` và `<= initial_quantity`.
- Tổng `products.quantity` phải luôn khớp `SUM(remaining_qty)` của các batch active thuộc product đó — cập nhật lại mỗi khi confirm nhập hàng hoặc tạo đơn bán.
- `sales_orders.paid_amount` không được vượt `total_amount` (chặn ở API tạo payment).
- Không cho xoá cứng `products` nếu đã có `purchase_order_details` hoặc `sales_order_details` tham chiếu → chỉ set `status = 'inactive'`.
