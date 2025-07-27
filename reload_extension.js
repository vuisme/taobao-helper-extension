// Script để reload extension
// Chạy trong Chrome DevTools Console trên chrome://extensions/

// Reload extension
chrome.management.reload('your-extension-id');

// Hoặc manual reload:
// 1. Mở chrome://extensions/
// 2. Bật Developer mode
// 3. Click "Reload" button trên extension
// 4. Refresh trang web đang test

console.log('Extension reloaded. Please check console for debug logs.'); 