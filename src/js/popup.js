// DOM Elements
const extractBtn = document.getElementById('extractBtn');
    const getAllTrackingBtn = document.getElementById('getAllTrackingBtn');
    const checkStatusBtn = document.getElementById('checkStatusBtn');
    const copyBtn = document.getElementById('copyBtn');
    const customizeBtn = document.getElementById('customizeBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
const orderTableBody = document.getElementById('orderTableBody');
const statusMessage = document.getElementById('statusMessage');
const loading = document.getElementById('loading');
const customizeDialog = document.getElementById('customizeDialog');
const closeDialogBtn = document.getElementById('closeDialogBtn');
const applyCustomizeBtn = document.getElementById('applyCustomizeBtn');
const cancelCustomizeBtn = document.getElementById('cancelCustomizeBtn');
const columnList = document.getElementById('columnList');
const addCustomColumnBtn = document.getElementById('addCustomColumnBtn');
const customColumnName = document.getElementById('customColumnName');

// Settings elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsSection = document.getElementById('settingsSection');
const geminiApiKey = document.getElementById('geminiApiKey');
const geminiModel = document.getElementById('geminiModel');
const enableTranslation = document.getElementById('enableTranslation');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

// Platform indicator elements
const platformIndicator = document.getElementById('platformIndicator');
const platformText = document.getElementById('platformText');

// Extracted orders data
let extractedOrders = [];

// Column configuration
let columnConfig = {
    order: ['image', 'title', 'quantity', 'specs', 'orderId', 'status', 'trackingNumber', 'trackingStatus'],
    visible: {
        'image': true,
        'title': true,
        'quantity': true,
        'specs': true,
        'orderId': true,
        'status': true,
        'trackingNumber': true,
        'trackingStatus': true,
    },
    custom: {}
};

// Settings configuration
let settings = {
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash',
    enableTranslation: false
};

// --- Pagination state for Pinduoduo ---
let pddPaging = {
    offset: '',
    anti_content: '',
    page: 1,
    hasMore: true,
    platform: '',
};
const loadMoreBtn = document.getElementById('loadMoreBtn');
loadMoreBtn.style.display = 'none'; // Hide by default

function resetPaging() {
    pddPaging = { offset: '', anti_content: '', page: 1, hasMore: true, platform: '' };
    loadMoreBtn.style.display = 'none';
}

// Load saved column configuration
function loadColumnConfig() {
    chrome.storage.local.get('columnConfig', function(result) {
        if (result.columnConfig) {
            columnConfig = result.columnConfig;
            updateTableWithConfig();
        }
    });
}

// Save column configuration
function saveColumnConfig() {
    chrome.storage.local.set({ columnConfig: columnConfig });
}

// Load saved settings
function loadSettings() {
    chrome.storage.local.get('settings', function(result) {
        if (result.settings) {
            settings = result.settings;
            // Update UI with loaded settings
            geminiApiKey.value = settings.geminiApiKey || '';
            geminiModel.value = settings.geminiModel || 'gemini-1.5-flash';
            enableTranslation.checked = settings.enableTranslation || false;
        } else {
        }
    });
}

// Toggle settings section
function toggleSettings() {
    if (settingsSection.style.display === 'none') {
        showSettings();
    } else {
        hideSettings();
    }
}

// Show settings section
function showSettings() {
    settingsSection.style.display = 'block';
}

// Hide settings section
function hideSettings() {
    settingsSection.style.display = 'none';
}

// Save settings
function saveSettings() {
    settings.geminiApiKey = geminiApiKey.value;
    settings.geminiModel = geminiModel.value;
    settings.enableTranslation = enableTranslation.checked;
    
    chrome.storage.local.set({ settings: settings }, function() {
        showStatus('Cài đặt đã được lưu');
        hideSettings();
    });
}

// Platform detection
function detectPlatform() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const url = tabs[0].url;
            if (url.includes('taobao.com') || url.includes('tmall.com')) {
                resolve('taobao');
            } else if (url.includes('yangkeduo.com')) {
                resolve('pinduoduo');
            } else if (url.includes('nhaphangchina.vn')) {
                resolve('nhaphangchina');
            } else {
                resolve('unknown');
            }
        });
    });
}

