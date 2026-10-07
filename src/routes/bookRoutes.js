/**
 * ============================================================================
 * ROUTES & CONTROLLER QUẢN LÝ SÁCH CLOUD
 * Sinh viên: Hoàng Lê An | MSSV: 23IT003
 * ============================================================================
 * - GET /        : Dùng BookRead để lấy danh sách từ MongoDB Atlas
 * - POST /books  : Validate tiền tố "003" (nếu sai trả 400), tính VAT 7%, dùng BookWrite để lưu
 * - GET /api/books: API JSON (Read Stream)
 * - POST /api/books: API JSON (Write Stream)
 */

const express = require('express');
const router = express.Router();
const { BookRead, BookWrite, BOOK_PREFIX, VAT_RATE } = require('../models/Book');

// Helper tính toán thống kê
const calculateStats = (books) => {
  const totalBooks = books.length;
  const totalValue = books.reduce((sum, b) => sum + (b.finalPrice || 0), 0);
  const totalOriginal = books.reduce((sum, b) => sum + (b.originalPrice || 0), 0);
  const totalVat = books.reduce((sum, b) => sum + (b.vatAmount || 0), 0);
  return { totalBooks, totalValue, totalOriginal, totalVat };
};

/**
 * 1. GIAO DIỆN TRANG CHỦ (RENDER HANDLEBARS)
 * Chỉ dùng BookRead để truy vấn dữ liệu
 */
router.get('/', async (req, res) => {
  try {
    // Tăng biến đếm số lượt xem trong Session (Stateless trên MongoDB Atlas)
    req.session.visitCount = (req.session.visitCount || 0) + 1;

    // CHỈ SỬ DỤNG BookRead (Read Connection - user read_23it003)
    const books = await BookRead.find().sort({ createdAt: -1 }).lean();
    const stats = calculateStats(books);

    const flash = req.session.flash;
    delete req.session.flash;

    res.render('home', {
      title: 'Hệ thống Quản lý Sách Cloud - DB_23IT003',
      books,
      stats,
      flash,
      student: {
        name: process.env.STUDENT_NAME || 'Hoàng Lê An',
        id: process.env.STUDENT_ID || '23IT003',
        vatRate: VAT_RATE,
        bookPrefix: BOOK_PREFIX,
        dbName: 'DB_23IT003'
      },
      sessionInfo: {
        id: req.sessionID,
        visitCount: req.session.visitCount,
        cookieExpires: req.session.cookie?.expires
      }
    });
  } catch (error) {
    console.error('❌ [GET / Error]', error);
    res.status(500).render('error', {
      message: 'Không thể truy vấn danh sách sách từ luồng READ!',
      error: error.message
    });
  }
});

/**
 * 2. THÊM MỚI SÁCH QUA FORM (POST /books)
 * Kiểm tra tiền tố "003", tính thuế VAT 7%, dùng BookWrite để ghi dữ liệu
 */
