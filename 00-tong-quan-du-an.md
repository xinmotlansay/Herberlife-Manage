# 00 — Tổng quan dự án: Hệ thống Quản lý Kho - Bán hàng (Local Web App)

## 1. Mục tiêu
Xây dựng web app chạy **local, miễn phí, không cần server ngoài**, phục vụ 1 cửa hàng nhỏ, quản lý:
Nhập hàng (qua OCR ảnh hoá đơn) → Kho → Khách hàng → Bán hàng (FIFO) → Thống kê.

## 2. Tech stack đã chốt

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Backend | Node.js + Express | Free, nhẹ, dễ chạy local |
| Frontend | React (Vite) | Free, phổ biến, dev nhanh |
| Database | SQLite (qua `better-sqlite3`) | File local `.db`, không cần cài server DB riêng, free |
| OCR | Google Vision API | Độ chính xác cao hơn Tesseract; **cần API key riêng, có free tier giới hạn, dùng nhiều sẽ tốn phí** (user đã chấp nhận đánh đổi này) |
| Upload ảnh | Multer (backend) | Lưu ảnh hoá đơn tạm/local |
| Auth | **Không có** | Mở web dùng được luôn, không đăng nhập |

> ⚠️ Lưu ý chi phí: Google Vision API tính phí theo số lượt gọi sau khi hết free tier (thường ~1000 request/tháng miễn phí, tuỳ chính sách Google tại thời điểm dùng — cần kiểm tra giá mới nhất trước khi deploy thật). Cần file `.env` chứa `GOOGLE_VISION_API_KEY`, **không commit key lên git**.

## 3. Các quyết định nghiệp vụ đã chốt qua hỏi-đáp

1. **OCR chỉ đọc CHỮ** (text) trên hoá đơn: mã SP, tên SP, số lượng, đơn giá trước thuế — không nhận diện hình ảnh sản phẩm. App tự tính thêm 8% thuế và tự set ngày nhập = thời điểm xác nhận.
2. **Thanh toán cho phép trả từng phần** (một đơn có thể có nhiều lần thanh toán, trạng thái: `unpaid` / `partial` / `paid`).
3. **Không có đăng nhập** — nhưng hệ thống vẫn cần biết "ai thao tác" ở mức tối thiểu để không mất dấu vết, xem mục Điều chỉnh ERD bên dưới.
4. **Database: SQLite**, 1 file `data.sqlite` trong thư mục `backend/data/`.

## 4. Các giả định (assumptions) — vì user chưa nói rõ, tao chọn phương án hợp lý, có thể chỉnh sau

| Vấn đề | Giả định |
|---|---|
| Bỏ đăng nhập nhưng ERD gốc có bảng USERS | Bỏ bảng `users` khỏi luồng bắt buộc; giữ lại 1 field text đơn giản `created_by` (mặc định `"Chủ shop"`, có thể sửa tay khi tạo đơn) để không mất hoàn toàn ngữ cảnh "ai tạo đơn" — **không phải bảng quan hệ, không có mật khẩu/role** |
| Thuế suất 8% | Hardcode làm hằng số `DEFAULT_TAX_RATE = 8`, nhưng lưu `tax_rate` theo từng dòng nhập hàng (không lưu cứng ở code) để sau này dễ đổi % nếu luật thuế thay đổi |
| Đơn vị tính (cái, thùng, kg...) | Chưa được user đề cập → thêm field `unit` (text, mặc định `"cái"`) cho `products`, không bắt buộc nhập |
| Sản phẩm không xác định được ảnh khi tạo mới từ OCR | `products.image_url` để `NULL` |
| Xoá sản phẩm đã từng có giao dịch | Dùng **soft delete** — set `status = 'inactive'`, không xoá cứng khỏi DB, để không phá vỡ lịch sử đơn nhập/bán đã tham chiếu tới nó |
| Bán vượt tồn kho | Hệ thống **chặn**, báo lỗi "không đủ hàng tồn", không cho tạo đơn bán |
| Truy cập mạng | Chạy trên `localhost` (1 máy). Nếu sau này cần nhiều máy trong cùng mạng LAN cùng truy cập, chỉ cần đổi cách chạy Express (bind `0.0.0.0`), sẽ ghi chú trong file setup, không ảnh hưởng schema |
| Tiền tệ | VNĐ, số nguyên (không thập phân) trừ khi user yêu cầu khác |

## 5. Danh sách file rule đi kèm

- `01-erd-schema-database.md` — ERD điều chỉnh + schema SQLite chi tiết (tên bảng, cột, kiểu, khoá, ràng buộc)
- `02-quy-tac-nghiep-vu.md` — Business rules: luồng nhập hàng + OCR + popup xác nhận, FIFO xuất kho, tính giá vốn/lợi nhuận, công nợ khách hàng, thanh toán từng phần, thống kê
- `03-api-endpoints.md` — Danh sách REST API endpoint theo từng module
- `04-cau-truc-thu-muc-va-tech-stack.md` — Cấu trúc thư mục dự án, thư viện cần cài, biến môi trường, cách chạy local

## 6. Việc cần user xác nhận thêm (không chặn việc bắt đầu code, nhưng nên biết trước)
- Google Vision API: user cần tự tạo API key tại Google Cloud Console (có hướng dẫn trong file setup) — đây là bước ngoài phạm vi code.
- Nếu sau này muốn thêm đăng nhập/phân quyền thật, ERD đã được thiết kế để dễ gắn lại bảng `users` mà không phải đập đi xây lại.
