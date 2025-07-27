// Biến lưu trữ dữ liệu sản phẩm đã trích xuất
let extractedProducts = [];
let isProcessing = false;
let lastExtractionTime = 0;
const EXTRACTION_COOLDOWN = 2000; // 2 giây

// Test background connection
chrome.runtime.sendMessage({ action: 'ping' }, function(response) {
    if (chrome.runtime.lastError) {
        console.error('Taobao Order Helper: Background connection failed:', chrome.runtime.lastError);
    }
});

// Platform detection
function getCurrentPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('taobao.com') || hostname.includes('tmall.com')) {
        return 'taobao';
    }
    if (hostname.includes('yangkeduo.com') || hostname.includes('pinduoduo.com')) {
        return 'pinduoduo';
    }
    if (hostname.includes('nhaphangchina.vn')) {
        return 'nhaphangchina';
    }
    return 'unknown';
}

// Hàm helper để tìm kiếm bằng XPath
function getElementByXPath(xpath, context = document) {
    try {
        const result = document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue;
    } catch (e) {
        console.warn('Taobao Order Helper: XPath error:', e);
        return null;
    }
}

function getElementsByXPath(xpath, context = document) {
    try {
        const result = document.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const elements = [];
        for (let i = 0; i < result.snapshotLength; i++) {
            elements.push(result.snapshotItem(i));
        }
        return elements;
    } catch (e) {
        console.warn('Taobao Order Helper: XPath error:', e);
        return [];
    }
}

// Helper function to find elements containing specific text
function findElementByText(container, text) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.includes(text)) {
            return node.parentElement;
        }
    }
    return null;
}

// Hàm tạo ID duy nhất cho sản phẩm
function generateProductId(orderId, productElement, index) {
    // Tạo hash từ nội dung của element để đảm bảo tính duy nhất
    const elementContent = productElement.textContent || '';
    const elementHash = elementContent.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    return `${orderId}_${index}_${Math.abs(elementHash)}`;
}

// Hàm chính để trích xuất dữ liệu đơn hàng từ trang
function extractOrderData() {
    const now = Date.now();
    
    // Kiểm tra cooldown
    if (now - lastExtractionTime < EXTRACTION_COOLDOWN) {

        return extractedProducts;
    }
    
    if (isProcessing) {

        return extractedProducts;
    }
    
    isProcessing = true;
    lastExtractionTime = now;

    
    // Xóa dữ liệu cũ
    extractedProducts = [];
    
    try {
        const platform = getCurrentPlatform();
    
        
        if (platform === 'taobao') {
            // Kiểm tra xem đang ở trang nào để sử dụng phương pháp trích xuất phù hợp
            if (window.location.href.includes('bought.htm') || 
                window.location.href.includes('buyerOrderList.htm') || 
                window.location.href.includes('trade/itemlist')) {
                
                // Trang danh sách đơn hàng
                collectFromOrderList();
            } else if (window.location.href.includes('detail.htm') || 
                       window.location.href.includes('trade-detail')) {
                
                // Trang chi tiết đơn hàng
                collectFromOrderDetail();
            } else {
    
            }
        } else if (platform === 'pinduoduo') {
            // Gọi API để lấy danh sách đơn hàng Pinduoduo
            // For Pinduoduo, we need to handle this differently since it's async
            // Don't call fetchPDDOrders here - it will be called from the message handler
        } else if (platform === 'nhaphangchina') {
            // NhapHangChina platform - không trích xuất dữ liệu, chỉ hỗ trợ kiểm tra trạng thái
            console.log('Taobao Order Helper: NhapHangChina platform detected - status check only');
        } else {
            // Unsupported platform
        }
    } catch (error) {
        console.error('Taobao Order Helper: Error in extractOrderData:', error);
    } finally {
        isProcessing = false;
    }
    
    // Send extraction completed message if products were found
    if (extractedProducts.length > 0) {
        chrome.runtime.sendMessage({
            action: 'extractionCompleted',
            count: extractedProducts.length
        });
    }
    
    return extractedProducts;
}