// Update platform indicator
function updatePlatformIndicator(platform) {
    platformIndicator.className = 'platform-indicator';
    
    switch (platform) {
        case 'taobao':
            platformIndicator.classList.add('taobao');
            platformText.textContent = '🎯 Taobao/Tmall';
            break;
        case 'pinduoduo':
            platformIndicator.classList.add('pinduoduo');
            platformText.textContent = '🛒 Pinduoduo';
            break;
        case 'nhaphangchina':
            platformIndicator.classList.add('nhaphangchina');
            platformText.textContent = '📦 NhapHangChina';
            break;
        default:
            platformText.textContent = '❌ Không hỗ trợ';
            break;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load settings and column configuration
    loadSettings();
    loadColumnConfig();
    
    // Detect and display current platform
    detectPlatform().then(platform => {
        updatePlatformIndicator(platform);
        updateCheckStatusButton();
        updateGetAllTrackingButton();
    });
    
    // Check if there are already extracted orders in background script
    chrome.runtime.sendMessage({ action: 'getOrders' }, async function(response) {
        if (response.success && response.orders && response.orders.length > 0) {
            extractedOrders = response.orders;
            
            // Auto-resize popup to fit content BEFORE updating table
            adjustPopupSize();
            
            // Update table after popup size is set
            await updateTableWithConfig();
            enableButtons();
            
            showStatus(`Đã tải ${extractedOrders.length} sản phẩm từ phiên làm việc trước`);
            
            // Lấy paging state từ background.js nếu có
            if (response.offset !== undefined || response.anti_content !== undefined) {
                pddPaging.offset = response.offset || '';
                pddPaging.anti_content = response.anti_content || '';
                pddPaging.hasMore = response.hasMore !== undefined ? response.hasMore : true;
                pddPaging.platform = 'pinduoduo';
            }
        } else {
            // Clear table headers when no data to prevent header taking full screen
            const orderTable = document.getElementById('orderTable');
            const thead = orderTable.querySelector('thead');
            const tbody = orderTable.querySelector('tbody');
            thead.innerHTML = '';
            tbody.innerHTML = '';
        }
        
        // Kiểm tra nếu đang trong quá trình dịch
        if (response.translationStatus && response.translationStatus.isTranslating) {
            checkPendingTranslation();
        }
    });
    
    // Add event listeners for new buttons
    settingsBtn.addEventListener('click', toggleSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    closeSettingsBtn.addEventListener('click', hideSettings);
    getAllTrackingBtn.addEventListener('click', getAllTrackingNumbers);
    checkStatusBtn.addEventListener('click', checkOrderStatus);
    copyBtn.addEventListener('click', copyDataToClipboard);
    customizeBtn.addEventListener('click', function() {
        openCustomizeDialog();
    });
    clearDataBtn.addEventListener('click', clearAllData);
    
    // Add event listeners for customize dialog buttons
    closeDialogBtn.addEventListener('click', closeCustomizeDialog);
    cancelCustomizeBtn.addEventListener('click', closeCustomizeDialog);
    applyCustomizeBtn.addEventListener('click', applyCustomize);
    addCustomColumnBtn.addEventListener('click', addCustomColumn);
    
    // Listen for tracking number updates from background script
    chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
        if (message.action === 'trackingNumberUpdated') {
            // Cập nhật mã vận đơn trong extractedOrders
            const orderIndex = extractedOrders.findIndex(order => order.orderId === message.orderId);
            if (orderIndex !== -1) {
                extractedOrders[orderIndex].trackingNumber = message.trackingNumber;
                // Refresh bảng để hiển thị mã vận đơn mới
                await updateTableWithConfig();
                showStatus(`Đã cập nhật mã vận đơn: ${message.trackingNumber}`);
            }
        }
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Popup: Received message:', request.action, request);
        
        if (request.action === 'ordersUpdated') {
            console.log('Popup: Received ordersUpdated notification, count:', request.count);
            // Reload orders from storage and update table
            loadOrdersFromStorage().then(() => {
                updateTableWithConfig();
            });
        } else if (request.action === 'orderStatusUpdated') {
            console.log('Popup: Received orderStatusUpdated for order:', request.orderId, 'status:', request.status);
            console.log('Popup: Current extractedOrders length:', extractedOrders ? extractedOrders.length : 0);
            console.log('Popup: Order index:', request.orderIndex);
            
            // Update specific order in real-time
            if (extractedOrders && extractedOrders[request.orderIndex]) {
                console.log('Popup: Updating order at index:', request.orderIndex);
                extractedOrders[request.orderIndex].nhaphangchinaStatus = request.status;
                
                // Update the specific row in the table
                updateTableRow(request.orderIndex);
                
                // Update status message
                statusMessage.textContent = `Đã kiểm tra ${request.checkedCount}/${request.totalCount} đơn hàng...`;
                
                console.log('Popup: Order updated successfully');
            } else {
                console.error('Popup: Order not found at index:', request.orderIndex);
            }
        } else if (request.action === 'extractionCompleted') {
            console.log('Popup: Received extractionCompleted notification');
            // Reload orders from storage and update table
            loadOrdersFromStorage().then(() => {
                updateTableWithConfig();
                enableButtons();
                showStatus(`Đã trích xuất ${extractedOrders ? extractedOrders.length : 0} sản phẩm`);
            });
        }
    });
});

// Extract button click handler (reset paging)
extractBtn.addEventListener('click', function() {
    resetPaging();
    // Show loading spinner
    showLoading();
    
    // Set minimum height for table to prevent jittering
    orderTableBody.style.minHeight = orderTableBody.clientHeight + 'px';
    
    // Clear table
    orderTableBody.innerHTML = '';
    
    // Send message to content script to extract orders
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0]) {
            hideLoading();
            showError('Không thể kết nối với trang hiện tại');
            return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractOrders' }, async function(response) {
            if (chrome.runtime.lastError) {
                hideLoading();
                showError('Không thể kết nối với trang hiện tại: ' + chrome.runtime.lastError.message);
                return;
            }
            
            if (!response || !response.success) {
                hideLoading();
                showError('Không thể trích xuất dữ liệu đơn hàng');
                return;
            }
            
            // Check if this is Pinduoduo (empty response initially)
            if (response.orders && response.orders.length === 0) {
                // For Pinduoduo, wait a bit and then check background script for data
                setTimeout(() => {
                    chrome.runtime.sendMessage({ action: 'getOrders' }, async function(bgResponse) {
                        if (bgResponse.success && bgResponse.orders && bgResponse.orders.length > 0) {
                            
                            // Cập nhật paging state từ background.js
                            if (bgResponse.offset !== undefined || bgResponse.anti_content !== undefined) {
                                pddPaging.offset = bgResponse.offset || '';
                                pddPaging.anti_content = bgResponse.anti_content || '';
                                pddPaging.hasMore = bgResponse.hasMore !== undefined ? bgResponse.hasMore : true;
                                pddPaging.platform = 'pinduoduo';
                            }
                            
                            // Check if translation is enabled for Pinduoduo
                            if (settings.enableTranslation && settings.geminiApiKey) {
                                // Báo cho background script biết bắt đầu dịch
                                chrome.runtime.sendMessage({ 
                                    action: 'startTranslation',
                                    orders: bgResponse.orders,
                                    settings: settings
                                });
                                
                                statusMessage.textContent = 'Đang dịch tên và thuộc tính sản phẩm...';
                                
                                // Send translation request
                                chrome.tabs.sendMessage(tabs[0].id, { 
                                    action: 'translateProducts',
                                    products: bgResponse.orders,
                                    settings: settings
                                }, async function(translationResponse) {
                                    
                                    if (translationResponse && translationResponse.success) {
                                        await processOrders(translationResponse.products);
                                        
                                        // Báo cho background script biết đã dịch xong
                                        chrome.runtime.sendMessage({ 
                                            action: 'finishTranslation',
                                            orders: translationResponse.products 
                                        }, function() {
                                            hideLoading();
                                            showStatus(`Đã trích xuất và dịch ${translationResponse.products.length} sản phẩm từ Pinduoduo`);
                                        });
                                    } else {
                                        // Fallback to original orders if translation fails
                                        await processOrders(bgResponse.orders);
                                        
                                        // Báo cho background script biết dịch thất bại
                                        chrome.runtime.sendMessage({ 
                                            action: 'finishTranslation',
                                            orders: bgResponse.orders 
                                        }, function() {
                                            hideLoading();
                                            showStatus(`Đã trích xuất ${bgResponse.orders.length} sản phẩm từ Pinduoduo (dịch thất bại)`);
                                        });
                                    }
                                });
                            } else {
                                // Process and display orders without translation
                                await processOrders(bgResponse.orders);
                            hideLoading();
                            showStatus(`Đã trích xuất ${bgResponse.orders.length} sản phẩm từ Pinduoduo`);
                            }
                        } else {
                            hideLoading();
                            showError('Không thể trích xuất dữ liệu từ Pinduoduo');
                        }
                    });
                }, 2000); // Wait 2 seconds for async processing
                return;
            }
            
            // For Taobao, process orders directly
            if (response.orders && response.orders.length > 0) {
                // Save orders to background script first
            chrome.runtime.sendMessage({ 
                action: 'saveOrders', 
                orders: response.orders 
            });
            
            // Check if translation is enabled
            if (settings.enableTranslation && settings.geminiApiKey) {
                // Báo cho background script biết bắt đầu dịch
                chrome.runtime.sendMessage({ 
                    action: 'startTranslation',
                    orders: response.orders,
                    settings: settings
                });
                
                statusMessage.textContent = 'Đang dịch tên và thuộc tính sản phẩm...';
                
                // Send translation request
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: 'translateProducts',
                    products: response.orders,
                    settings: settings
                    }, async function(translationResponse) {
                    
                    if (translationResponse && translationResponse.success) {
                            await processOrders(translationResponse.products);
                        
                        // Báo cho background script biết đã dịch xong
                        chrome.runtime.sendMessage({ 
                            action: 'finishTranslation',
                            orders: translationResponse.products 
                        }, function() {
                            hideLoading();
                            showStatus(`Đã trích xuất và dịch ${translationResponse.products.length} sản phẩm`);
                        });
                    } else {
                        // Fallback to original orders if translation fails
                            await processOrders(response.orders);
                        
                        // Báo cho background script biết dịch thất bại
                        chrome.runtime.sendMessage({ 
                            action: 'finishTranslation',
                            orders: response.orders 
                        }, function() {
                            hideLoading();
                            showStatus(`Đã trích xuất ${response.orders.length} sản phẩm (dịch thất bại)`);
                        });
                    }
                });
            } else {
                // Process and display orders without translation
                    await processOrders(response.orders);
                
                // Save orders to background script (đã lưu ở trên rồi)
                hideLoading();
                showStatus(`Đã trích xuất ${response.orders.length} sản phẩm`);
                }
            } else {
                // No orders found, try to get from background script
                setTimeout(() => {
                    chrome.runtime.sendMessage({ action: 'getOrders' }, async function(bgResponse) {
                        if (bgResponse.success && bgResponse.orders && bgResponse.orders.length > 0) {
                            await processOrders(bgResponse.orders);
                            hideLoading();
                            showStatus(`Đã trích xuất ${bgResponse.orders.length} sản phẩm`);
                        } else {
                            hideLoading();
                            showError('Không tìm thấy dữ liệu đơn hàng nào');
                        }
                    });
                }, 1000);
            }
        });
    });
});