router.post('/books', async (req, res) => {
  const { bookCode, title, author, category, originalPrice } = req.body;

  // Lọc dữ liệu đầu vào: Mã sản phẩm bắt buộc phải có tiền tố "003"
  const trimmedCode = (bookCode || '').trim();
  const originalPriceNum = Number(originalPrice);

  // Kiểm tra điều kiện tiền tố theo yêu cầu kỹ thuật: Trả về HTTP 400 nếu sai
  if (!trimmedCode.startsWith(BOOK_PREFIX)) {
    // Lấy lại danh sách qua BookRead để render lại trang với HTTP status 400
    try {
      const books = await BookRead.find().sort({ createdAt: -1 }).lean();
      const stats = calculateStats(books);

      return res.status(400).render('home', {
        title: 'Lỗi Dữ Liệu Đầu Vào - 400 Bad Request',
        books,
        stats,
        error: `[LỖI HTTP 400]: Mã sản phẩm bắt buộc phải có tiền tố là 3 số cuối MSSV ("${BOOK_PREFIX}"). Giá trị bạn nhập là "${trimmedCode}".`,
        formData: req.body,
        student: {
          name: process.env.STUDENT_NAME || 'Hoàng Lê An',
          id: process.env.STUDENT_ID || '23IT003',
          vatRate: VAT_RATE,
          bookPrefix: BOOK_PREFIX,
          dbName: 'DB_23IT003'
        },
        sessionInfo: {
          id: req.sessionID,
          visitCount: req.session.visitCount
        }
      });
    } catch (e) {
      return res.status(400).send(`HTTP 400 Bad Request: Mã sách phải có tiền tố "${BOOK_PREFIX}"!`);
    }
  }

  // Kiểm tra các trường bắt buộc khác
  if (!title || !author || isNaN(originalPriceNum) || originalPriceNum < 0) {
    const books = await BookRead.find().sort({ createdAt: -1 }).lean();
    return res.status(400).render('home', {
      title: 'Lỗi Dữ Liệu Đầu Vào - 400 Bad Request',
      books,
      stats: calculateStats(books),
      error: 'Vui lòng điền đầy đủ Tên sách, Tác giả và Giá gốc hợp lệ (>= 0)!',
      formData: req.body,
      student: {
        name: process.env.STUDENT_NAME || 'Hoàng Lê An',
        id: process.env.STUDENT_ID || '23IT003',
        vatRate: VAT_RATE,
        bookPrefix: BOOK_PREFIX,
        dbName: 'DB_23IT003'
      },
      sessionInfo: {
        id: req.sessionID,
        visitCount: req.session.visitCount
      }
    });
  }

  try {
    // Tính toán động Giá sau thuế = Giá gốc + (Giá gốc * VAT / 100) (Với VAT = (3 + 4)% = 7%)
    const vatAmount = Math.round((originalPriceNum * VAT_RATE) / 100);
    const finalPrice = originalPriceNum + vatAmount;

    // CHỈ SỬ DỤNG BookWrite (Write Connection - user write_23it003)
    await BookWrite.create({
      bookCode: trimmedCode,
      title: title.trim(),
      author: author.trim(),
      category: category ? category.trim() : 'Khoa học Công nghệ',
      originalPrice: originalPriceNum,
      vatRate: VAT_RATE,
      vatAmount,
      finalPrice
    });

    // Lưu thông báo thành công vào Session (Stateless trên MongoDB Atlas)
    req.session.flash = {
      type: 'success',
      message: `Đã thêm thành công sách "${title}" (Mã: ${trimmedCode}) với giá sau thuế ${finalPrice.toLocaleString('vi-VN')} VNĐ (VAT ${VAT_RATE}%)!`
    };

    res.redirect('/');
  } catch (err) {
    console.error('❌ [POST /books Error]', err);
    let errMsg = err.message;
    if (err.code === 11000) {
      errMsg = `Mã sách "${trimmedCode}" đã tồn tại trong hệ thống!`;
    }

    const books = await BookRead.find().sort({ createdAt: -1 }).lean();
    res.status(400).render('home', {
      title: 'Lỗi Thêm Sách',
      books,
      stats: calculateStats(books),
      error: `[Lỗi Ghi Dữ Liệu]: ${errMsg}`,
      formData: req.body,
      student: {
        name: process.env.STUDENT_NAME || 'Hoàng Lê An',
        id: process.env.STUDENT_ID || '23IT003',
        vatRate: VAT_RATE,
        bookPrefix: BOOK_PREFIX,
        dbName: 'DB_23IT003'
      },
      sessionInfo: {
        id: req.sessionID,
        visitCount: req.session.visitCount
      }
    });
  }
});

/**
 * 3. REST API ENDPOINTS (Dành cho kiểm thử hoặc gọi từ Postman / cURL)
 */

// GET /api/books (Đọc từ BookRead)
router.get('/api/books', async (req, res) => {
  try {
    const books = await BookRead.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: books.length,
      connection: 'MONGO_URI_READ (read_23it003)',
      database: 'DB_23IT003',
      data: books
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/books (Ghi qua BookWrite)
router.post('/api/books', async (req, res) => {
  try {
    const { bookCode, title, author, category, originalPrice } = req.body;
    const trimmedCode = (bookCode || '').trim();

    // Kiểm tra tiền tố 003 bắt buộc
    if (!trimmedCode.startsWith(BOOK_PREFIX)) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: `Mã sản phẩm bắt buộc phải có tiền tố là 3 số cuối MSSV ("${BOOK_PREFIX}"). Giá trị nhận: "${trimmedCode}"`
      });
    }

    const priceNum = Number(originalPrice);
    if (!title || !author || isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: 'Dữ liệu không hợp lệ: Thiếu title, author hoặc originalPrice < 0'
      });
    }

    // Tính toán động Giá sau thuế
    const vatAmount = Math.round((priceNum * VAT_RATE) / 100);
    const finalPrice = priceNum + vatAmount;

    // Ghi qua BookWrite
    const newBook = await BookWrite.create({
      bookCode: trimmedCode,
      title: title.trim(),
      author: author.trim(),
      category: category || 'Khoa học Công nghệ',
      originalPrice: priceNum,
      vatRate: VAT_RATE,
      vatAmount,
      finalPrice
    });

    res.status(201).json({
      success: true,
      message: 'Tạo sách mới thành công qua luồng WRITE!',
      connection: 'MONGO_URI_WRITE (write_23it003)',
      database: 'DB_23IT003',
      data: newBook
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
