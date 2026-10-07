/**
 * ============================================================================
 * MODEL QUẢN LÝ SÁCH (DUAL MODELS TRÊN 2 CONNECTIONS RIÊNG BIỆT)
 * Sinh viên: Hoàng Lê An | MSSV: 23IT003
 * ============================================================================
 * - BookRead:  Gắn với readConnection (Dùng cho truy vấn/đọc)
 * - BookWrite: Gắn với writeConnection (Dùng cho thêm mới/ghi)
 */

const mongoose = require('mongoose');
const { readConnection, writeConnection } = require('../config/db');

const BOOK_PREFIX = process.env.BOOK_PREFIX || '003';
const VAT_RATE = Number(process.env.VAT_RATE) || 7;

const bookSchema = new mongoose.Schema(
  {
    bookCode: {
      type: String,
      required: [true, 'Mã sách là bắt buộc!'],
      trim: true,
      validate: {
        validator: function (v) {
          // Quy tắc bắt buộc: Mã sách phải bắt đầu bằng 3 số cuối MSSV ("003")
          return typeof v === 'string' && v.startsWith(BOOK_PREFIX);
        },
        message: (props) =>
          `Mã sách không hợp lệ! Mã phải bắt đầu bằng tiền tố "${BOOK_PREFIX}" (Theo MSSV: 23IT003). Giá trị nhận được: "${props.value}"`
      }
    },
    title: {
      type: String,
      required: [true, 'Tên sách không được để trống!'],
      trim: true
    },
    author: {
      type: String,
      required: [true, 'Tên tác giả không được để trống!'],
      trim: true
    },
    category: {
      type: String,
      default: 'Khoa học Công nghệ',
      trim: true
    },
    originalPrice: {
      type: Number,
      required: [true, 'Giá gốc là bắt buộc!'],
      min: [0, 'Giá gốc không được âm!']
    },
    vatRate: {
      type: Number,
      default: VAT_RATE
    },
    vatAmount: {
      type: Number,
      required: true
    },
    finalPrice: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'books'
  }
);

// Middleware Pre-save: Đảm bảo tính toán động Giá sau thuế trước khi lưu vào MongoDB
bookSchema.pre('validate', function (next) {
  if (this.originalPrice != null) {
    const rate = this.vatRate ?? VAT_RATE;
    this.vatAmount = Math.round((this.originalPrice * rate) / 100);
    this.finalPrice = this.originalPrice + this.vatAmount;
  }
  next();
});

// Đăng ký Model trên Connection ĐỌC
const BookRead = readConnection.model('Book', bookSchema);

// Đăng ký Model trên Connection GHI
const BookWrite = writeConnection.model('Book', bookSchema);

module.exports = {
  BookRead,
  BookWrite,
  BOOK_PREFIX,
  VAT_RATE
};