// Load More button click handler
loadMoreBtn.addEventListener('click', function() {
    showLoading();
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0]) {
            hideLoading();
            showError('Không thể kết nối với trang Pinduoduo');
            return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'loadMorePDDOrders',
            offset: pddPaging.offset,
            anti_content: pddPaging.anti_content,
            page: pddPaging.page + 1,
            settings: settings // Thêm settings để content script biết có cần dịch không
        }, async function(response) {
            if (chrome.runtime.lastError || !response || !response.success) {
                hideLoading();
                showError('Không thể tải thêm sản phẩm');
                return;
            }
            
            if (response.orders && response.orders.length > 0) {
                // Append new orders
                extractedOrders = extractedOrders.concat(response.orders);
                updateTableWithConfig();
                
                // Update paging state
                pddPaging.offset = response.offset || '';
                pddPaging.anti_content = response.anti_content || '';
                pddPaging.page = response.page || (pddPaging.page + 1);
                pddPaging.hasMore = !!response.hasMore;
                pddPaging.platform = 'pinduoduo'; // Đảm bảo luôn set lại
                
                // Cập nhật paging state trong background.js
                chrome.runtime.sendMessage({
                    action: 'updatePDDPaging',
                    offset: pddPaging.offset,
                    anti_content: pddPaging.anti_content,
                    page: pddPaging.page,
                    hasMore: pddPaging.hasMore
                });
                
                // Save updated orders to background script
                chrome.runtime.sendMessage({
                    action: 'saveOrders',
                    orders: extractedOrders
                });
                
                hideLoading();
                showStatus(`Đã tải thêm ${response.orders.length} sản phẩm. Tổng cộng: ${extractedOrders.length} sản phẩm`);
                
                // Hide Load More button if no more data
                if (!pddPaging.hasMore) loadMoreBtn.style.display = 'none';
            } else {
                pddPaging.hasMore = false;
                loadMoreBtn.style.display = 'none';
            hideLoading();
                showStatus('Đã tải hết tất cả sản phẩm');
            }
        });
    });
});


// Customize button click handler
customizeBtn.addEventListener('click', function() {
    openCustomizeDialog();
});

// Close dialog button click handler
closeDialogBtn.addEventListener('click', function() {
    closeCustomizeDialog();
});

// Cancel customize button click handler
cancelCustomizeBtn.addEventListener('click', function() {
    closeCustomizeDialog();
});

// Apply customize button click handler
applyCustomizeBtn.addEventListener('click', function() {
    applyCustomize();
});

// Add custom column button click handler
addCustomColumnBtn.addEventListener('click', function() {
    addCustomColumn();
});

