# 02 — Quy tắc nghiệp vụ (Business Rules)

## 1. Module Nhập hàng (Purchase / OCR)

### Luồng xử lý
1. User upload ảnh hoá đơn → backend lưu ảnh vào `backend/uploads/purchase_invoices/` → tạo `purchase_orders` với `status = 'pending_confirmation'`, `invoice_image_url` = đường dẫn ảnh.
2. Backend gọi **Google Vision API** (text detection / document text detection) trên ảnh → nhận về text thô.
3. Backend parse text thô thành các dòng `{product_code_raw, product_name_raw, quantity, unit_price_before_tax}`:
   - Nếu không parse được 1 field nào đó (VD giá bị mờ), để trống, đánh dấu dòng đó `needs_review = true` (trả về FE, không lưu field riêng trong DB — chỉ dùng ở response tạm để FE tô đỏ, vì sau khi confirm thì các field bắt buộc phải có).
4. Với mỗi dòng, backend match `product_code_raw` với `products.product_code` hiện có:
   - **Match được** → gắn `product_id`, `is_new_product = false`.
   - **Không match** → để `product_id = NULL`, `is_new_product = true` (sẽ tạo SP mới khi confirm).
5. Với mỗi dòng: `import_price = unit_price_before_tax * (1 + tax_rate/100)`, mặc định `tax_rate = 8`.
6. Trả toàn bộ về FE dưới dạng **bảng nháp** để user xem/sửa tay (sửa mã, tên, số lượng, giá, tax_rate) trước khi xác nhận — **không tự động cộng kho ở bước này**.
7. User bấm **"Xác nhận nhập hàng"** → **hiện POPUP xác nhận** (hiển thị tổng số dòng, tổng tiền, cảnh báo số SP mới sẽ được tạo) → user confirm lần 2 trong popup mới thực sự submit.
8. Khi submit xác nhận:
   - `purchase_orders.import_date = NOW()`, `status = 'confirmed'`, `confirmed_at = NOW()`.
   - Với từng dòng `is_new_product = true`: tạo `products` mới với `image_url = NULL`, `status = 'active'`.
   - Với từng dòng: tạo 1 `inventory_batches` mới (`initial_quantity = remaining_qty = quantity`, `import_price`, `import_date = purchase_orders.import_date`).
   - Cập nhật lại `products.quantity += quantity` cho từng SP liên quan.
   - Tính `purchase_orders.total_amount = SUM(quantity * import_price)` toàn đơn.
9. Đơn nhập sau khi `confirmed` thì **không sửa được nữa** (muốn sửa phải tạo đơn điều chỉnh riêng — ngoài phạm vi bản đầu, ghi chú để làm sau).
10. **Lịch sử nhập hàng**: danh sách toàn bộ `purchase_orders` (chỉ hiện các đơn `confirmed`, có thể lọc theo ngày/trạng thái), click vào xem chi tiết từng dòng.

### Trạng thái đơn nhập
`pending_confirmation` → `confirmed` (không quay lại được) | → `cancelled` (nếu user huỷ trước khi confirm, không ảnh hưởng kho).

## 2. Module Quản lý Kho

- CRUD sản phẩm: **Thêm** (tay, không qua OCR), **Sửa** (tên, mã, đơn vị, ảnh — **không sửa trực tiếp `quantity`**, vì quantity là cache tính từ batch), **Xoá** = soft delete (`status = 'inactive'`), sản phẩm inactive **ẩn khỏi** các dropdown chọn khi tạo đơn nhập/bán mới nhưng vẫn hiện trong lịch sử.
- "Giá nhập" hiển thị cho user ở trang kho = **giá nhập trung bình gia quyền** của các batch còn `remaining_qty > 0`, hoặc giá của batch mới nhất nếu không còn batch nào — chỉ để hiển thị tham khảo, **không dùng để tính giá vốn khi bán** (giá vốn khi bán luôn theo FIFO thực tế ở `inventory_batch_allocations`).
- Tình trạng sản phẩm: hiển thị cờ **"Hết hàng"** nếu `quantity = 0`, **"Sắp hết"** nếu `quantity` dưới ngưỡng cấu hình (mặc định 5, có thể để config sau — không bắt buộc bản đầu).

## 3. Module Khách hàng

- Danh sách khách hàng: tên, SĐT, tổng nợ hiện tại, lịch sử mua hàng (list `sales_orders` theo `customer_id`).
- `total_debt` (cache) = `SUM(total_amount - paid_amount)` của tất cả `sales_orders` có `payment_status != 'paid'`.
- Cập nhật `total_debt` mỗi khi: tạo đơn bán mới, hoặc ghi nhận thanh toán mới (`payments`).
- Trạng thái thanh toán từng đơn hiển thị ngay trong lịch sử mua hàng của khách (Đã thanh toán / Thanh toán một phần / Chưa thanh toán).

## 4. Module Bán hàng