// Hàm trích xuất dữ liệu từ trang danh sách đơn hàng
function collectFromOrderList() {
    
    // Sử dụng XPath để tìm các đơn hàng chính xác hơn
    const orderXPaths = [
        "//div[contains(@data-reactid, 'order-')]",
        "//tr[contains(@data-reactid, 'order-')]",
        "//div[contains(@class, 'order-item')]",
        "//div[contains(@class, 'js-order-container')]",
        "//tr[contains(@class, 'order-item')]",
        "//div[@data-id]",
        "//table//tr[not(contains(@class, 'thead')) and not(contains(@class, 'header'))]"
    ];
    
    let orderElements = [];
    
    for (const xpath of orderXPaths) {
        const elements = getElementsByXPath(xpath);
        if (elements.length > 0) {
            orderElements = elements;
            break;
        }
    }
    
    // Nếu không tìm thấy đơn hàng nào, return
    if (orderElements.length === 0) {
        return;
    }
    
    // Duyệt qua từng đơn hàng
    for (const orderElement of orderElements) {
        // Lấy ID đơn hàng
        let orderId = orderElement.getAttribute('data-id');
        
        // Nếu không tìm thấy data-id, thử tìm từ data-reactid
        if (!orderId) {
            const reactId = orderElement.getAttribute('data-reactid') || '';
            const orderMatch = reactId.match(/order-(\d+)/);
            if (orderMatch && orderMatch[1]) {
                orderId = orderMatch[1];
            }
        }
        
        // Nếu vẫn không tìm thấy, thử tìm từ các liên kết trong đơn hàng
        if (!orderId) {
            const orderLinks = orderElement.querySelectorAll('a[href*="bizOrderId="], a[href*="trade_id="]');
            for (const link of orderLinks) {
                const href = link.getAttribute('href') || '';
                const orderMatch = href.match(/bizOrderId=(\d+)/) || href.match(/trade_id=(\d+)/);
                if (orderMatch && orderMatch[1]) {
                    orderId = orderMatch[1];
                    break;
                }
            }
        }
        
        // Nếu vẫn không tìm thấy, thử tìm từ text
        if (!orderId) {
            const allText = orderElement.textContent;
            const orderMatch = allText.match(/\d{16,}/);
            if (orderMatch) {
                orderId = orderMatch[0];
            }
        }
        
        // Nếu vẫn không tìm thấy, sử dụng timestamp hiện tại làm ID tạm thời
        if (!orderId) {
            orderId = 'unknown_' + Date.now();
        }
        

        
        // Tìm các sản phẩm trong đơn hàng - sử dụng XPath cụ thể hơn
        let productsFound = false;
        
        // XPath để tìm sản phẩm - cập nhật để phù hợp với cấu trúc HTML thực tế
        const productXPaths = [
            ".//tr[contains(@data-reactid, '$0') or contains(@data-reactid, '$1')]",
            ".//div[contains(@class, 'suborder-mod__item')]",
            ".//tr[contains(@class, 'item')]",
            ".//div[contains(@class, 'production-mod__production')]",
            ".//div[contains(@class, 'item-content')]",
            ".//div[contains(@class, 'order-content')]",
            ".//div[contains(@class, 'suborder-content')]"
        ];
        
        for (const xpath of productXPaths) {
            const productElements = getElementsByXPath(xpath, orderElement);
            if (productElements.length > 0) {
                productsFound = true;
        
                
                for (let i = 0; i < productElements.length; i++) {
                    const element = productElements[i];
                    const product = extractProductData(element, orderElement);
                    if (product && product.title && product.title !== 'Unknown Title') {
                        // Tạo ID duy nhất cho sản phẩm
                        product.productId = generateProductId(product.orderId, element, i);
                        
                        // Kiểm tra xem sản phẩm đã được thêm chưa để tránh lặp
                        const existingProduct = extractedProducts.find(p => 
                            p.productId === product.productId ||
                            (p.title === product.title && p.orderId === product.orderId && p.specs === product.specs)
                        );
                        
                        if (!existingProduct) {
        
                            // Thêm nút "Lấy mã vận đơn" cho sản phẩm
                            addTrackingButton(element, product);
                            extractedProducts.push(product);
                        } else {
    
                        }
                    }
                }
                break; // Chỉ xử lý một loại XPath thành công
            }
        }
        
        // Nếu không tìm thấy bằng XPath, thử tìm theo thẻ a chứa href đến trang sản phẩm
        if (!productsFound) {
            const productLinks = orderElement.querySelectorAll('a[href*="item.htm"], a[href*="item.taobao.com"]');
            if (productLinks.length > 0) {
        
                
                for (let i = 0; i < productLinks.length; i++) {
                    const link = productLinks[i];
                    // Tìm phần tử cha chứa thông tin sản phẩm
                    const productItem = link.closest('tr') || link.closest('div');
                    if (productItem) {
                        const product = extractProductData(productItem, orderElement);
                        if (product && product.title && product.title !== 'Unknown Title') {
                            // Tạo ID duy nhất cho sản phẩm
                            product.productId = generateProductId(product.orderId, productItem, i);
                            
                            // Kiểm tra xem sản phẩm đã được thêm chưa để tránh lặp
                            const existingProduct = extractedProducts.find(p => 
                                p.productId === product.productId ||
                                (p.title === product.title && p.orderId === product.orderId && p.specs === product.specs)
                            );
                            
                            if (!existingProduct) {
        
                                // Thêm nút "Lấy mã vận đơn" cho sản phẩm
                                addTrackingButton(productItem, product);
                                extractedProducts.push(product);
                            } else {
        
                            }
                        }
                    }
                }
            }
        }
    }
}

// Hàm thêm nút "Lấy mã vận đơn" cho sản phẩm
function addTrackingButton(productElement, product) {
    try {
        // Tìm các liên kết logistics bằng cách khác
        const allLinks = productElement.querySelectorAll('a');
        const logisticsLinks = Array.from(allLinks).filter(link => {
            const href = link.getAttribute('href') || '';
            const text = link.textContent || '';
            return href.includes('logistics') || 
                   href.includes('wuliu') || 
                   text.includes('查看物流') ||
                   text.includes('物流') ||
                   text.includes('tracking');
        });
        
        if (logisticsLinks.length === 0) return;
        
        // Tạo nút
        const getTrackingButton = document.createElement('button');
        getTrackingButton.textContent = 'Lấy mã vận đơn';
        getTrackingButton.className = 'taobao-order-helper-get-tracking-btn';
        getTrackingButton.style.cssText = 'margin-left: 5px; padding: 2px 8px; background: #ff6a00; color: white; border: none; border-radius: 3px; cursor: pointer;';
        
        // Gán sự kiện click
        getTrackingButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Lấy mã vận đơn từ API
            if (product.orderId) {
                getTrackingButton.textContent = 'Đang lấy...';
                getTrackingButton.disabled = true;
                
                fetchTrackingNumberFromAPI(product.orderId, function(trackingNumber) {
                    if (trackingNumber) {
                        // Cập nhật mã vận đơn cho sản phẩm
                        product.trackingNumber = trackingNumber;
                        
                        // Hiển thị thông báo
                        showTrackingNumberNotification(trackingNumber);
                        
                        // Cập nhật nút
                        getTrackingButton.textContent = 'Đã lấy: ' + trackingNumber;
                        getTrackingButton.disabled = true;
                        
                        // Gửi thông tin đến background script để cập nhật popup
                        chrome.runtime.sendMessage({
                            action: 'updateTrackingNumber',
                            orderId: product.orderId,
                            trackingNumber: trackingNumber
                        });
                    } else {
                        getTrackingButton.textContent = 'Không tìm thấy';
                        setTimeout(() => {
                            getTrackingButton.textContent = 'Lấy mã vận đơn';
                            getTrackingButton.disabled = false;
                        }, 2000);
                    }
                });
            }
        });
        
        // Thêm nút vào sau liên kết đầu tiên
        logisticsLinks[0].parentNode.insertBefore(getTrackingButton, logisticsLinks[0].nextSibling);
    } catch (buttonError) {
        console.warn('Taobao Order Helper: Error adding tracking button:', buttonError);
    }
}