// Process and display the extracted products
async function processOrders(products) {
    
    if (!products || products.length === 0) {
        showError('Không tìm thấy dữ liệu sản phẩm nào. Vui lòng đảm bảo bạn đang ở trang danh sách đơn hàng Taobao.');
        return;
    }
    
    // Nếu là sản phẩm Pinduoduo thì set platform
    if (products[0].platform === 'pinduoduo') {
        pddPaging.platform = 'pinduoduo';
    }
    
    extractedOrders = products;
    
    // Display data according to column configuration
    await updateTableWithConfig();
    
    // Enable buttons
    enableButtons();
    
    // Auto-resize popup to fit content
    adjustPopupSize();
    
    // Show success message
    statusMessage.textContent = `Đã trích xuất ${products.length} sản phẩm`;
    hideLoading();
    
    // Reset table height
    setTimeout(() => {
        orderTableBody.style.minHeight = '';
    }, 500);
    // Show Load More if Pinduoduo and hasMore
    if (pddPaging.platform === 'pinduoduo' && pddPaging.hasMore) {
        loadMoreBtn.style.display = 'inline-block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

// Auto-resize popup to fit content
function adjustPopupSize() {
    const tableContainer = document.querySelector('.table-container');
    const table = document.getElementById('orderTable');
    
    // Calculate total width including custom columns
    let totalColumnWidth = 80 + 400 + 60 + 200 + 140 + 100 + 140; // Base columns
    
    // Add width for custom columns
    columnConfig.order.forEach(columnId => {
        if (columnConfig.visible[columnId] && columnId.startsWith('custom_')) {
            const columnName = getColumnDisplayName(columnId);
            const customWidth = calculateCustomColumnWidth(columnName);
            totalColumnWidth += customWidth;
        }
    });
    
    // Add padding and borders
    totalColumnWidth += 50;
    
    const fixedWidth = Math.min(totalColumnWidth, 1200); // Cap at 1200px
    const finalWidth = fixedWidth + 100; // Add 100px to popup width
    
    // Apply width immediately without animation
    document.body.style.width = finalWidth + 'px';
    
    // Calculate required height based on content
    let requiredHeight = 600; // Base height
    
    if (extractedOrders && extractedOrders.length > 0) {
        // Calculate height needed for table rows
        const rowHeight = 60; // Approximate height per row
        const headerHeight = 50; // Table header height
        const otherElementsHeight = 200; // Header, buttons, padding, etc.
        
        // Show up to 8 rows, then use scroll
        const visibleRows = Math.min(extractedOrders.length, 8);
        const tableHeight = headerHeight + (visibleRows * rowHeight);
        
        requiredHeight = otherElementsHeight + tableHeight;
        requiredHeight = Math.min(requiredHeight, 700); // Max 700px
    }
    
    // Apply height immediately without animation
    document.body.style.height = requiredHeight + 'px';
    
    // Adjust table container height
    const availableHeight = requiredHeight - 200; // Account for header, buttons, etc.
    tableContainer.style.maxHeight = Math.max(300, availableHeight) + 'px';
    
    // Ensure table uses fixed layout for better text wrapping
    if (table) {
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
    }
    
    // Force layout recalculation
    setTimeout(() => {
        if (table) {
            table.style.tableLayout = 'fixed';
            table.style.width = '100%';
        }
    }, 50);
}

// Calculate custom column width based on text length
function calculateCustomColumnWidth(columnName) {
    const baseWidth = 120; // Minimum width
    const charWidth = 8; // Approximate width per character
    const calculatedWidth = baseWidth + (columnName.length * charWidth);
    return Math.min(calculatedWidth, 300); // Max 300px
}

// Update table with column configuration
async function updateTableWithConfig() {
    const orderTable = document.getElementById('orderTable');
    if (!orderTable) {
        console.error('Popup: orderTable element not found');
        return;
    }
    
    const thead = orderTable.querySelector('thead');
    const tbody = orderTable.querySelector('tbody');
    
    if (!thead || !tbody) {
        console.error('Popup: thead or tbody element not found');
        return;
    }
    
    // Clear all current columns completely
    thead.innerHTML = '';
    tbody.innerHTML = '';
    
    // If no orders, don't create any columns
    if (!extractedOrders || extractedOrders.length === 0) {
        return;
    }
    
    // Load saved column widths
    const columnWidths = await loadColumnWidths();
    
    // Set table layout to fixed before creating columns
    orderTable.style.tableLayout = 'fixed';
    orderTable.style.width = '100%';
    
    // Create thead row
    const theadRow = document.createElement('tr');
    thead.appendChild(theadRow);
    
    // Create table headers according to configuration
    columnConfig.order.forEach(columnId => {
        if (columnConfig.visible[columnId]) {
            const th = document.createElement('th');
            th.className = `col-${columnId}`;
            th.textContent = getColumnDisplayName(columnId);
            th.setAttribute('data-column', columnId); // Add data-column attribute
            
            console.log('Popup: Creating header for column:', columnId, 'visible:', columnConfig.visible[columnId]);
            
            // Apply saved width or default width
            if (columnWidths[columnId]) {
                const savedWidth = columnWidths[columnId];
                th.style.width = savedWidth + 'px';
                th.style.minWidth = savedWidth + 'px';
                th.style.maxWidth = savedWidth + 'px';
            } else {
                // Set custom width for custom columns
                if (columnId.startsWith('custom_')) {
                    const columnName = getColumnDisplayName(columnId);
                    const customWidth = calculateCustomColumnWidth(columnName);
                    th.style.minWidth = customWidth + 'px';
                    th.style.maxWidth = customWidth + 'px';
                    th.style.width = customWidth + 'px';
                }
            }
            
            // Create resize handle for column width adjustment
            createResizeHandle(th);
            
            theadRow.appendChild(th);
        } else {
            console.log('Popup: Skipping column:', columnId, 'visible:', columnConfig.visible[columnId]);
        }
    });
    
    // Force table to recalculate layout
    setTimeout(() => {
        orderTable.style.tableLayout = 'fixed';
        orderTable.style.width = '100%';
    }, 10);
    
    // Create data rows - one row per product
    extractedOrders.forEach(product => {
        const row = document.createElement('tr');
        
        columnConfig.order.forEach(columnId => {
            if (columnConfig.visible[columnId]) {
                const cell = document.createElement('td');
                cell.setAttribute('data-column', columnId); // Add data-column attribute
                
                // Apply saved width to data cells
                if (columnWidths[columnId]) {
                    const savedWidth = columnWidths[columnId];
                    cell.style.width = savedWidth + 'px';
                    cell.style.minWidth = savedWidth + 'px';
                    cell.style.maxWidth = savedWidth + 'px';
                }
                
                if (columnId === 'image') {
                    const image = document.createElement('img');
                    image.src = product.image || '';
                    image.alt = 'Product Image';
                    image.className = 'product-image';
                    cell.appendChild(image);
                } else if (columnId === 'title') {
                    cell.textContent = product.title || 'N/A';
                    cell.title = product.title || 'N/A';
                } else if (columnId === 'quantity') {
                    cell.textContent = product.quantity || '1';
                } else if (columnId === 'specs') {
                    cell.textContent = product.specs || 'N/A';
                    cell.title = product.specs || 'N/A';
                } else if (columnId === 'orderId') {
                    cell.textContent = product.orderId || 'N/A';
                    cell.title = product.orderId || 'N/A';
                } else if (columnId === 'status') {
                    // Use nhaphangchina status if available, otherwise use original status
                    const statusText = product.nhaphangchinaStatus || product.status || 'N/A';
                    cell.textContent = statusText;
                    cell.title = statusText;
                    
                    console.log('Popup: Creating status cell for order:', product.orderId, 'status:', statusText);
                    
                    // Add color coding for nhaphangchina status
                    if (product.nhaphangchinaStatus) {
                        if (product.nhaphangchinaStatus === 'Đã kết thúc') {
                            cell.style.color = '#28a745';
                            cell.style.fontWeight = 'bold';
                        } else if (product.nhaphangchinaStatus === 'Đã giao hàng') {
                            cell.style.color = '#28a745';
                            cell.style.fontWeight = 'bold';
                        } else if (product.nhaphangchinaStatus === 'Đã về kho VN') {
                            cell.style.color = '#17a2b8';
                            cell.style.fontWeight = 'bold';
                        } else if (product.nhaphangchinaStatus === 'Tiếp nhận đơn ký gửi') {
                            cell.style.color = '#ffc107';
                            cell.style.fontWeight = 'bold';
                        } else if (product.nhaphangchinaStatus === 'Đã tìm thấy') {
                            cell.style.color = '#6f42c1';
                            cell.style.fontWeight = 'bold';
                        } else if (product.nhaphangchinaStatus === 'Chưa thêm vào nhaphangchina') {
                            cell.style.color = '#dc3545';
                        } else if (product.nhaphangchinaStatus === 'Lỗi kết nối') {
                            cell.style.color = '#6c757d';
                        }
                    }
                } else if (columnId === 'trackingNumber') {
                    cell.innerHTML = '';
                    if (product.trackingNumber) {
                        // Tạo span copy
                        const span = document.createElement('span');
                        span.className = 'copy-tracking';
                        span.textContent = product.trackingNumber;
                        span.title = 'Bấm để copy mã vận đơn';
                        span.style.cursor = 'pointer';
                        
                        // Thêm icon copy
                        const copyIcon = document.createElement('span');
                        copyIcon.className = 'copy-icon';
                        copyIcon.textContent = '📋';
                        copyIcon.style.marginLeft = '5px';
                        copyIcon.style.fontSize = '12px';
                        
                        span.appendChild(copyIcon);
                        cell.appendChild(span);
                        
                        // Add click event to copy
                        span.addEventListener('click', function() {
                            navigator.clipboard.writeText(product.trackingNumber).then(() => {
                                showStatus('Đã copy mã vận đơn: ' + product.trackingNumber);
                            }).catch(err => {
                                console.error('Failed to copy: ', err);
                                showStatus('Không thể copy mã vận đơn');
                            });
                                        });
                                    } else {
                        cell.textContent = 'N/A';
                    }
                } else if (columnId === 'trackingStatus') {
                    cell.textContent = product.trackingStatus || '';
                    cell.title = product.trackingStatus || '';
                } else if (columnId.startsWith('custom_')) {
                    // Handle custom columns
                    const customColumn = columnConfig.custom[columnId];
                    if (customColumn) {
                        cell.textContent = customColumn.value || '';
                        cell.title = customColumn.value || '';
                    } else {
                        cell.textContent = 'N/A';
                        cell.title = 'N/A';
                    }
                }
                
                row.appendChild(cell);
            }
        });
        
        tbody.appendChild(row);
    });
    
    // Adjust table header widths
    adjustTableHeaderWidths();
}

// Get column display name
function getColumnDisplayName(columnId) {
    const displayNames = {
        'image': 'Hình ảnh',
        'title': 'Tên sản phẩm',
        'quantity': 'SL',
        'specs': 'Thông số',
        'orderId': 'Mã đơn hàng',
        'status': 'Trạng thái',
        'trackingNumber': 'Mã vận đơn',
        'trackingStatus': 'Tracking Status',
    };
    
    if (columnId.startsWith('custom_')) {
        return columnConfig.custom[columnId]?.name || 'Cột tùy chỉnh';
    }
    
    return displayNames[columnId] || columnId;
}

// Adjust table header widths
function adjustTableHeaderWidths() {
    const table = document.getElementById('orderTable');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    
    if (!thead || !tbody || !tbody.firstChild) return;
    
    const headerCells = thead.querySelectorAll('th');
    const firstRowCells = tbody.firstChild.querySelectorAll('td');
    
    for (let i = 0; i < headerCells.length && i < firstRowCells.length; i++) {
        const width = firstRowCells[i].offsetWidth;
        headerCells[i].style.width = width + 'px';
    }
}

// Open customize dialog
async function openCustomizeDialog() {
    
    // Update column list
    await updateColumnList();
    
    // Initialize sortable list
    await initSortable();
    
    // Show dialog
    if (customizeDialog) {
    customizeDialog.style.display = 'block';
    } else {
        console.error('Order Helper: customizeDialog element is null!');
    }
}

// Close customize dialog
function closeCustomizeDialog() {
    customizeDialog.style.display = 'none';
}

// Update column list in customize dialog
async function updateColumnList() {
    // Clear list
    columnList.innerHTML = '';
    
    // Add columns according to configuration
    columnConfig.order.forEach(columnId => {
        const label = document.createElement('label');
        label.setAttribute('data-column', columnId);
        
        // Add visual feedback for hidden columns
        if (!columnConfig.visible[columnId]) {
            label.classList.add('disabled');
        }
        
        // Add checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = columnConfig.visible[columnId];
        checkbox.addEventListener('change', async function() {
            columnConfig.visible[columnId] = this.checked;
            
            // Update visual feedback
            if (this.checked) {
                label.classList.remove('disabled');
            } else {
                label.classList.add('disabled');
            }
            
            // Apply changes immediately
            await updateTableWithConfig();
            // Save configuration
            saveColumnConfig();
        });
        label.appendChild(checkbox);
        
        // Add column name
        const text = document.createTextNode(' ' + getColumnDisplayName(columnId));
        label.appendChild(text);
        
        // Add delete button for custom columns
        if (columnId.startsWith('custom_')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'X';
            deleteBtn.className = 'delete-btn';
            deleteBtn.style.marginLeft = 'auto';
            deleteBtn.style.background = 'none';
            deleteBtn.style.border = 'none';
            deleteBtn.style.color = '#e53935';
            deleteBtn.style.fontWeight = 'bold';
            deleteBtn.style.cursor = 'pointer';
            
            deleteBtn.addEventListener('click', function() {
                deleteCustomColumn(columnId);
            });
            
            label.appendChild(deleteBtn);
        }
        
        columnList.appendChild(label);
    });
}

// Initialize sortable list
async function initSortable() {
    const items = columnList.querySelectorAll('label');
    
    items.forEach(item => {
        // Add drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '☰';
        dragHandle.style.marginRight = '10px';
        dragHandle.style.cursor = 'grab';
        dragHandle.style.color = '#999';
        
        // Insert drag handle at the beginning
        item.insertBefore(dragHandle, item.firstChild);
        
        // Make item draggable
                item.draggable = true;
        
        // Add click event to toggle checkbox (but not when clicking drag handle)
        item.addEventListener('click', async function(e) {
            if (e.target.className === 'drag-handle' || e.target.className === 'delete-btn') {
                return;
            }
            
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                columnConfig.visible[this.getAttribute('data-column')] = checkbox.checked;
                // Apply changes immediately
                await updateTableWithConfig();
                // Save configuration
                saveColumnConfig();
            }
        });
        
        // Add drag events
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

// Drag event handlers
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    
    if (draggedItem !== this) {
        // Get column IDs
        const fromColumnId = draggedItem.getAttribute('data-column');
        const toColumnId = this.getAttribute('data-column');
        
        // Get current order
        const currentOrder = [...columnConfig.order];
        
        // Get indices
        const fromIndex = currentOrder.indexOf(fromColumnId);
        const toIndex = currentOrder.indexOf(toColumnId);
        
        // Reorder
        currentOrder.splice(fromIndex, 1);
        currentOrder.splice(toIndex, 0, fromColumnId);
        
        // Update configuration
        columnConfig.order = currentOrder;
        
        // Update list
        updateColumnList();
        initSortable();
    }
    
    return false;
}

function handleDragEnd(e) {
    // Remove classes
    const items = columnList.querySelectorAll('label');
    items.forEach(item => {
        item.classList.remove('dragging');
        item.classList.remove('drag-over');
    });
}

// Apply customize changes
async function applyCustomize() {
    // Save configuration
    saveColumnConfig();
    
    // Update table
    await updateTableWithConfig();
    
    // Close dialog
    closeCustomizeDialog();
    
    // Show success message
    statusMessage.textContent = 'Đã áp dụng tùy chỉnh';
}

// Add custom column
async function addCustomColumn() {
    const name = customColumnName.value.trim();
    
    if (!name) {
        alert('Vui lòng nhập tên cột');
        return;
    }
    
    // Generate unique ID
    const id = 'custom_' + Date.now();
    
    // Add to configuration
    columnConfig.order.push(id);
    columnConfig.visible[id] = true;
    columnConfig.custom[id] = { name: name, value: '' };
    
    // Save configuration
    saveColumnConfig();
    
    // Update list
    await updateColumnList();
    await initSortable();
    
    // Update table immediately
    await updateTableWithConfig();
    
    // Clear input
    customColumnName.value = '';
}

// Delete custom column
async function deleteCustomColumn(columnId) {
    // Remove from order
    const index = columnConfig.order.indexOf(columnId);
    if (index !== -1) {
        columnConfig.order.splice(index, 1);
    }
    
    // Remove from visible
    delete columnConfig.visible[columnId];
    
    // Remove from custom
    delete columnConfig.custom[columnId];
    
    // Save configuration
    saveColumnConfig();
    
    // Update list
    await updateColumnList();
    await initSortable();
    
    // Update table immediately
    await updateTableWithConfig();
}

// Show loading spinner
function showLoading() {
    loading.style.display = 'block';
    statusMessage.textContent = 'Đang trích xuất dữ liệu...';
}

// Hide loading spinner
function hideLoading() {
    loading.style.display = 'none';
}

// Show error message
function showError(message) {
    statusMessage.textContent = message;
    statusMessage.style.color = '#e53935';
    
    setTimeout(() => {
        statusMessage.style.color = '#666';
    }, 5000);
}

// Enable buttons
function enableButtons() {
    copyBtn.disabled = false;
    customizeBtn.disabled = false;
    clearDataBtn.disabled = false;
    
    // Check status button only enabled for NhapHangChina
    updateCheckStatusButton();
    
    // Get all tracking button only enabled for Taobao/Tmall
    updateGetAllTrackingButton();
}

// Update check status button based on current platform
function updateCheckStatusButton() {
    detectPlatform().then(platform => {
        if (platform === 'nhaphangchina') {
            checkStatusBtn.disabled = false;
            checkStatusBtn.style.display = 'inline-block';
        } else {
            checkStatusBtn.disabled = true;
            checkStatusBtn.style.display = 'none';
        }
    });
}

// Update get all tracking button based on current platform
function updateGetAllTrackingButton() {
    detectPlatform().then(platform => {
        if (platform === 'taobao') {
            getAllTrackingBtn.disabled = false;
            getAllTrackingBtn.style.display = 'inline-block';
        } else {
            getAllTrackingBtn.disabled = true;
            getAllTrackingBtn.style.display = 'none';
        }
    });
}

// Get all tracking numbers
function getAllTrackingNumbers() {
    if (!extractedOrders || extractedOrders.length === 0) {
        showError('Không có dữ liệu đơn hàng để lấy mã vận đơn');
        return;
    }
    
    showLoading();
    statusMessage.textContent = 'Đang lấy tất cả mã vận đơn...';
    
    // Send message to content script to get all tracking numbers
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0]) {
            hideLoading();
            showError('Không thể kết nối với trang Taobao');
            return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'getAllTrackingNumbers',
            orders: extractedOrders
        }, function(response) {
            if (chrome.runtime.lastError) {
                hideLoading();
                showError('Không thể kết nối với trang Taobao: ' + chrome.runtime.lastError.message);
                return;
            }
            
            if (!response || !response.success) {
                hideLoading();
                showError('Không thể lấy mã vận đơn');
                return;
            }
            
            // Update orders with tracking numbers
            extractedOrders = response.orders;
            updateTableWithConfig();
            hideLoading();
            showStatus(`Đã lấy ${response.trackingCount} mã vận đơn`);
            
            // Save updated orders to background script
            chrome.runtime.sendMessage({ 
                action: 'saveOrders', 
                orders: extractedOrders 
            });
        });
    });
}

