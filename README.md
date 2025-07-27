# 🛒 Taobao Order Helper Extension

**Extension Chrome để trích xuất và quản lý đơn hàng từ Taobao, Tmall, Pinduoduo và kiểm tra trạng thái NhapHangChina**

## 🎯 Tính năng chính

### **📊 Trích xuất dữ liệu**
- ✅ **Taobao/Tmall**: Trích xuất từ trang đơn hàng
- ✅ **Pinduoduo**: Trích xuất qua API với phân trang
- ✅ **NhapHangChina**: Kiểm tra trạng thái đơn hàng

### **🛠️ Quản lý dữ liệu**
- 📋 Copy dữ liệu vào clipboard (Excel/Google Sheets)
- 🎛️ Tùy chỉnh cột hiển thị
- 📏 Resize cột theo ý muốn
- 🔄 Cập nhật real-time
- 💾 Lưu trữ persistent

### **🌐 Dịch thuật**
- 🤖 Tích hợp Gemini API
- 🌍 Dịch tên sản phẩm và thông số
- ⚙️ Cấu hình model và API key

### **📦 Kiểm tra trạng thái**
- 🔍 Kiểm tra trạng thái NhapHangChina
- 🎨 Color coding theo trạng thái
- ⚡ Cập nhật real-time từng đơn hàng

## 🚀 Cài đặt

### **Cách 1: Load unpacked (Khuyến nghị)**
1. Tải file `TaobaoOrderHelper.zip`
2. Giải nén vào thư mục
3. Mở Chrome → `chrome://extensions/`
4. Bật "Developer mode"
5. Bấm "Load unpacked" → Chọn thư mục đã giải nén

### **Cách 2: Từ Chrome Web Store**
*Sẽ có sẵn sau khi publish*

## 📖 Hướng dẫn sử dụng

### **Trên Taobao/Tmall:**
1. Truy cập trang đơn hàng
2. Bấm icon extension → "Trích xuất"
3. Dữ liệu hiển thị trong popup
4. Copy, tùy chỉnh cột, lấy mã vận đơn

### **Trên Pinduoduo:**
1. Truy cập trang đơn hàng Pinduoduo
2. Bấm icon extension → "Trích xuất"
3. Dữ liệu tải từ API
4. Có thể tải thêm 50 sản phẩm tiếp theo

### **Trên NhapHangChina:**
1. Truy cập trang NhapHangChina
2. Bấm icon extension → "Kiểm tra trạng thái"
3. Kiểm tra trạng thái các đơn hàng đã có

## 🎨 Giao diện

### **Platform Detection:**
- 🎯 **Taobao/Tmall**: Hiển thị nút "Lấy tất cả mã vận đơn"
- 🛒 **Pinduoduo**: Hiển thị nút "Tải thêm"
- 📦 **NhapHangChina**: Hiển thị nút "Kiểm tra trạng thái"

### **UI Features:**
- 🎨 Giao diện hiện đại và responsive
- 📊 Bảng dữ liệu có thể resize cột
- 🎛️ Tùy chỉnh cột linh hoạt
- 📱 Tương thích mobile

## 🔧 Cấu hình

### **Gemini API (Dịch thuật):**
1. Mở popup extension
2. Bấm icon ⚙️ (Settings)
3. Nhập Gemini API Key
4. Chọn model (Gemini 2.5 Flash khuyến nghị)
5. Bấm "Lưu cài đặt"

### **Tùy chỉnh cột:**
1. Bấm "Tùy chỉnh" trong popup
2. Chọn/bỏ chọn cột muốn hiển thị
3. Kéo thả để sắp xếp lại
4. Bấm "Áp dụng"

## 📁 Cấu trúc dự án

```
src/
├── manifest.json          # Cấu hình extension
├── html/
│   └── popup.html        # Giao diện popup
├── css/
│   └── popup.css         # Style cho popup
├── js/
│   ├── popup.js          # Logic popup
│   ├── content.js        # Logic content script
│   ├── background.js     # Background service
│   └── debug-helper.js   # Debug utilities
└── images/               # Icons và hình ảnh
```

## 🔒 Quyền và bảo mật

### **Quyền cần thiết:**
- `activeTab`: Truy cập tab hiện tại
- `storage`: Lưu trữ dữ liệu
- `clipboardWrite`: Copy dữ liệu
- `cookies`: Đọc cookie cho API

### **Host permissions:**
- `https://*.taobao.com/*`
- `https://*.tmall.com/*`
- `https://*.yangkeduo.com/*`
- `https://*.nhaphangchina.vn/*`
- `https://generativelanguage.googleapis.com/*`

## 🐛 Xử lý sự cố

### **Extension không hoạt động:**
1. Kiểm tra Developer mode đã bật
2. Refresh trang web
3. Disable/Enable lại extension
4. Kiểm tra console log (F12)

### **Không trích xuất được:**
1. Đảm bảo đang ở trang đơn hàng đúng
2. Thử refresh trang
3. Kiểm tra đã đăng nhập chưa
4. Xem console log để debug

### **Dịch thuật không hoạt động:**
1. Kiểm tra Gemini API Key
2. Kiểm tra model đã chọn
3. Kiểm tra quota API
4. Xem console log để debug

## 🔄 Cập nhật

### **Phiên bản hiện tại:** v1.0
- ✅ Trích xuất Taobao/Tmall
- ✅ Trích xuất Pinduoduo (API)
- ✅ Kiểm tra NhapHangChina
- ✅ Dịch thuật Gemini
- ✅ UI/UX hiện đại
- ✅ Real-time updates

### **Roadmap:**
- 🔄 Tích hợp thêm platform
- 🔄 Export Excel trực tiếp
- 🔄 Dashboard thống kê
- 🔄 Notification system

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra console log (F12 → Console)
2. Chụp ảnh lỗi
3. Mô tả chi tiết vấn đề
4. Liên hệ developer

## 📄 License

MIT License - Xem file `LICENSE` để biết thêm chi tiết.

---

**🎉 Cảm ơn bạn đã sử dụng Taobao Order Helper Extension!** 