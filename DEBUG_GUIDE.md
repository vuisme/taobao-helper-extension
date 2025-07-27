# Debug Guide - Taobao Order Helper Extension

## Vấn đề hiện tại
Lỗi "Could not establish connection. Receiving end does not exist."

## Các bước debug:

### 1. Reload Extension
1. Mở `chrome://extensions/`
2. Bật "Developer mode"
3. Tìm extension "Taobao Order Helper"
4. Click "Reload" button
5. Refresh trang web đang test

### 2. Kiểm tra Console Logs
Mở Developer Tools (F12) và xem Console:

**Background Script:**
- Cần thấy: "Taobao Order Helper: Background script loaded"

**Content Script:**
- Cần thấy: "Taobao Order Helper: Content script loaded on [hostname]"
- Cần thấy: "Taobao Order Helper: Testing background connection..."
- Cần thấy: "Taobao Order Helper: Background connection successful"

### 3. Test trên Pinduoduo
1. Vào `https://mobile.yangkeduo.com/orders.html`
2. Mở Developer Tools (F12)
3. Xem Console logs
4. Kiểm tra platform detection: "Order Helper: Detected platform: pinduoduo"

### 4. Kiểm tra Manifest
- Content scripts matches có `https://*.yangkeduo.com/*` và `https://mobile.yangkeduo.com/*`
- Background script path đúng: `js/background.js`
- Host permissions có đầy đủ

### 5. Nếu vẫn lỗi
1. Kiểm tra extension ID trong `chrome://extensions/`
2. Thử disable/enable extension
3. Thử restart Chrome
4. Kiểm tra có extension nào khác conflict không

## Expected Flow
1. Content script load → Platform detection → Pinduoduo detected
2. Background script load → Ready to receive messages
3. Content script test connection → Success
4. User click extract → fetchPDDOrders() called
5. API call via background script → Success 