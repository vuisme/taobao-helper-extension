# 📦 Hướng dẫn cài đặt Taobao Order Helper Extension

## 🚀 Cách cài đặt extension vào Chrome

### **Bước 1: Tải file extension**
- File extension: `TaobaoOrderHelper.zip` (đã được tạo sẵn)
- Kích thước: ~35KB

### **Bước 2: Giải nén file**
1. Chuột phải vào file `TaobaoOrderHelper.zip`
2. Chọn "Extract All..." hoặc "Giải nén tất cả"
3. Chọn thư mục đích (ví dụ: Desktop)
4. Bấm "Extract" hoặc "Giải nén"

### **Bước 3: Mở Chrome Extensions**
1. Mở Google Chrome
2. Gõ `chrome://extensions/` vào thanh địa chỉ
3. Hoặc vào Menu (3 chấm) → More tools → Extensions

### **Bước 4: Bật Developer Mode**
1. Ở góc phải trên, bật toggle "Developer mode" (Chế độ nhà phát triển)
2. Sẽ xuất hiện 3 nút mới: "Load unpacked", "Pack extension", "Update"

### **Bước 5: Load extension**
1. Bấm nút "Load unpacked" (Tải extension chưa đóng gói)
2. Chọn thư mục đã giải nén (chứa file `manifest.json`)
3. Bấm "Select Folder" hoặc "Chọn thư mục"

### **Bước 6: Xác nhận cài đặt**
- Extension sẽ xuất hiện trong danh sách
- Icon extension sẽ xuất hiện trên thanh công cụ
- Bấm vào icon để mở popup

## 🎯 Cách sử dụng

### **Trên Taobao/Tmall:**
1. Truy cập trang đơn hàng Taobao/Tmall
2. Bấm icon extension → "Trích xuất"
3. Dữ liệu sẽ được hiển thị trong popup
4. Có thể copy, tùy chỉnh cột, lấy mã vận đơn

### **Trên Pinduoduo:**
1. Truy cập trang đơn hàng Pinduoduo
2. Bấm icon extension → "Trích xuất"
3. Dữ liệu sẽ được tải từ API
4. Có thể tải thêm 50 sản phẩm tiếp theo

### **Trên NhapHangChina:**
1. Truy cập trang NhapHangChina
2. Bấm icon extension → "Kiểm tra trạng thái"
3. Sẽ kiểm tra trạng thái các đơn hàng đã có

## 🔧 Tính năng chính

### **✅ Đã hoàn thành:**
- ✅ Trích xuất dữ liệu từ Taobao/Tmall
- ✅ Trích xuất dữ liệu từ Pinduoduo (API)
- ✅ Kiểm tra trạng thái NhapHangChina
- ✅ Copy dữ liệu vào clipboard
- ✅ Tùy chỉnh cột hiển thị
- ✅ Lấy mã vận đơn tự động
- ✅ Dịch tên sản phẩm (Gemini API)
- ✅ Cập nhật real-time
- ✅ Lưu trữ dữ liệu persistent

### **🎨 Giao diện:**
- 🎯 Platform detection tự động
- 📦 Nút theo platform (Taobao/Pinduoduo/NhapHangChina)
- 🎨 UI hiện đại và responsive
- 📊 Bảng dữ liệu có thể resize cột
- 🎛️ Tùy chỉnh cột linh hoạt

## 🚨 Lưu ý quan trọng

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

## 🔄 Cập nhật extension

### **Khi có phiên bản mới:**
1. Tải file ZIP mới
2. Giải nén vào thư mục khác
3. Vào `chrome://extensions/`
4. Bấm nút "Update" (mũi tên tròn)
5. Chọn thư mục mới

## 🆘 Xử lý sự cố

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

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra console log (F12 → Console)
2. Chụp ảnh lỗi
3. Mô tả chi tiết vấn đề
4. Liên hệ developer

---

**🎉 Chúc bạn sử dụng extension hiệu quả!** 