// Hàm trích xuất dữ liệu từ trang chi tiết đơn hàng
function collectFromOrderDetail() {
    
    // Tìm ID đơn hàng trên trang chi tiết bằng XPath
    const orderIdXPaths = [
        "//div[contains(@class, 'order-num')]",
        "//div[contains(@class, 'orderNo')]",
        "//div[contains(@class, 'order-id')]",
        "//span[contains(@class, 'order-num')]",
        "//span[contains(@class, 'orderNo')]"
    ];
    
    let orderId = '';
    
    for (const xpath of orderIdXPaths) {
        const element = getElementByXPath(xpath);
        if (element) {
            const text = element.textContent;
            const match = text.match(/\d{16,}/);
            if (match) {
                orderId = match[0];
                break;
            }
        }
    }
    
    if (!orderId) {
        // Thử tìm từ URL
        const urlMatch = window.location.href.match(/bizOrderId=(\d{16,})/);
        if (urlMatch) {
            orderId = urlMatch[1];
        }
    }
    
    
    
    if (!orderId) {
        orderId = 'unknown_' + Date.now();
    }
    
    // Tìm các sản phẩm trong đơn hàng bằng XPath
    const productXPaths = [
        "//div[contains(@class, 'item-content')]",
        "//div[contains(@class, 'order-content')]",
        "//div[contains(@class, 'product-item')]",
        "//div[contains(@class, 'item-basic')]",
        "//div[contains(@class, 'order-detail')]",
        "//div[contains(@class, 'product')]",
        "//div[contains(@class, 'item')]"
    ];
    
    let productItems = [];
    
    for (const xpath of productXPaths) {
        const elements = getElementsByXPath(xpath);
        if (elements.length > 0) {
            productItems = elements;
            break;
        }
    }
    
    
    
    // Tạo phần tử đơn hàng ảo để truyền vào hàm trích xuất sản phẩm
    const orderElement = document.createElement('div');
    orderElement.setAttribute('data-id', orderId);
    
    // Duyệt qua từng sản phẩm
    for (let i = 0; i < productItems.length; i++) {
        const productItem = productItems[i];
        const product = extractProductData(productItem, orderElement);
        if (product && product.title && product.title !== 'Unknown Title') {
            // Tạo ID duy nhất cho sản phẩm
            product.productId = generateProductId(product.orderId, productItem, i);
            
            // Kiểm tra xem sản phẩm đã được thêm chưa để tránh lặp
            const existingProduct = extractedProducts.find(p => 
                p.productId === product.productId ||
                (p.title === product.title && p.orderId === product.orderId && p.specs === product.specs)
            );
            
            if (!existingProduct) {
                
                // Thử lấy mã vận đơn cho sản phẩm
                fetchTrackingNumberFromAPI(orderId, function(trackingNumber) {
                    if (trackingNumber) {
                        product.trackingNumber = trackingNumber;
                        
                        // Hiển thị thông báo
                        showTrackingNumberNotification(trackingNumber);
                    }
                });
                
                extractedProducts.push(product);
            } else {
                
            }
        }
    }
}

