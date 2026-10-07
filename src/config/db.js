/**
 * ============================================================================
 * CẤU HÌNH ĐA KẾT NỐI MONGOOSE (DUAL CONNECTIONS)
 * Dự án: Quản lý Sách Cloud
 * Sinh viên: Hoàng Lê An | MSSV: 23IT003 | Database: DB_23IT003
 * ============================================================================
 * Yêu cầu:
 * - connRead:  Kết nối bằng tài khoản read_23it003 (Chỉ đọc dữ liệu)
 * - connWrite: Kết nối bằng tài khoản write_23it003 (Ghi dữ liệu & Quản lý Session)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI_READ = process.env.MONGO_URI_READ;
const MONGO_URI_WRITE = process.env.MONGO_URI_WRITE;

if (!MONGO_URI_READ || !MONGO_URI_WRITE) {
  console.error('❌ [Config Error] Thiếu biến môi trường MONGO_URI_READ hoặc MONGO_URI_WRITE trong file .env');
  process.exit(1);
}

// Cấu hình chung cho connection pool tối ưu trên môi trường Cloud
const connectionOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// 1. Khởi tạo Connection ĐỌC (Read Stream - user: read_23it003)
const readConnection = mongoose.createConnection(MONGO_URI_READ, connectionOptions);

// 2. Khởi tạo Connection GHI (Write Stream - user: write_23it003)
const writeConnection = mongoose.createConnection(MONGO_URI_WRITE, connectionOptions);

// Lắng nghe sự kiện kết nối READ
readConnection.on('connected', () => {
  console.log('✅ [MongoDB READ] Đã kết nối thành công tới Database DB_23IT003 (User: read_23it003)');
});

readConnection.on('error', (err) => {
  console.error('❌ [MongoDB READ Error] Lỗi kết nối luồng đọc:', err.message);
});

readConnection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB READ] Mất kết nối luồng đọc.');
});

// Lắng nghe sự kiện kết nối WRITE
writeConnection.on('connected', () => {
  console.log('✅ [MongoDB WRITE] Đã kết nối thành công tới Database DB_23IT003 (User: write_23it003)');
});

writeConnection.on('error', (err) => {
  console.error('❌ [MongoDB WRITE Error] Lỗi kết nối luồng ghi:', err.message);
});

writeConnection.on('disconnected', () => {
  console.warn('⚠️ [MongoDB WRITE] Mất kết nối luồng ghi.');
});

module.exports = {
  readConnection,
  writeConnection
};
