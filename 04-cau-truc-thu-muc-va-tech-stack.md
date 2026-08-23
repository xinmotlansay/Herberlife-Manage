# 04 — Cấu trúc thư mục & Tech stack chi tiết

## 1. Cấu trúc thư mục đề xuất

```
warehouse-app/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql          # toàn bộ CREATE TABLE (theo 01-erd-schema-database.md)
│   │   │   └── connection.js       # khởi tạo better-sqlite3
│   │   ├── routes/
│   │   │   ├── purchaseOrders.js
│   │   │   ├── products.js
│   │   │   ├── customers.js
│   │   │   ├── salesOrders.js
│   │   │   └── statistics.js
│   │   ├── services/
│   │   │   ├── ocrService.js       # gọi Google Vision, parse text
│   │   │   ├── fifoService.js      # logic trừ kho FIFO
│   │   │   └── statsService.js
│   │   ├── middleware/
│   │   │   └── validate.js
│   │   └── app.js                  # khởi tạo Express
│   ├── uploads/
│   │   └── purchase_invoices/      # ảnh hoá đơn upload
│   ├── data/
│   │   └── data.sqlite             # file DB (gitignore)
│   ├── .env                        # GOOGLE_VISION_API_KEY=... (gitignore)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── PurchaseImport.jsx      # trang nhập hàng + OCR + popup xác nhận
│   │   │   ├── PurchaseHistory.jsx
│   │   │   ├── Inventory.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── SalesCreate.jsx
│   │   │   ├── SalesHistory.jsx
│   │   │   └── Statistics.jsx
│   │   ├── components/
│   │   ├── api/
│   │   │   └── client.js           # wrapper gọi backend API
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 2. Thư viện cần cài

### Backend (`backend/package.json`)
- `express` — web framework
- `better-sqlite3` — SQLite driver (đồng bộ, nhanh, phù hợp app local)
- `multer` — xử lý upload ảnh
- `@google-cloud/vision` — SDK gọi Google Vision API (hoặc dùng REST API thuần qua `axios` nếu muốn nhẹ hơn, không bắt buộc SDK)
- `dotenv` — đọc `.env`
- `cors` — cho phép frontend (port khác) gọi API local

### Frontend (`frontend/package.json`)
- `react`, `react-dom`
- `vite` — dev server/build
- `react-router-dom` — điều hướng giữa các trang
- `axios` — gọi API
- Thư viện UI: đề xuất **không bắt buộc** thư viện nặng, có thể dùng CSS thuần hoặc TailwindCSS nếu muốn làm nhanh & đẹp hơn — quyết định khi bắt đầu code phần frontend

## 3. Biến môi trường (`backend/.env.example`)
```
PORT=3000
GOOGLE_VISION_API_KEY=your_google_vision_api_key_here
DEFAULT_TAX_RATE=8
UPLOAD_MAX_SIZE_MB=10
```

## 4. Cách lấy Google Vision API Key (việc user cần tự làm, ngoài phạm vi code)
1. Vào Google Cloud Console → tạo project mới (hoặc dùng project có sẵn).
2. Bật **Cloud Vision API** trong mục "APIs & Services".
3. Tạo **API Key** trong mục "Credentials".
4. (Khuyến nghị) Giới hạn API key chỉ cho phép gọi Vision API để tránh lộ key bị dùng sai mục đích.
5. Dán key vào `backend/.env` → `GOOGLE_VISION_API_KEY=...`.
6. Theo dõi mục Billing để biết khi nào vượt free tier.

## 5. Cách chạy local
```bash
# Backend
cd backend
npm install
npm run dev     # ví dụ dùng nodemon, chạy ở http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev     # Vite, mặc định http://localhost:5173, proxy API sang :3000
```

## 6. Ghi chú mở rộng sau này (không làm ở bản đầu)
- Muốn nhiều máy trong LAN cùng dùng: đổi `app.listen(PORT, '0.0.0.0')` ở backend, và các máy khác truy cập qua IP LAN của máy chạy server — **không đổi schema DB**.
- Muốn thêm đăng nhập thật: thêm lại bảng `users` (đã né tên/thiết kế để không đụng bảng nào khác), thêm middleware auth, đổi `created_by` (text) thành `user_id` (FK).
- Muốn giảm chi phí OCR: có thể thêm cơ chế cache kết quả OCR theo ảnh, hoặc cho phép chọn Tesseract.js làm phương án dự phòng khi hết quota Google Vision.