// Hàm trích xuất dữ liệu từ một sản phẩm
function extractProductData(productItem, orderElement) {
    const product = {
        image: '',
        title: 'Unknown Title',
        quantity: '1',
        specs: '',
        orderId: '',
        status: '',
        trackingNumber: '',
        productId: '' // Sẽ được set sau khi tạo
    };
    
    try {

        
        // Trích xuất hình ảnh sản phẩm bằng XPath
        const imageXPaths = [
            ".//img[contains(@src, 'imgextra')]",
            ".//img[contains(@src, 'taobao')]",
            ".//a[contains(@class, 'production-mod__pic')]//img",
            ".//img"
        ];
        
        for (const xpath of imageXPaths) {
            const imageElement = getElementByXPath(xpath, productItem);
            if (imageElement && imageElement.src) {
                product.image = imageElement.src.replace('_80x80.jpg', '');
                break;
            }
        }
        
        // Trích xuất tên sản phẩm bằng XPath
        const titleXPaths = [
            ".//a[contains(@href, 'item.htm')]//span[contains(@style, 'line-height')]",
            ".//a[contains(@href, 'item.taobao.com')]//span[contains(@style, 'line-height')]",
            ".//a[contains(@href, 'item.htm')]",
            ".//a[contains(@href, 'item.taobao.com')]",
            ".//p[string-length(text()) > 10 and not(contains(text(), '￥')) and not(contains(text(), '交易快照'))]",
            ".//span[string-length(text()) > 10 and not(contains(text(), '￥')) and not(contains(text(), '交易快照'))]",
            ".//div[string-length(text()) > 10 and not(contains(text(), '￥')) and not(contains(text(), '交易快照'))]"
        ];
        
        for (const xpath of titleXPaths) {
            const titleElement = getElementByXPath(xpath, productItem);
            if (titleElement && titleElement.textContent) {
                let title = titleElement.textContent.trim();
                // Loại bỏ text "交易快照" nếu có
                title = title.replace('[交易快照]', '').trim();
                if (title.length > 5) {
                    product.title = title;
                    break;
                }
            }
        }
        
        // Trích xuất số lượng bằng XPath
        const quantityXPaths = [
            ".//td[3]//p",
            ".//div[contains(@class, 'quantity')]//p",
            ".//p[matches(text(), '^\\s*\\d+\\s*$') and not(.//*)]",
            ".//span[matches(text(), '^\\s*\\d+\\s*$') and not(.//*)]",
            ".//div[matches(text(), '^\\s*\\d+\\s*$') and not(.//*)]"
        ];
        
        for (const xpath of quantityXPaths) {
            const quantityElement = getElementByXPath(xpath, productItem);
            if (quantityElement && quantityElement.textContent) {
                const quantity = quantityElement.textContent.trim();
                if (/^\s*\d+\s*$/.test(quantity)) {
                    product.quantity = quantity;
                    break;
                }
            }
        }
        
        // Trích xuất thông số sản phẩm (variables) bằng XPath - cải thiện để phù hợp với HTML thực tế
        const specs = [];
        const specXPaths = [
            ".//span[contains(@class, 'sku-item')]",
            ".//span[contains(@class, 'production-mod__sku-item')]",
            ".//p[contains(text(), ':') or contains(text(), '：')]",
            ".//span[contains(text(), ':') or contains(text(), '：')]",
            ".//div[contains(text(), ':') or contains(text(), '：')]"
        ];
        
        for (const xpath of specXPaths) {
            const specElements = getElementsByXPath(xpath, productItem);
            for (const specElem of specElements) {
                if (specElem.textContent && 
                    !specElem.textContent.includes('￥') &&
                    !specElem.textContent.includes('交易快照') &&
                    specElem.textContent.trim().length > 0) {
                    const specText = specElem.textContent.trim();
                    // Chỉ thêm nếu chưa có trong danh sách
                    if (!specs.includes(specText)) {
                        specs.push(specText);
                    }
                }
            }
            if (specs.length > 0) break;
        }
        
        product.specs = specs.join('; ');
        
        // Trích xuất mã đơn hàng
        product.orderId = '';
        
        // Cách 1: Từ thuộc tính data-id của phần tử đơn hàng
        if (orderElement.getAttribute('data-id')) {
            product.orderId = orderElement.getAttribute('data-id');
        }
        
        // Cách 2: Từ data-reactid
        if (!product.orderId) {
            const reactId = orderElement.getAttribute('data-reactid') || '';
            const orderMatch = reactId.match(/order-(\d+)/);
            if (orderMatch && orderMatch[1]) {
                product.orderId = orderMatch[1];
            }
        }
        
        // Cách 3: Từ các liên kết trong đơn hàng
        if (!product.orderId) {
            const orderLinks = orderElement.querySelectorAll('a[href*="bizOrderId="], a[href*="trade_id="]');
            for (const link of orderLinks) {
                const href = link.getAttribute('href') || '';
                const orderMatch = href.match(/bizOrderId=(\d+)/) || href.match(/trade_id=(\d+)/);
                if (orderMatch && orderMatch[1]) {
                    product.orderId = orderMatch[1];
                    break;
                }
            }
        }
        
        // Cách 4: Từ text
        if (!product.orderId) {
            const allText = orderElement.textContent;
            const orderMatch = allText.match(/\d{16,}/);
            if (orderMatch) {
                product.orderId = orderMatch[0];
            }
        }
        
        // Trích xuất trạng thái đơn hàng - cải thiện logic
        let statusFound = false;
        
        // Thử nhiều cách khác nhau để tìm trạng thái
        const statusSelectors = [
            // CSS selectors
            '.status',
            '.order-status',
            '.orderStatus',
            '.tb-status',
            '.tbStatus',
            '[class*="status"]',
            '[class*="Status"]',
            
            // Common Taobao status patterns
            '.tb-order-status',
            '.order-status-text',
            '.status-text'
        ];
        
        // Chinese status keywords to search for
        const statusKeywords = ['待付款', '待发货', '待收货', '已完成', '已发货', '已签收'];
        
        // Thử CSS selectors trước
        for (const selector of statusSelectors) {
            try {
                const statusElement = productItem.querySelector(selector);
                if (statusElement && statusElement.textContent) {
                    const status = statusElement.textContent.trim();
                    if (status.length > 0 && status !== 'undefined' && status !== 'null') {
                        product.status = status;
                        statusFound = true;
                        console.log('Taobao Order Helper: Found status via CSS selector:', selector, status);
                        break;
                    }
                }
            } catch (e) {
                // Ignore invalid selectors
            }
        }
        
        // Nếu không tìm thấy bằng CSS, thử tìm theo text content
        if (!statusFound) {
            for (const keyword of statusKeywords) {
                const statusElement = findElementByText(productItem, keyword);
                if (statusElement && statusElement.textContent) {
                    const status = statusElement.textContent.trim();
                    if (status.length > 0 && status !== 'undefined' && status !== 'null') {
                        product.status = status;
                        statusFound = true;
                        console.log('Taobao Order Helper: Found status via text search:', keyword, status);
                        break;
                    }
                }
            }
        }
        
        // Nếu không tìm thấy bằng CSS, thử XPath
        if (!statusFound) {
            const statusXPaths = [
                ".//span[contains(@class, 'status')]",
                ".//div[contains(@class, 'status')]",
                ".//td[contains(@class, 'status')]",
                ".//span[contains(text(), '待付款') or contains(text(), '待发货') or contains(text(), '待收货') or contains(text(), '已完成')]",
                ".//div[contains(text(), '待付款') or contains(text(), '待发货') or contains(text(), '待收货') or contains(text(), '已完成')]",
                ".//*[contains(text(), '待付款') or contains(text(), '待发货') or contains(text(), '待收货') or contains(text(), '已完成')]"
            ];
            
            for (const xpath of statusXPaths) {
                const statusElement = getElementByXPath(xpath, productItem);
                if (statusElement && statusElement.textContent) {
                    const status = statusElement.textContent.trim();
                    if (status.length > 0 && status !== 'undefined' && status !== 'null') {
                        product.status = status;
                        statusFound = true;
                        console.log('Taobao Order Helper: Found status via XPath:', xpath, status);
                        break;
                    }
                }
            }
        }
        
        // Nếu vẫn không tìm thấy, thử tìm trong toàn bộ order element
        if (!statusFound) {
            const orderStatusSelectors = [
                '.tb-order-status',
                '.order-status',
                '.status',
                '[class*="status"]'
            ];
            
            for (const selector of orderStatusSelectors) {
                try {
                    const statusElement = orderElement.querySelector(selector);
                    if (statusElement && statusElement.textContent) {
                        const status = statusElement.textContent.trim();
                        if (status.length > 0 && status !== 'undefined' && status !== 'null') {
                            product.status = status;
                            statusFound = true;
                            console.log('Taobao Order Helper: Found status in order element:', selector, status);
                            break;
                        }
                    }
                } catch (e) {
                    // Ignore invalid selectors
                }
            }
            
            // Nếu vẫn không tìm thấy, thử tìm theo text trong order element
            if (!statusFound) {
                for (const keyword of statusKeywords) {
                    const statusElement = findElementByText(orderElement, keyword);
                    if (statusElement && statusElement.textContent) {
                        const status = statusElement.textContent.trim();
                        if (status.length > 0 && status !== 'undefined' && status !== 'null') {
                            product.status = status;
                            statusFound = true;
                            console.log('Taobao Order Helper: Found status in order element via text:', keyword, status);
                            break;
                        }
                    }
                }
            }
        }
        
        // Nếu vẫn không tìm thấy, đặt trạng thái mặc định
        if (!statusFound) {
            product.status = 'Đang xử lý';
            console.log('Taobao Order Helper: No status found, using default');
        }
        
        // Mặc định mã vận đơn là rỗng, sẽ được cập nhật sau
        product.trackingNumber = '';
    } catch (error) {
        console.error('Taobao Order Helper: Error extracting product data:', error);
    }
    
    return product;
}