// Show status message
function showStatus(message) {
    statusMessage.textContent = message;
    statusMessage.classList.add('show');
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 2000);
}

// Copy data to clipboard
function copyDataToClipboard() {
    if (!extractedOrders || extractedOrders.length === 0) {
        showError('Không có dữ liệu để copy');
        return;
    }
    
    try {
        // Tạo dữ liệu dạng tab-separated để dễ paste vào Excel/Google Sheets
        const visibleColumns = columnConfig.order.filter(columnId => columnConfig.visible[columnId]);
        
        // Tạo header
        const headers = visibleColumns.map(columnId => getColumnDisplayName(columnId));
        const headerRow = headers.join('\t');
        
        // Tạo data rows
        const dataRows = extractedOrders.map(product => {
            return visibleColumns.map(columnId => {
                let value = '';
                
                if (columnId === 'image') {
                    value = product.image || '';
                } else if (columnId === 'title') {
                    value = product.title || '';
                } else if (columnId === 'quantity') {
                    value = product.quantity || '1';
                } else if (columnId === 'specs') {
                    value = product.specs || '';
                } else if (columnId === 'orderId') {
                    value = product.orderId || '';
                } else if (columnId === 'status') {
                    // Use nhaphangchina status if available, otherwise use original status
                    value = product.nhaphangchinaStatus || product.status || '';
                } else if (columnId === 'trackingNumber') {
                    value = product.trackingNumber || '';
                } else if (columnId === 'trackingStatus') {
                    value = product.trackingStatus || '';
                } else if (columnId.startsWith('custom_')) {
                    const customColumn = columnConfig.custom[columnId];
                    value = customColumn ? (customColumn.value || '') : '';
                }
                
                return value;
            }).join('\t');
        });
        
        // Kết hợp header và data
        const clipboardData = [headerRow, ...dataRows].join('\n');
        
        // Copy vào clipboard
        navigator.clipboard.writeText(clipboardData).then(() => {
            showStatus(`Đã copy ${extractedOrders.length} sản phẩm vào clipboard`);
        }).catch(err => {
            console.error('Lỗi khi copy:', err);
            showError('Không thể copy dữ liệu');
        });
        
    } catch (error) {
        console.error('Lỗi khi tạo dữ liệu copy:', error);
        showError('Lỗi khi tạo dữ liệu copy');
    }
}

