/**
 * ============================================================================
 * SERVER CHÍNH: ỨNG DỤNG QUẢN LÝ SÁCH CLOUD (DB_23IT003)
 * Sinh viên: Hoàng Lê An | MSSV: 23IT003
 * ============================================================================
 * Đặc điểm kiến trúc:
 * 1. Mongoose Dual Connections: Phân tách luồng Read (read_23it003) và Write (write_23it003).
 * 2. Stateless Session: Toàn bộ session được lưu trữ phân tán trực tiếp trên MongoDB Atlas qua connect-mongo.
 * 3. Handlebars Engine: Giao diện trực quan, bảng thống kê và footer cá nhân hóa.
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Khởi tạo các kết nối Mongoose từ db.js
const { readConnection, writeConnection } = require('./src/config/db');
const bookRoutes = require('./src/routes/bookRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware phân tích request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cấu hình Static Files (CSS, JS, Icons)
app.use(express.static(path.join(__dirname, 'src', 'public')));

// Cấu hình View Engine: Express-Handlebars
app.engine(
  'handlebars',
  engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'src', 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'src', 'views', 'partials'),
    helpers: {
      // Helper định dạng tiền tệ Việt Nam (VNĐ)
      formatCurrency: (value) => {
        if (value == null || isNaN(value)) return '0 đ';
        return Number(value).toLocaleString('vi-VN') + ' đ';
      },
      // Helper định dạng ngày tháng
      formatDate: (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      },
      // Helper so sánh
      eq: (a, b) => a === b,
      add: (a, b) => Number(a) + Number(b)
    }
  })
);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'src', 'views'));

// ============================================================================
// 2. STATELESS SESSION TRÊN MONGODB ATLAS (connect-mongo)
// Không lưu trữ trên RAM của Server, toàn bộ session lưu trực tiếp vào collection 'sessions'
// Sử dụng MONGO_URI_WRITE
// ============================================================================
const mongoStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI_WRITE,
  collectionName: 'sessions',
  ttl: 14 * 24 * 60 * 60, // Thời gian sống của session: 14 ngày
  autoRemove: 'native',
  touchAfter: 24 * 3600 // Lazy session update mỗi 24h nếu không thay đổi dữ liệu
});

mongoStore.on('error', (err) => {
  console.error('❌ [Session Store Error] Lỗi kết nối session tới MongoDB Atlas:', err);
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'Secret_23IT003_HoangLeAn_CloudBook',
    resave: false,
    saveUninitialized: false,
    store: mongoStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 ngày
      httpOnly: true,
      secure: false // Đổi thành true khi chạy HTTPS trên Production
    }
  })
);

// Middleware gắn thông tin cơ sở dữ liệu và phiên làm việc toàn cục
app.use((req, res, next) => {
  res.locals.appMetadata = {
    appName: 'Quản lý Sách Cloud',
    studentName: process.env.STUDENT_NAME || 'Hoàng Lê An',
    studentId: process.env.STUDENT_ID || '23IT003',
    dbName: 'DB_23IT003',
    vatRate: process.env.VAT_RATE || '7',
    bookPrefix: process.env.BOOK_PREFIX || '003'
  };
  next();
});

// Định tuyến các chức năng Quản lý sách
app.use('/', bookRoutes);

// Xử lý trang lỗi 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Không Tìm Thấy Trang',
    message: 'Đường dẫn bạn yêu cầu không tồn tại trên hệ thống.',
    error: '404 Not Found'
  });
});

// Xử lý lỗi toàn cục 500
app.use((err, req, res, next) => {
  console.error('💥 [Server Unhandled Error]', err.stack);
  res.status(500).render('error', {
    title: '500 - Lỗi Máy Chủ Nội Bộ',
    message: 'Đã xảy ra lỗi trong quá trình xử lý yêu cầu trên Cloud.',
    error: err.message
  });
});

// Khởi động HTTP Server
app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Server đang chạy thành công tại: http://localhost:${PORT}`);
  console.log(`👤 Sinh viên: ${process.env.STUDENT_NAME || 'Hoàng Lê An'} (MSSV: ${process.env.STUDENT_ID || '23IT003'})`);
  console.log(`📦 Database: DB_23IT003 | VAT áp dụng: ${process.env.VAT_RATE || '7'}% | Tiền tố: 003`);
  console.log(`☁️ Kiến trúc: Dual Connections Mongoose + Stateless Session Atlas`);
  console.log('================================================================');
});