### Tạo đơn bán
1. Chọn khách hàng: search trong danh sách có sẵn, hoặc nhập tên mới → nếu tên mới, tạo `customers` mới ngay khi submit đơn (không tạo trước khi có đơn thật).
2. Thêm nhiều dòng sản phẩm, mỗi dòng: chọn SP (chỉ hiện SP `active` và `quantity > 0`), nhập số lượng, nhập **đơn giá bán tự do** (không lấy từ giá cố định nào).
3. Ngày mua: mặc định `NOW()`, cho sửa tay (VD ghi sổ trễ).
4. Trạng thái thanh toán ban đầu: chọn **Đã thanh toán** (tạo luôn 1 `payments` = `total_amount`) hoặc **Chưa thanh toán** (không tạo `payments`, `payment_status = 'unpaid'`).

### Nguyên tắc FIFO khi bán (bắt buộc, áp dụng cho mọi dòng bán)
Với mỗi dòng `sales_order_details` (product_id, quantity cần bán):
1. Lấy tất cả `inventory_batches` của `product_id` có `remaining_qty > 0`, sắp xếp `import_date ASC` (cũ nhất trước).
2. Duyệt từng batch, trừ dần vào `quantity` cần bán:
   - Lấy `take = MIN(remaining_qty, quantity_còn_cần)`.
   - Tạo 1 dòng `inventory_batch_allocations` (`batch_id`, `quantity_taken = take`, `unit_cost = batch.import_price`).
   - `batch.remaining_qty -= take`.
   - `quantity_còn_cần -= take`.
3. Nếu duyệt hết batch mà `quantity_còn_cần > 0` → **tồn kho không đủ, huỷ toàn bộ giao dịch (rollback), báo lỗi rõ ràng cho user**, không tạo đơn bán.
4. `sales_order_details.cost_of_goods_sold = SUM(quantity_taken * unit_cost)` từ các allocation vừa tạo.
5. Sau khi tất cả dòng xử lý xong (không lỗi) → cập nhật `products.quantity` cho từng SP liên quan (trừ theo tổng đã bán).

> Toàn bộ bước trên phải nằm trong **1 transaction** — hoặc thành công hết, hoặc rollback hết, tránh trường hợp trừ kho nửa chừng.

### Thanh toán từng phần
- API riêng "Ghi nhận thanh toán" cho 1 đơn: thêm dòng `payments`, cộng dồn `sales_orders.paid_amount`.
- Chặn: `paid_amount` sau khi cộng không được vượt `total_amount` (nếu vượt → báo lỗi, không cho ghi).
- Tự động cập nhật `payment_status`:
  - `paid_amount == 0` → `unpaid`
  - `0 < paid_amount < total_amount` → `partial`
  - `paid_amount >= total_amount` → `paid`
- Mỗi lần thanh toán thay đổi → cập nhật lại `customers.total_debt`.

## 5. Module Thống kê

### Thống kê tháng (chọn tháng/năm cụ thể, mặc định tháng hiện tại)
- **Doanh thu tháng** = `SUM(sales_order_details.quantity * selling_price)` với `sale_date` trong tháng.
- **Lợi nhuận tháng** = Doanh thu tháng − `SUM(cost_of_goods_sold)` các dòng bán trong tháng.
- **Số lượng đã nhập trong tháng** = `SUM(purchase_order_details.quantity)` với `purchase_orders.import_date` trong tháng và `status = 'confirmed'`.
- **Số lượng đã bán trong tháng** = `SUM(sales_order_details.quantity)` với `sale_date` trong tháng.
- **Lượng hàng tồn kho**: tổng hiện tại (không theo tháng) = `SUM(products.quantity)`, có thể xem chi tiết theo từng SP.
- **Sản phẩm bán chạy**: top N SP theo `SUM(quantity)` bán ra, có thể lọc theo khoảng thời gian (mặc định tháng hiện tại).
- **Đơn hàng chưa thanh toán**: danh sách `sales_orders` có `payment_status IN ('unpaid','partial')`, sắp theo số nợ giảm dần hoặc theo ngày.

### Thống kê năm (tính năng optional — làm sau bản đầu nếu còn thời gian)
- Doanh thu năm, lợi nhuận năm, số lượng nhập/bán năm — cùng công thức trên nhưng gộp theo năm thay vì tháng.

## 6. Quy tắc chung / validation
- Mọi số lượng, đơn giá phải `> 0` khi submit (trừ trường hợp cho phép giá bán = 0 nếu là hàng tặng — **mặc định KHÔNG cho phép**, có thể mở sau).
- Ngày nhập hàng **không cho user sửa tay** (luôn = thời điểm confirm), khác với ngày bán (`sale_date`) là **cho sửa tay** theo đúng yêu cầu gốc.
- Mọi thao tác ảnh hưởng tồn kho (confirm nhập, tạo đơn bán) phải log đủ để truy vết (không cần bảng audit log riêng ở bản đầu, nhưng dữ liệu batch/allocation đã đủ để truy vết).