// Reset column config to default
function resetColumnConfig() {
    columnConfig = {
        order: ['image', 'title', 'quantity', 'specs', 'orderId', 'status', 'trackingNumber', 'trackingStatus'],
        visible: {
            'image': true,
            'title': true,
            'quantity': true,
            'specs': true,
            'orderId': true,
            'status': true,
            'trackingNumber': true,
            'trackingStatus': true,
        },
        custom: {}
    };
    saveColumnConfig();
}

// Clear column widths from storage
async function clearColumnWidths() {
    try {
        await chrome.storage.local.remove(['columnWidths']);
        console.log('Popup: Cleared column widths from storage');
    } catch (error) {
        console.error('Popup: Error clearing column widths:', error);
    }
}

function clearAllData() {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu đã trích xuất?')) {
        // Clear local data
        extractedOrders = [];
        
        // Clear table completely
        const orderTable = document.getElementById('orderTable');
        const thead = orderTable.querySelector('thead');
        const tbody = orderTable.querySelector('tbody');
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Reset popup size to default
        resetPopupSize();
        
        // Reset column config to default
        resetColumnConfig();
        
        // Clear column widths
        clearColumnWidths();
        
        // Clear background script data
        chrome.runtime.sendMessage({ action: 'clearOrders' }, function() {
            showStatus('Đã xóa tất cả dữ liệu');
            
            // Disable buttons
            copyBtn.disabled = true;
            getAllTrackingBtn.disabled = true;
            checkStatusBtn.disabled = true;
            customizeBtn.disabled = true;
            clearDataBtn.disabled = true;
            loadMoreBtn.style.display = 'none';
        });
    }
}