// Hàm trích xuất dữ liệu từ Pinduoduo
// Helper function to process Pinduoduo orders data
function processPDDOrders(data) {
  try {

    if (!data || !data.orders) {

      return;
    }
    const orders = data.orders;
    // Clear global array first
    extractedProducts = [];
    if (orders.length > 0) {
      // Log cấu trúc order đầu tiên để debug

    }
    orders.forEach((order, orderIndex) => {
      // Ưu tiên order_goods
      const goodsList = order.order_goods || order.goods || order.item_list || order.goods_list || order.items;
      if (goodsList && Array.isArray(goodsList)) {
        goodsList.forEach((good, goodIndex) => {
          const product = {
            orderId: order.order_sn || order.orderSN || order.group_order_id || `pdd_${orderIndex}`,
            productId: `pdd_${order.order_sn || order.orderSN || order.group_order_id || orderIndex}_${goodIndex}`,
            title: good.goods_name || good.goodsName || good.product_name || 'Unknown Product',
            specs: good.spec || good.specs || good.sku || '',
            quantity: good.goods_number || good.quantity || good.count || 1,
            price: good.goods_price || good.price || 0,
            image: good.thumb_url || '',
            status: order.order_status_desc || order.status || 'Unknown',
            trackingNumber: order.tracking_number || order.trackingNumber || '',
            platform: 'pinduoduo'
          };
          extractedProducts.push(product);
        });
      } else {
        // Nếu không có order_goods, log ra để debug

      }
    });

    if (extractedProducts.length > 0) {
      // Gửi dữ liệu về popup, kèm offset và anti_content

      chrome.runtime.sendMessage({
        action: 'saveOrders',
        orders: extractedProducts,
        offset: data.offset || '',
        anti_content: data.anti_content || '',
        hasMore: (data.orders.length === 50 && !!data.offset)
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Error sending to background:', chrome.runtime.lastError);
        } else {
          // Notify popup to update immediately
          chrome.runtime.sendMessage({
            action: 'ordersUpdated',
            count: extractedProducts.length
          });
        }
      });
    }
  } catch (error) {
    console.error('Error processing PDD orders:', error);
  }
}

function getPDDDynamicValues() {
  // Lấy pdduid từ pdd_user_id trong cookie
  let pdduid = (document.cookie.match(/pdd_user_id=(\d+)/) || [])[1]
    || localStorage.pdduid 
    || (document.cookie.match(/pdduid=(\d+)/) || [])[1]
    || (window._$ && window._$.pdduid)
    || (window.pdduid);

  // Lấy anti_content từ window hoặc cookie (có thể không cần)
  let anti_content = window.anti_content 
    || (document.cookie.match(/anti_content=([^;]+)/) || [])[1] 
    || '';

  // Lấy offset nếu có (hoặc để rỗng)
  let offset = '';



  // Kiểm tra các nguồn khác có thể chứa token

  
  // Thử tìm token trong localStorage
  const possibleTokenKeys = ['PDDAccessToken', 'access_token', 'token', 'auth_token'];
  for (const key of possibleTokenKeys) {
    if (localStorage[key]) {
      // Đã tìm thấy token, không cần log
    }
  }

  return { pdduid, anti_content, offset };
}

function fetchPDDOrders() {
  const { pdduid, anti_content, offset } = getPDDDynamicValues();
  if (!pdduid) {
    console.error('Không lấy được pdduid');
    return;
  }

  const url = `https://mobile.yangkeduo.com/proxy/api/api/aristotle/order_list_v3?pdduid=${pdduid}`;
  const headers = {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json;charset=UTF-8",
    // Không cần verifyauthtoken header - sẽ được gửi tự động qua cookies
  };

  // Thêm verifyauthtoken từ localStorage nếu có
  const verifyAuthToken = localStorage.getItem('VerifyAuthToken');
  if (verifyAuthToken) {
    headers['verifyauthtoken'] = verifyAuthToken;
    // Không cần log
  }

  const body = JSON.stringify({
    type: "all",
    page: 1,
    origin_host_name: "mobile.yangkeduo.com",
    scene: "order_list_h5",
    page_from: 0,
    pay_front_supports: [],
    anti_content: anti_content,
    size: 50,
    offset: offset,
  });

  // Log request for debugging
  // Đã bỏ log

  chrome.runtime.sendMessage({
    type: 'fetchPDDOrders',
    url,
    method: 'POST',
    headers,
    body,
  }, (response) => {
    if (response && response.success) {
      // Xử lý response.data (JSON đơn hàng)
      processPDDOrders(response.data);
    } else {
      console.error('Fetch error:', response ? response.error : 'No response received');
      // Hiển thị thông báo lỗi chi tiết hơn
      if (response && response.error) {
        if (response.error.includes('HTTP 401')) {
          console.error('Authentication failed - please login to Pinduoduo again');
        } else if (response.error.includes('HTTP 403')) {
          console.error('Access forbidden - check if you have permission to access orders');
        } else if (response.error.includes('HTTP 404')) {
          console.error('API endpoint not found - Pinduoduo may have changed their API');
        } else if (response.error.includes('HTTP 400')) {
          console.error('Bad request (400) - Có thể thiếu hoặc sai anti_content, hoặc body request không hợp lệ.');
        } else {
          console.error('API request failed:', response.error);
        }
      }
    }
  });
}

