# HỆ THỐNG QUẢN LÝ SÁCH CLOUD (CLOUD BOOK MANAGEMENT)

> **ĐỒ ÁN / BÀI THI GIỮA KỲ ĐIỆN TOÁN ĐÁM MÂY (CLOUD COMPUTING)**  
> **Sinh viên:** Hoàng Lê An  
> **MSSV:** 23IT003  
> **Cơ sở dữ liệu:** `DB_23IT003`  
> **Mức VAT áp dụng:** 7% (Công thức cá nhân hóa: (3 + 4)% = 7%)  
> **Tiền tố mã sách bắt buộc:** `003` (3 số cuối MSSV)  

---

## 📋 Mục Lục
1. [Giới thiệu Kiến trúc & Tính năng Kỹ thuật](#-giới-thiệu-kiến-trúc--tính-năng-kỹ-thuật)
2. [Cấu trúc Thư mục Dự án](#-cấu-trúc-thư-mục-dự-án)
3. [Hướng dẫn Cài đặt & Khởi chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
4. [Kiểm thử Logic Kỹ thuật (Validation & Dual Connections)](#-kiểm-thử-logic-kỹ-thuật)
5. [Cấu hình Phân quyền trên MongoDB Atlas](#-cấu-hình-phân-quyền-trên-mongodb-atlas)

---

## 🚀 Giới thiệu Kiến trúc & Tính năng Kỹ thuật

Dự án được xây dựng theo chuẩn kiến trúc Cloud-Native & Micro-architecture, đáp ứng 100% các tiêu chí kỹ thuật:

### 1. Đa Kết Nối Mongoose (Dual Connections):
- **Phân tách luồng Đọc/Ghi (CQRS pattern):**
  - **Luồng Đọc (`MONGO_URI_READ`):** Sử dụng tài khoản `read_23it003` với quyền chỉ đọc (`read` trên `DB_23IT003`). Khởi tạo model `BookRead` chuyên biệt cho các thao tác truy vấn hiển thị danh sách (`BookRead.find()`).
  - **Luồng Ghi (`MONGO_URI_WRITE`):** Sử dụng tài khoản `write_23it003` với quyền đọc-ghi (`readWrite` trên `DB_23IT003`). Khởi tạo model `BookWrite` chuyên biệt cho thao tác tạo mới sách (`BookWrite.create()`).

### 2. Stateless Session trên MongoDB Atlas:
- Tích hợp `express-session` kết hợp `connect-mongo`.
- Toàn bộ phiên làm việc (Session ID, biến đếm số lượt xem, flash messages) được lưu trữ trực tiếp vào collection `sessions` trên MongoDB Atlas thông qua luồng ghi `MONGO_URI_WRITE`.
- **Stateless hoàn toàn trên RAM:** Khi server khởi động lại hoặc mở rộng thành nhiều phiên bản (multi-instance/load balancer), phiên người dùng vẫn được bảo toàn nguyên vẹn trên Database Cloud.

### 3. Thuật toán Cá nhân hóa & Validation:
- **Lọc dữ liệu đầu vào:** Mã sách bắt buộc phải bắt đầu bằng 3 số cuối MSSV là `"003"` (ví dụ: `003-NODEJS`, `00399`). Nếu mã không bắt đầu bằng `"003"`, hệ thống lập tức từ chối và phản hồi mã lỗi chuẩn **HTTP 400 Bad Request**.
- **Tính toán động:** Trước khi lưu vào database, server tự động tính:
  $$\text{vatAmount} = \frac{\text{originalPrice} \times 7}{100}$$
  $$\text{finalPrice} = \text{originalPrice} + \text{vatAmount}$$
- **Handlebars Engine:** Giao diện tối giản Nền Trắng - Chữ Đen, hiển thị Footer bắt buộc:  
  `Họ tên: Hoàng Lê An | MSSV: 23IT003 | Mức VAT áp dụng: 7%`.

---

## 📁 Cấu trúc Thư mục Dự án

```text
GiuaKy/
├── .env                  # File cấu hình biến môi trường cục bộ
├── .env.example          # File mẫu các biến môi trường
├── .gitignore            # Chặn triệt để node_modules, .env, file rác OS/IDE
├── package.json          # Danh sách thư viện & scripts
├── README.md             # Tài liệu dự án chi tiết
├── server.js             # Điểm khởi chạy chính của ứng dụng
└── src/
    ├── config/
    │   └── db.js         # Khởi tạo đa kết nối Mongoose (readConnection & writeConnection)
    ├── models/
    │   └── Book.js       # Định nghĩa Schema, BookRead và BookWrite model
    ├── public/
    │   └── css/
    │       └── style.css # Giao diện CSS hiện đại (Dark Glassmorphism)
    ├── routes/
    │   └── bookRoutes.js # Xử lý nghiệp vụ GET, POST, validation HTTP 400
    └── views/
        ├── layouts/
        │   └── main.handlebars # Khung giao diện chính (chứa Footer chuẩn đề bài)
        ├── error.handlebars    # Trang hiển thị lỗi hệ thống
        └── home.handlebars     # Form nhập liệu & Bảng danh sách sách
```

---

## 🛠️ Hướng dẫn Cài đặt & Khởi chạy

### Bước 1: Mở terminal tại thư mục dự án và cài đặt dependencies
```bash
npm install
```

### Bước 2: Cấu hình file `.env`
Mở file `.env` và cập nhật thông tin chuỗi kết nối MongoDB Atlas của bạn:
```env
PORT=3000
SESSION_SECRET=hoang_le_an_23it003_secure_cloud_session_key

# Kết nối READ (Tài khoản chỉ đọc: read_23it003)
MONGO_URI_READ=mongodb+srv://read_23it003:<PASSWORD>@<YOUR_CLUSTER>.mongodb.net/DB_23IT003?retryWrites=true&w=majority

# Kết nối WRITE (Tài khoản ghi: write_23it003)
MONGO_URI_WRITE=mongodb+srv://write_23it003:<PASSWORD>@<YOUR_CLUSTER>.mongodb.net/DB_23IT003?retryWrites=true&w=majority

STUDENT_NAME=Hoàng Lê An
STUDENT_ID=23IT003
BOOK_PREFIX=003
VAT_RATE=8
```

### Bước 3: Khởi chạy ứng dụng
- **Chạy chế độ thông thường:**
  ```bash
  npm start
  ```
- **Chạy chế độ phát triển (tự động reload khi sửa file):**
  ```bash
  npm run dev
  ```

### Bước 4: Mở trình duyệt web
Truy cập: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Kiểm thử Logic Kỹ thuật

### 1. Kiểm tra Lọc Dữ Liệu Đầu Vào & Mã Lỗi HTTP 400
Khi gửi yêu cầu thêm sách với mã sách **không có tiền tố "003"**:

#### Test bằng cURL:
```bash
# Test trường hợp SAI TIỀN TỐ (Kỳ vọng: HTTP 400 Bad Request)
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "bookCode": "999-BOOK",
    "title": "Sách Test Lỗi",
    "author": "Nguyễn Văn A",
    "originalPrice": 100000
  }'
```
**Kết quả trả về:**
```json
{
  "success": false,
  "status": 400,
  "error": "Mã sản phẩm bắt buộc phải có tiền tố là 3 số cuối MSSV (\"003\"). Giá trị nhận: \"999-BOOK\""
}
```

#### Test trường hợp HỢP LỆ (Tiền tố bắt đầu bằng "003"):
```bash
# Test trường hợp ĐÚNG TIỀN TỐ (Kỳ vọng: HTTP 201 Created & VAT 8%)
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "bookCode": "003-CLOUD-01",
    "title": "Điện toán Đám mây Căn bản",
    "author": "Hoàng Lê An",
    "originalPrice": 200000
  }'
```
**Kết quả tự động tính toán động:**
```json
{
  "success": true,
  "message": "Tạo sách mới thành công qua luồng WRITE!",
  "connection": "MONGO_URI_WRITE (write_23it003)",
  "database": "DB_23IT003",
  "data": {
    "bookCode": "003-CLOUD-01",
    "title": "Điện toán Đám mây Căn bản",
    "author": "Hoàng Lê An",
    "originalPrice": 200000,
    "vatRate": 8,
    "vatAmount": 16000,
    "finalPrice": 216000
  }
}
```

---

## ☁️ Cấu hình Phân quyền trên MongoDB Atlas

Để cấu hình đúng chuẩn 2 tài khoản trên **MongoDB Atlas**:
1. Vào **Database Access** -> **Add New Database User**:
   - **Tài khoản Đọc:**
     - Username: `read_23it003`
     - Database User Privileges: Chọn `Built-in Role` -> `Read any database` (hoặc cấu hình Custom Role chỉ cho phép `find` trên database `DB_23IT003`).
   - **Tài khoản Ghi:**
     - Username: `write_23it003`
     - Database User Privileges: Chọn `Built-in Role` -> `Read and write to any database` (hoặc `readWrite` trên database `DB_23IT003`).
2. Vào **Network Access** -> **Add IP Address** -> Thêm `0.0.0.0/0` (Allow access from anywhere) để đảm bảo kết nối từ máy phát triển / server.