// Reset popup size to default
function resetPopupSize() {
    document.body.style.width = '900px';
    document.body.style.height = '600px';
    
    const tableContainer = document.querySelector('.table-container');
    tableContainer.style.maxHeight = '400px';
}

// Check for pending translation request
function checkPendingTranslation() {
    chrome.runtime.sendMessage({ action: 'checkPendingTranslation' }, function(response) {
        if (response.success && response.hasPendingRequest) {
            waitForTranslationResponse();
        } else {
            // Hiển thị dữ liệu gốc nếu không có request đang chờ
            chrome.runtime.sendMessage({ action: 'getOrders' }, async function(response) {
                if (response.success && response.translationStatus && response.translationStatus.originalOrders) {
                    extractedOrders = response.translationStatus.originalOrders;
                    updateTableWithConfig();
                    enableButtons();
                    showStatus(`Đã tải ${extractedOrders.length} sản phẩm (dịch thất bại hoặc đã hết hạn)`);
                }
            });
        }
    });
}

// Wait for translation response from content script
function waitForTranslationResponse() {
    // Hiển thị dữ liệu gốc trước
    chrome.runtime.sendMessage({ action: 'getOrders' }, async function(response) {
        if (response.success && response.translationStatus && response.translationStatus.originalOrders) {
            extractedOrders = response.translationStatus.originalOrders;
            updateTableWithConfig();
            enableButtons();
            
            showLoading();
            statusMessage.textContent = 'Đang chờ phản hồi dịch từ request trước...';
            
            // Polling để kiểm tra kết quả dịch
            const checkInterval = setInterval(() => {
                chrome.runtime.sendMessage({ action: 'getOrders' }, async function(response) {
                    if (response.success) {
                        
                        // Nếu không còn đang dịch và có dữ liệu đã dịch
                        if (!response.translationStatus.isTranslating && response.translationStatus.translatedOrders.length > 0) {
                            clearInterval(checkInterval);
                            await processOrders(response.translationStatus.translatedOrders);
                            hideLoading();
                            showStatus(`Đã hoàn thành dịch ${response.translationStatus.translatedOrders.length} sản phẩm`);
                        }
                        // Nếu không còn đang dịch và không có dữ liệu đã dịch (dịch thất bại)
                        else if (!response.translationStatus.isTranslating && response.translationStatus.translatedOrders.length === 0) {
                            clearInterval(checkInterval);
                            hideLoading();
                            showStatus(`Đã tải ${extractedOrders.length} sản phẩm (dịch thất bại)`);
                        }
                    }
                });
            }, 1000); // Kiểm tra mỗi giây
            
            // Timeout sau 5 phút
            setTimeout(() => {
                clearInterval(checkInterval);
                hideLoading();
                showError('Dịch quá thời gian chờ, vui lòng thử lại');
            }, 300000);
        }
    });
} 