// Hàm lấy 1 trang đơn hàng Pinduoduo (phân trang)
function fetchPDDOrdersPage({ offset = '', anti_content = '', page = 1 }) {
    return new Promise((resolve, reject) => {
        const { pdduid } = getPDDDynamicValues();
        const verifyAuthToken = localStorage.getItem('VerifyAuthToken');
        const url = `https://mobile.yangkeduo.com/proxy/api/api/aristotle/order_list_v3?pdduid=${pdduid}`;
        const headers = {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8"
        };
        if (verifyAuthToken) headers['verifyauthtoken'] = verifyAuthToken;
        
        // Đảm bảo anti_content luôn có giá trị, không được undefined
        const safeAntiContent = anti_content || window.anti_content || '';
        
        const body = JSON.stringify({
            type: "all",
            page,
            origin_host_name: "mobile.yangkeduo.com",
            scene: "order_list_h5",
            page_from: 0,
            pay_front_supports: [],
            anti_content: safeAntiContent,
            size: 50,
            offset: offset,
        });
        
        chrome.runtime.sendMessage({
            type: 'fetchPDDOrders', url, method: 'POST', headers, body
        }, (response) => {
            if (response && response.success && response.data && Array.isArray(response.data.orders)) {
                resolve({
                    success: true,
                    orders: response.data.orders,
                    offset: response.data.offset || '',
                    anti_content: response.data.anti_content || safeAntiContent,
                    page,
                    hasMore: (response.data.orders.length === 50 && !!response.data.offset)
                });
            } else {
                resolve({
                    success: true,
                    orders: [],
                    offset: '',
                    anti_content: safeAntiContent,
                    page,
                    hasMore: false
                });
            }
        });
    });
}

// Hàm lấy tất cả mã vận đơn
function getAllTrackingNumbers(orders, callback) {
    console.log('Taobao Order Helper: Getting all tracking numbers for', orders.length, 'orders');
    
    let completedCount = 0;
    let trackingCount = 0;
    const updatedOrders = [...orders];
    
    if (orders.length === 0) {
        callback(updatedOrders, 0);
        return;
    }
    
    orders.forEach((order, index) => {
        if (order.orderId && !order.trackingNumber) {
            fetchTrackingNumberFromAPI(order.orderId, function(trackingNumber) {
                if (trackingNumber) {
                    updatedOrders[index].trackingNumber = trackingNumber;
                    trackingCount++;
                    
                    // Hiển thị thông báo cho từng mã vận đơn
                    showTrackingNumberNotification(trackingNumber);
                }
                
                completedCount++;
                
                // Kiểm tra xem đã hoàn thành tất cả chưa
                if (completedCount === orders.length) {
                    console.log('Taobao Order Helper: Completed getting tracking numbers. Found:', trackingCount);
                    callback(updatedOrders, trackingCount);
                }
            });
        } else {
            completedCount++;
            if (completedCount === orders.length) {
                callback(updatedOrders, trackingCount);
            }
        }
    });
}

// Hàm lấy mã vận đơn từ API Taobao
function fetchTrackingNumberFromAPI(orderId, callback) {
    console.log('Taobao Order Helper: Fetching tracking number for order:', orderId);
    
    // URL API
    const apiUrl = `https://buyertrade.taobao.com/trade/json/transit_step.do?bizOrderId=${orderId}`;
    
    // Gửi yêu cầu
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Taobao Order Helper: API response:', data);
            
            // Trích xuất mã vận đơn từ phản hồi
            if (data && data.isSuccess === "true" && data.expressId) {
                console.log('Taobao Order Helper: Found tracking number:', data.expressId);
                callback(data.expressId);
            } else {
                console.log('Taobao Order Helper: No tracking number found in API response');
                callback('');
            }
        })
        .catch(error => {
            console.error('Taobao Order Helper: Error fetching tracking number:', error);
            callback('');
        });
}

// Hàm hiển thị thông báo mã vận đơn
function showTrackingNumberNotification(trackingNumber) {
    // Tạo phần tử thông báo
    const notification = document.createElement('div');
    notification.className = 'taobao-order-helper-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border: 1px solid #ff6a00;
        border-radius: 4px;
        padding: 15px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 9999;
        max-width: 300px;
    `;
    
    // Nội dung thông báo
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px; color: #ff6a00;">Order Helper</div>
        <div style="margin-bottom: 10px;">Đã tìm thấy mã vận đơn:</div>
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">${trackingNumber}</div>
        <div style="display: flex; justify-content: space-between;">
            <button id="copyTrackingBtn" style="padding: 5px 10px; background: #ff6a00; color: white; border: none; border-radius: 3px; cursor: pointer;">Sao chép</button>
            <button id="closeNotificationBtn" style="padding: 5px 10px; background: #eee; border: none; border-radius: 3px; cursor: pointer;">Đóng</button>
        </div>
    `;
    
    // Thêm vào trang
    document.body.appendChild(notification);
    
    // Xử lý sự kiện nút sao chép
    document.getElementById('copyTrackingBtn').addEventListener('click', function() {
        // Sao chép mã vận đơn vào clipboard
        navigator.clipboard.writeText(trackingNumber)
            .then(() => {
                this.textContent = 'Đã sao chép!';
                setTimeout(() => {
                    this.textContent = 'Sao chép';
                }, 2000);
            })
            .catch(err => {
                console.error('Taobao Order Helper: Error copying to clipboard:', err);
            });
    });
    
    // Xử lý sự kiện nút đóng
    document.getElementById('closeNotificationBtn').addEventListener('click', function() {
        document.body.removeChild(notification);
    });
    
    // Tự động đóng sau 10 giây
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 10000);
}

