// Background script for Taobao Order Helper
// Manages persistent data and translation status

console.log('Taobao Order Helper: Background script loaded');

let storedOrders = [];
let translationStatus = {
    isTranslating: false,
    originalOrders: [],
    translatedOrders: [],
    settings: null,
    pendingRequest: null
};
let pddPagingState = { offset: '', anti_content: '', hasMore: true };

// Load data from storage when service worker starts
chrome.storage.local.get(['storedOrders', 'translationStatus'], function(result) {
    if (result.storedOrders) {
        storedOrders = result.storedOrders;
        console.log('Background script: Loaded', storedOrders.length, 'orders from storage');
    }
    if (result.translationStatus) {
        translationStatus = result.translationStatus;
        console.log('Background script: Loaded translation status from storage');
    }
});

// Helper function to save data to storage
function saveToStorage() {
    chrome.storage.local.set({
        storedOrders: storedOrders,
        translationStatus: translationStatus
    }, function() {
        console.log('Background script: Data saved to storage');
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message.action || message.type);
    
    if (message.type === 'fetchPDDOrders') {
        // Step 1: Get PDDAccessToken from cookies
        chrome.cookies.get({
            url: 'https://mobile.yangkeduo.com',
            name: 'PDDAccessToken'
        }, function(cookie) {
            let token = cookie && cookie.value ? cookie.value : '';
            if (!token) {
                console.warn('Background script: PDDAccessToken not found! Pinduoduo API may fail.');
                console.log('Background script: Available cookies for yangkeduo.com:');
                // Debug: List all cookies for yangkeduo.com
                chrome.cookies.getAll({domain: 'yangkeduo.com'}, function(cookies) {
                    console.log('Background script: All yangkeduo.com cookies:', cookies);
                });
            } else {
                console.log('Background script: Got PDDAccessToken:', token.substring(0, 10) + '...');
            }
            
            // Step 2: Add verifyauthtoken header from message headers
            let headers = Object.assign({}, message.headers || {});
            
            // Nếu có token từ cookie, ưu tiên sử dụng
            if (token) {
                headers['verifyauthtoken'] = token;
            }
            // Nếu không có token từ cookie nhưng có trong message headers, sử dụng từ đó
            else if (headers['verifyauthtoken']) {
                console.log('Background script: Using verifyauthtoken from content script');
            }
            
            // Step 3: Fetch with updated headers
            console.log('Background script: Making request to:', message.url);
            console.log('Background script: Request headers:', headers);
            
            fetch(message.url, {
                method: message.method || 'POST',
                headers: headers,
                body: message.body,
                credentials: 'include',
                mode: 'cors',
            })
                .then(res => {
                    console.log('Background script: Response status:', res.status);
                    console.log('Background script: Response headers:', res.headers);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(data => {
                    console.log('Background script: API response received:', data);
                    sendResponse({ success: true, data });
                })
                .catch(err => {
                    console.error('Background script: Fetch error:', err);
                    sendResponse({ success: false, error: err.toString() });
                });
        });
        return true; // keep the message channel open for async response
    }

    if (!message.action) {
        console.log('Background script: No action specified in message');
        sendResponse({ success: false, error: 'No action specified' });
        return;
    }

    switch (message.action) {
        case 'test':
            console.log('Background script: Received test message');
            sendResponse({ success: true, message: 'Background script is working' });
            break;
        case 'saveOrders':
            console.log('Background script: Received saveOrders with', message.orders ? message.orders.length : 0, 'orders');
            if (message.orders && message.orders.length > 0) {
                console.log('Background script: First order structure:', message.orders[0]);
                console.log('Background script: First order title field:', message.orders[0].title);
                console.log('Background script: First order specs field:', message.orders[0].specs);
            }
            storedOrders = message.orders || [];
            // Lưu offset/anti_content/hasMore nếu có
            if (typeof message.offset !== 'undefined') pddPagingState.offset = message.offset;
            if (typeof message.anti_content !== 'undefined') pddPagingState.anti_content = message.anti_content;
            if (typeof message.hasMore !== 'undefined') pddPagingState.hasMore = message.hasMore;
            console.log('Background script: Saved', storedOrders.length, 'orders with paging state:', pddPagingState);
            saveToStorage(); // Save to persistent storage
            sendResponse({ success: true });
            break;
        case 'getOrders':
            console.log('Background script: Received getOrders request');
            sendResponse({
                success: true,
                orders: storedOrders,
                offset: pddPagingState.offset,
                anti_content: pddPagingState.anti_content,
                hasMore: pddPagingState.hasMore,
                translationStatus: translationStatus
            });
            break;
        case 'updatePDDPaging':
            console.log('Background script: Received updatePDDPaging');
            if (typeof message.offset !== 'undefined') pddPagingState.offset = message.offset;
            if (typeof message.anti_content !== 'undefined') pddPagingState.anti_content = message.anti_content;
            if (typeof message.hasMore !== 'undefined') pddPagingState.hasMore = message.hasMore;
            console.log('Background script: Updated paging state:', pddPagingState);
            sendResponse({ success: true });
            break;
        case 'updateTrackingNumber':
            console.log('Background script: Received updateTrackingNumber for orderId:', message.orderId);
            const orderIndex = storedOrders.findIndex(order => order.orderId === message.orderId);
            if (orderIndex !== -1) {
                storedOrders[orderIndex].trackingNumber = message.trackingNumber;
                saveToStorage();
                console.log('Background script: Updated tracking number for order:', message.orderId);
                
                // Notify any open popup about the update
                chrome.runtime.sendMessage({
                    action: 'trackingNumberUpdated',
                    orderId: message.orderId,
                    trackingNumber: message.trackingNumber
                }).catch(err => {
                    console.log('Background script: No popup to notify about tracking update');
                });
                
                sendResponse({ success: true });
            } else {
                console.log('Background script: Order not found for tracking update:', message.orderId);
                sendResponse({ success: false, error: 'Order not found' });
            }
            break;
        case 'finishTranslation':
            console.log('Background script: Received finishTranslation');
            if (translationStatus.isTranslating) {
                translationStatus.isTranslating = false;
                translationStatus.originalOrders = message.orders || storedOrders;
                translationStatus.translatedOrders = message.orders || storedOrders;
                saveToStorage();
                console.log('Background script: Translation finished, saved', message.orders ? message.orders.length : 0, 'orders');
            }
            sendResponse({ success: true });
            break;
        case 'clearOrders':
            console.log('Background script: Received clearOrders');
            storedOrders = [];
            translationStatus = {
                isTranslating: false,
                originalOrders: [],
                translatedOrders: [],
                settings: null,
                pendingRequest: null
            };
            pddPagingState = { offset: '', anti_content: '', hasMore: true };
            saveToStorage();
            console.log('Background script: Cleared all orders and reset state');
            sendResponse({ success: true });
            break;
        case 'checkNhaphangchinaStatus':
            console.log('Background script: Received checkNhaphangchinaStatus for trackingNumber:', message.trackingNumber);
            checkNhaphangchinaStatus(message.trackingNumber, sendResponse);
            return true; // Keep message channel open for async response
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return true; // Giữ message channel mở cho async response
});

// Check nhaphangchina status
async function checkNhaphangchinaStatus(trackingNumber, sendResponse) {
    try {
        console.log('Background script: Checking status for trackingNumber:', trackingNumber);
        console.log('Background script: Making request to nhaphangchina API...');
        
        const requestBody = `shipid=${trackingNumber}`;
        console.log('Background script: Request body:', requestBody);
        
        const response = await fetch("https://muahang.nhaphangchina.vn/ShipOrder/findshiporder", {
            method: "POST",
            headers: {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.9,vi;q=0.8",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                "Referer": "https://muahang.nhaphangchina.vn/ShipOrder"
            },
            body: requestBody
        });
        
        console.log('Background script: API response status:', response.status);
        console.log('Background script: API response headers:', response.headers);
        
        if (response.ok) {
            const responseText = await response.text();
            console.log('Background script: Raw response text:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Background script: Parsed JSON data:', data);
            } catch (parseError) {
                console.error('Background script: Failed to parse JSON:', parseError);
                console.log('Background script: Raw response was not valid JSON');
                sendResponse({
                    success: false,
                    status: 'Lỗi định dạng phản hồi',
                    error: 'Response is not valid JSON'
                });
                return;
            }
            
            if (data && data.Response === "Success") {
                console.log('Background script: Response is Success, parsing data...');
                // Parse HTML data to get latest status
                let latestStatus = 'Đã tìm thấy';
                if (data.data && data.data.includes('Đã kết thúc')) {
                    latestStatus = 'Đã kết thúc';
                } else if (data.data && data.data.includes('Đã giao hàng')) {
                    latestStatus = 'Đã giao hàng';
                } else if (data.data && data.data.includes('Đã về kho VN')) {
                    latestStatus = 'Đã về kho VN';
                } else if (data.data && data.data.includes('Tiếp nhận đơn ký gửi')) {
                    latestStatus = 'Tiếp nhận đơn ký gửi';
                }
                
                console.log('Background script: Order found, latest status:', latestStatus);
                console.log('Background script: Sending success response...');
                sendResponse({
                    success: true,
                    status: latestStatus,
                    data: data.data
                });
                console.log('Background script: Success response sent');
            } else if (data && data.Response === "Error") {
                console.log('Background script: Response is Error');
                console.log('Background script: Order not found (not added to nhaphangchina)');
                sendResponse({
                    success: false,
                    status: 'Chưa thêm vào nhaphangchina'
                });
            } else {
                console.log('Background script: Unknown response format, data:', data);
                console.log('Background script: Unknown response format');
                sendResponse({
                    success: false,
                    status: 'Không tìm thấy'
                });
            }
        } else {
            console.log('Background script: API error, status:', response.status);
            const errorText = await response.text();
            console.log('Background script: Error response text:', errorText);
            sendResponse({
                success: false,
                status: 'Lỗi kết nối',
                error: `HTTP ${response.status}: ${errorText}`
            });
        }
    } catch (error) {
        console.error('Background script: Error checking nhaphangchina status:', error);
        console.error('Background script: Error details:', error.message, error.stack);
        sendResponse({
            success: false,
            status: 'Lỗi kết nối',
            error: error.message
        });
    }
}

 