// Create resize handle for column width adjustment
function createResizeHandle(th) {
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.cssText = `
        position: absolute;
        right: 0;
        top: 0;
        width: 4px;
        height: 100%;
        background: #007bff;
        cursor: col-resize;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 1000;
    `;
    
    th.style.position = 'relative';
    th.appendChild(resizeHandle);
    
    // Show handle on hover
    th.addEventListener('mouseenter', () => {
        resizeHandle.style.opacity = '1';
    });
    
    th.addEventListener('mouseleave', () => {
        resizeHandle.style.opacity = '0';
    });
    
    // Resize functionality
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = th.offsetWidth;
        
        // Add visual feedback
        th.classList.add('resizing');
        document.querySelector('.table-container').classList.add('resizing');
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + deltaX); // Minimum 50px
        
        th.style.width = newWidth + 'px';
        th.style.minWidth = newWidth + 'px';
        th.style.maxWidth = newWidth + 'px';
        
        // Update corresponding data cells
        const columnId = th.getAttribute('data-column');
        const tbody = document.querySelector('#orderTable tbody');
        if (tbody) {
            const cells = tbody.querySelectorAll(`td[data-column="${columnId}"]`);
            cells.forEach(cell => {
                cell.style.width = newWidth + 'px';
                cell.style.minWidth = newWidth + 'px';
                cell.style.maxWidth = newWidth + 'px';
            });
        }
    }
    
    function handleMouseUp() {
        isResizing = false;
        
        // Remove visual feedback
        th.classList.remove('resizing');
        document.querySelector('.table-container').classList.remove('resizing');
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Save column width to storage
        const columnId = th.getAttribute('data-column');
        if (columnId) {
            saveColumnWidth(columnId, th.offsetWidth);
        }
    }
    
    return resizeHandle;
}

// Save column width to storage
function saveColumnWidth(columnId, width) {
    chrome.storage.local.get('columnWidths', function(result) {
        const columnWidths = result.columnWidths || {};
        columnWidths[columnId] = width;
        chrome.storage.local.set({ columnWidths: columnWidths });
    });
}

// Load column widths from storage
function loadColumnWidths() {
    return new Promise((resolve) => {
        chrome.storage.local.get('columnWidths', function(result) {
            resolve(result.columnWidths || {});
        });
    });
} 

// Check order status from nhaphangchina.vn
async function checkOrderStatus() {
    if (!extractedOrders || extractedOrders.length === 0) {
        showError('Không có dữ liệu đơn hàng để kiểm tra trạng thái');
        return;
    }
    
    // Check if current tab is nhaphangchina.vn
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0]) {
            showError('Không thể kết nối với trang hiện tại');
            return;
        }
        
        const currentUrl = tabs[0].url;
        if (!currentUrl.includes('nhaphangchina.vn')) {
            showError('Vui lòng truy cập trang muahang.nhaphangchina.vn để kiểm tra trạng thái');
            return;
        }
        
        showLoading();
        statusMessage.textContent = 'Đang kiểm tra trạng thái đơn hàng...';
        
        // Send message to content script to check order status
        chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'checkOrderStatus',
            orders: extractedOrders
        }, function(response) {
            console.log('Popup: Received final response from content script:', response);
            
            if (chrome.runtime.lastError) {
                hideLoading();
                showError('Không thể kết nối với trang nhaphangchina.vn: ' + chrome.runtime.lastError.message);
                return;
            }
            
            if (!response || !response.success) {
                hideLoading();
                showError('Không thể kiểm tra trạng thái đơn hàng');
                return;
            }
            
            console.log('Popup: Final processing, checkedCount:', response.checkedCount);
            console.log('Popup: Final updated orders:', response.orders);
            
            hideLoading();
            showStatus(`Đã kiểm tra trạng thái cho ${response.checkedCount || 0} đơn hàng`);
            
            // Final update of orders with status information
            if (response.orders) {
                // Map lại để chuyển nhaphangchinaStatus sang trackingStatus
                extractedOrders = response.orders.map(order => {
                    if (order.nhaphangchinaStatus) {
                        order.trackingStatus = order.nhaphangchinaStatus;
                        delete order.nhaphangchinaStatus;
                    }
                    return order;
                });
                updateTableWithConfig().then(() => {});
            }
        });
    });
} 

// Load orders from storage
async function loadOrdersFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['extractedOrders'], function(result) {
            if (result.extractedOrders) {
                extractedOrders = result.extractedOrders;
                console.log('Popup: Loaded orders from storage:', extractedOrders.length);
            }
            resolve();
        });
    });
} 

// Update specific table row
function updateTableRow(orderIndex) {
    const tbody = document.getElementById('orderTableBody');
    if (!tbody) {
        console.error('Popup: orderTableBody element not found');
        return;
    }
    
    const row = tbody.children[orderIndex];
    
    if (row && extractedOrders[orderIndex]) {
        const order = extractedOrders[orderIndex];
        
        // Update status cell
        const statusCell = row.querySelector('.col-status');
        if (statusCell) {
            const statusText = order.nhaphangchinaStatus || order.status || 'N/A';
            statusCell.textContent = statusText;
            statusCell.title = statusText;
            
            // Apply color coding
            if (order.nhaphangchinaStatus) {
                statusCell.style.color = '';
                statusCell.style.fontWeight = '';
                
                if (order.nhaphangchinaStatus === 'Đã kết thúc') {
                    statusCell.style.color = '#28a745';
                    statusCell.style.fontWeight = 'bold';
                } else if (order.nhaphangchinaStatus === 'Đã giao hàng') {
                    statusCell.style.color = '#28a745';
                    statusCell.style.fontWeight = 'bold';
                } else if (order.nhaphangchinaStatus === 'Đã về kho VN') {
                    statusCell.style.color = '#17a2b8';
                    statusCell.style.fontWeight = 'bold';
                } else if (order.nhaphangchinaStatus === 'Tiếp nhận đơn ký gửi') {
                    statusCell.style.color = '#ffc107';
                    statusCell.style.fontWeight = 'bold';
                } else if (order.nhaphangchinaStatus === 'Đã tìm thấy') {
                    statusCell.style.color = '#6f42c1';
                    statusCell.style.fontWeight = 'bold';
                } else if (order.nhaphangchinaStatus === 'Chưa thêm vào nhaphangchina') {
                    statusCell.style.color = '#dc3545';
                } else if (order.nhaphangchinaStatus === 'Lỗi kết nối') {
                    statusCell.style.color = '#6c757d';
                }
            }
        }
        // Update trackingStatus cell
        const trackingStatusCell = row.querySelector('.col-trackingStatus');
        if (trackingStatusCell) {
            trackingStatusCell.textContent = order.trackingStatus || '';
            trackingStatusCell.title = order.trackingStatus || '';
        }
    }
} 

 