// Hàm dịch danh sách sản phẩm
async function translateProducts(products, settings, callback) {
    if (!settings.enableTranslation || !settings.geminiApiKey) {
        callback(products);
        return;
    }
    
    console.log('Taobao Order Helper: Translating', products.length, 'products in batch');
    
    const translatedProducts = [...products];
    
    try {
        // Chuẩn bị dữ liệu để gửi batch
        const translationData = products.map((product, index) => ({
            index: index,
            title: product.title && product.title !== 'Unknown Title' ? product.title : null,
            specs: product.specs || null,
            status: product.status || null
        })).filter(item => item.title || item.specs || item.status);
        
        if (translationData.length === 0) {
            console.log('Taobao Order Helper: No data to translate');
            callback(translatedProducts);
            return;
        }
        
        // Gửi batch request đến Gemini
        const batchResult = await translateBatchWithGemini(translationData, settings.geminiApiKey, settings.geminiModel);
        
        // Cập nhật kết quả dịch vào products
        if (batchResult && batchResult.translations) {
            batchResult.translations.forEach(translation => {
                const productIndex = translation.index;
                if (productIndex >= 0 && productIndex < translatedProducts.length) {
                    if (translation.title) {
                        translatedProducts[productIndex].title = translation.title;
                    }
                    if (translation.specs) {
                        translatedProducts[productIndex].specs = translation.specs;
                    }
                    if (translation.status) {
                        translatedProducts[productIndex].status = translation.status;
                    }
                }
            });
        }
        
        console.log('Taobao Order Helper: Batch translation completed');
        
        // Báo cho background script biết đã dịch xong
        chrome.runtime.sendMessage({ 
            action: 'finishTranslation',
            orders: translatedProducts 
        }, function(response) {
            console.log('Taobao Order Helper: Background script notified of translation completion');
        });
    } catch (error) {
        console.error('Taobao Order Helper: Error in batch translation:', error);
        
        // Báo cho background script biết dịch thất bại
        chrome.runtime.sendMessage({ 
            action: 'finishTranslation',
            orders: products 
        }, function(response) {
            console.log('Taobao Order Helper: Background script notified of translation failure');
        });
    }
    
    callback(translatedProducts);
}

// Hàm dịch batch văn bản bằng Gemini API
async function translateBatchWithGemini(translationData, apiKey, model) {
    if (!translationData || translationData.length === 0 || !apiKey) {
        return null;
    }
    
    try {
        // Tạo prompt để gửi tất cả dữ liệu cần dịch
        const prompt = `Dịch các thông tin sản phẩm sau sang tiếng Việt. Trả về JSON với format chính xác như sau:

Dữ liệu cần dịch:
${JSON.stringify(translationData, null, 2)}

Yêu cầu:
1. Dịch tất cả các trường title, specs, status sang tiếng Việt
2. Giữ nguyên cấu trúc JSON và index
3. Chỉ trả về JSON, không có text khác
4. Nếu trường nào null thì giữ nguyên null

Format JSON trả về:
{
  "translations": [
    {
      "index": 0,
      "title": "tên sản phẩm đã dịch",
      "specs": "thông số đã dịch",
      "status": "trạng thái đã dịch"
    }
  ]
}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            const responseText = data.candidates[0].content.parts[0].text.trim();
            
            // Tìm và parse JSON từ response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsedResult = JSON.parse(jsonMatch[0]);
                    console.log('Taobao Order Helper: Batch translation result:', parsedResult);
                    return parsedResult;
                } catch (parseError) {
                    console.error('Taobao Order Helper: Error parsing JSON response:', parseError);
                    console.log('Taobao Order Helper: Raw response:', responseText);
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Taobao Order Helper: Batch translation error:', error);
        return null;
    }
}

// Hàm dịch văn bản bằng Gemini API (giữ lại cho trường hợp cần dùng riêng lẻ)
async function translateWithGemini(text, apiKey, model) {
    if (!text || !apiKey) {
        return text;
    }
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Dịch văn bản sau sang tiếng Việt, chỉ trả về bản dịch không có giải thích: "${text}"`
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text.trim();
        }
        
        return text;
    } catch (error) {
        console.error('Taobao Order Helper: Translation error:', error);
        return text;
    }
}

// Hàm trích xuất số từ chuỗi
function extractNumbers(str) {
    const match = str.match(/\d+/);
    return match ? match[0] : '1';
}

