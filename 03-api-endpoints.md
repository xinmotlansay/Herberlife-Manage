# 03 — API Endpoints (REST, Express)

Base URL: `http://localhost:3000/api`
Tất cả response dạng JSON: `{ success: boolean, data?: any, error?: string }`

## 1. Purchase (Nhập hàng)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/purchase-orders/ocr` | Upload ảnh hoá đơn (`multipart/form-data`, field `image`) → gọi Google Vision, trả về **bản nháp** (chưa lưu DB thật, hoặc lưu `pending_confirmation`) gồm danh sách dòng đã parse + match sản phẩm |
| POST | `/purchase-orders/:id/confirm` | Xác nhận đơn nhập (body: mảng dòng đã user chỉnh sửa cuối cùng) → tạo product mới (nếu có), tạo `inventory_batches`, cập nhật `products.quantity`, set `status = 'confirmed'` |
| POST | `/purchase-orders/:id/cancel` | Huỷ đơn đang `pending_confirmation`, không ảnh hưởng kho |
| GET | `/purchase-orders` | Lịch sử nhập hàng (query: `from`, `to`, `status`, phân trang) |
| GET | `/purchase-orders/:id` | Chi tiết 1 đơn nhập kèm các dòng |

## 2. Products (Kho)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/products` | Danh sách SP (query: `status=active`, `search`, `low_stock=true`) |
| GET | `/products/:id` | Chi tiết SP + các batch còn tồn |
| POST | `/products` | Tạo SP mới thủ công |
| PUT | `/products/:id` | Sửa thông tin SP (không sửa `quantity` trực tiếp) |
| DELETE | `/products/:id` | Soft delete (`status = 'inactive'`) |

## 3. Customers (Khách hàng)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/customers` | Danh sách khách hàng (query: `search` theo tên/SĐT) |
| GET | `/customers/:id` | Chi tiết khách hàng + `total_debt` + lịch sử mua hàng |
| POST | `/customers` | Tạo khách hàng mới thủ công |
| PUT | `/customers/:id` | Sửa thông tin khách hàng |

## 4. Sales (Bán hàng)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/sales-orders` | Tạo đơn bán mới (áp dụng FIFO trong transaction, xem `02-quy-tac-nghiep-vu.md` §4) |
| GET | `/sales-orders` | Danh sách đơn bán (query: `from`, `to`, `payment_status`, `customer_id`) |
| GET | `/sales-orders/:id` | Chi tiết đơn bán, kèm allocation FIFO từng dòng |
| POST | `/sales-orders/:id/payments` | Ghi nhận 1 khoản thanh toán (body: `amount`, `note`) |
| GET | `/sales-orders/unpaid` | Danh sách đơn `unpaid`/`partial` (dùng cho thống kê công nợ) |

## 5. Statistics (Thống kê)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/statistics/monthly?month=8&year=2026` | Doanh thu, lợi nhuận, số lượng nhập/bán trong tháng |
| GET | `/statistics/yearly?year=2026` | (optional) Doanh thu, lợi nhuận, số lượng nhập/bán trong năm |
| GET | `/statistics/inventory` | Tổng tồn kho hiện tại, theo từng SP |
| GET | `/statistics/best-sellers?from=&to=&limit=10` | Top SP bán chạy |
| GET | `/statistics/unpaid-summary` | Tổng công nợ hiện tại, số đơn chưa thanh toán |

## 6. Ghi chú kỹ thuật
- Toàn bộ endpoint ghi dữ liệu (`POST /sales-orders`, `POST /purchase-orders/:id/confirm`, `POST /sales-orders/:id/payments`) phải chạy trong **DB transaction** của `better-sqlite3` để đảm bảo toàn vẹn (xem quy tắc rollback ở file business rules).
- Upload ảnh giới hạn dung lượng (đề xuất tối đa 10MB/ảnh), chỉ nhận `image/jpeg`, `image/png`.
- Không cần middleware auth (theo quyết định "không đăng nhập"), nhưng nên có middleware validate input cơ bản (kiểm tra field bắt buộc, kiểu dữ liệu) trước khi chạm DB.