// Xử lý tin nhắn từ popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'extractOrders') {
        console.log('Taobao Order Helper: Received extract orders request');
        
        // Kiểm tra xem có đang xử lý không
        if (isProcessing) {
            console.log('Taobao Order Helper: Already processing, returning current data');
            sendResponse({ success: true, orders: extractedProducts });
            return true;
        }
        
        const platform = getCurrentPlatform();
        
        if (platform === 'pinduoduo') {
            // For Pinduoduo, handle async extraction
            console.log('Taobao Order Helper: Handling Pinduoduo async extraction');
            fetchPDDOrders();
            // Return empty array initially, data will be sent to background script
            sendResponse({ success: true, orders: [] });
        } else {
            // For Taobao, handle sync extraction
            const products = extractOrderData();
            sendResponse({ success: true, orders: products });
        }
    } else if (request.action === 'getAllTrackingNumbers') {
        console.log('Taobao Order Helper: Received get all tracking numbers request');
        
        getAllTrackingNumbers(request.orders, function(updatedOrders, trackingCount) {
            sendResponse({ 
                success: true, 
                orders: updatedOrders, 
                trackingCount: trackingCount 
            });
        });
        
        return true; // Keep connection open for async response
    } else if (request.action === 'translateProducts') {
        console.log('Taobao Order Helper: Received translate products request');
        
        translateProducts(request.products, request.settings, function(translatedProducts) {
            sendResponse({ 
                success: true, 
                products: translatedProducts 
            });
        });
        
        return true; // Keep connection open for async response
    } else if (request.action === 'loadMorePDDOrders') {
        // Lấy offset, anti_content, page từ request
        const { offset, anti_content, page } = request;
        fetchPDDOrdersPage({ offset, anti_content, page }).then(result => {
            console.log('Order Helper: Raw result from fetchPDDOrdersPage:', result);
            // Xử lý dữ liệu orders trước khi trả về
            let processedOrders = [];
            if (result.success && result.orders && Array.isArray(result.orders)) {
                console.log('Order Helper: Processing', result.orders.length, 'orders for load more');
                // Xử lý dữ liệu orders giống như trong processPDDOrders
                result.orders.forEach((order, orderIndex) => {
                    const goodsList = order.order_goods || order.goods || order.item_list || order.goods_list || order.items;
                    if (goodsList && Array.isArray(goodsList)) {
                        goodsList.forEach((good, goodIndex) => {
                            const product = {
                                orderId: order.order_sn || order.orderSN || order.group_order_id || `pdd_${orderIndex}`,
                                productId: `pdd_${order.order_sn || order.orderSN || order.group_order_id || orderIndex}_${goodIndex}`,
                                title: good.goods_name || good.goodsName || good.product_name || 'Unknown Product',
                                specs: good.spec || good.specs || good.sku || '',
                                quantity: good.goods_number || good.quantity || good.count || 1,
                                price: good.goods_price || good.price || 0,
                                image: good.thumb_url || '',
                                status: order.order_status_desc || order.status || 'Unknown',
                                trackingNumber: order.tracking_number || order.trackingNumber || '',
                                platform: 'pinduoduo'
                            };
                            processedOrders.push(product);
                        });
                    } else {
                        console.log('Order Helper: Order without goods list:', order);
                    }
                });
            }
            
            console.log('Order Helper: Processed orders for load more:', processedOrders.length);
            if (processedOrders.length > 0) {
                console.log('Order Helper: First processed order:', processedOrders[0]);
            }
            
            sendResponse({
                success: true,
                orders: processedOrders,
                offset: result.offset || '',
                anti_content: result.anti_content || '',
                page: result.page || page,
                hasMore: !!result.hasMore
            });
        }).catch(err => {
            console.error('Order Helper: Error in loadMorePDDOrders:', err);
            sendResponse({ success: false, error: err.toString() });
        });
        return true;
    }
    
    // Handle check order status from nhaphangchina.vn
    if (request.action === 'checkOrderStatus') {
        checkOrderStatusFromNhaphangchina(request.orders, sendResponse);
        return true;
    }
    
    // Luôn trả về true để giữ kết nối mở cho phản hồi bất đồng bộ
    return true;
});

// Thêm listener để reset dữ liệu khi trang thay đổi
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('Taobao Order Helper: URL changed, resetting extracted products');
        extractedProducts = [];
        isProcessing = false;
        lastExtractionTime = 0;
    }
}).observe(document, { subtree: true, childList: true });

// Check order status from nhaphangchina.vn
async function checkOrderStatusFromNhaphangchina(orders, sendResponse) {
    try {
        let checkedCount = 0;
        const updatedOrders = [...orders];
        
        for (let i = 0; i < updatedOrders.length; i++) {
            const order = updatedOrders[i];
            
            // Skip if no tracking number
            if (!order.trackingNumber || order.trackingNumber === 'N/A') {
                continue;
            }
            
            try {
                // Call API through background script to avoid CORS issues
                const response = await new Promise((resolve, reject) => {
                    console.log('Content script: Sending checkNhaphangchinaStatus for trackingNumber:', order.trackingNumber);
                    chrome.runtime.sendMessage({
                        action: 'checkNhaphangchinaStatus',
                        trackingNumber: order.trackingNumber
                    }, (response) => {
                        console.log('Content script: Received response from background for trackingNumber:', order.trackingNumber);
                        console.log('Content script: Full response:', response);
                        
                        if (chrome.runtime.lastError) {
                            console.error('Content script: Runtime error:', chrome.runtime.lastError);
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
                
                console.log('Content script: Processing response for trackingNumber:', order.trackingNumber, response);
                
                if (response && response.success) {
                    updatedOrders[i].nhaphangchinaStatus = response.status || 'Đã tìm thấy';
                    checkedCount++;
                    console.log('Content script: Updated order status to:', response.status);
                } else {
                    updatedOrders[i].nhaphangchinaStatus = response ? response.status : 'Lỗi kết nối';
                    console.log('Content script: Order not found or error, status:', updatedOrders[i].nhaphangchinaStatus);
                    console.log('Content script: Full response:', response);
                }
                
                // Send progress update to popup after each order
                chrome.runtime.sendMessage({
                    action: 'orderStatusUpdated',
                    orderIndex: i,
                    orderId: order.orderId,
                    status: updatedOrders[i].nhaphangchinaStatus,
                    checkedCount: checkedCount,
                    totalCount: updatedOrders.length
                });
                
            } catch (error) {
                console.error('Content script: Error checking order status:', error);
                updatedOrders[i].nhaphangchinaStatus = 'Lỗi kết nối';
                
                // Send error update to popup
                chrome.runtime.sendMessage({
                    action: 'orderStatusUpdated',
                    orderIndex: i,
                    orderId: order.orderId,
                    status: 'Lỗi kết nối',
                    checkedCount: checkedCount,
                    totalCount: updatedOrders.length
                });
            }
            
            // Add small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Save final results to background script
        chrome.runtime.sendMessage({
            action: 'saveOrders',
            orders: updatedOrders
        });
        
        sendResponse({
            success: true,
            checkedCount: checkedCount,
            orders: updatedOrders
        });
        
    } catch (error) {
        console.error('Content script: Error in checkOrderStatusFromNhaphangchina:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}