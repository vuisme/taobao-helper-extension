// Debug helper for Pinduoduo authentication
// This file can be injected into the page to help debug authentication issues

console.log('=== Pinduoduo Debug Helper Loaded ===');

// Function to check all cookies
function checkAllCookies() {
    console.log('=== Checking All Cookies ===');
    console.log('Document cookies:', document.cookie);
    
    // Check specific Pinduoduo cookies
    const pddCookies = [
        'pdd_user_id',
        'pdduid', 
        'PDDAccessToken',
        'anti_content',
        'pdd_vds',
        'pdd_wsess'
    ];
    
    pddCookies.forEach(cookieName => {
        const match = document.cookie.match(new RegExp(`${cookieName}=([^;]+)`));
        if (match) {
            console.log(`${cookieName}: ${match[1].substring(0, 20)}...`);
        } else {
            console.log(`${cookieName}: NOT FOUND`);
        }
    });
}

// Function to check localStorage
function checkLocalStorage() {
    console.log('=== Checking LocalStorage ===');
    const keys = Object.keys(localStorage);
    console.log('All localStorage keys:', keys);
    
    // Check for potential auth tokens
    const authKeys = keys.filter(key => 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('auth') ||
        key.toLowerCase().includes('pdd')
    );
    
    authKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`${key}: ${value ? value.substring(0, 20) + '...' : 'empty'}`);
    });
}

// Function to check window objects
function checkWindowObjects() {
    console.log('=== Checking Window Objects ===');
    
    if (window._$) {
        console.log('window._$ exists:', Object.keys(window._$));
        if (window._$.pdduid) {
            console.log('window._$.pdduid:', window._$.pdduid);
        }
    }
    
    if (window.pdduid) {
        console.log('window.pdduid:', window.pdduid);
    }
    
    if (window.anti_content) {
        console.log('window.anti_content:', window.anti_content.substring(0, 20) + '...');
    }
}

// Function to test API access
function testAPIAccess() {
    console.log('=== Testing API Access ===');
    
    const pdduid = (document.cookie.match(/pdd_user_id=(\d+)/) || [])[1];
    if (!pdduid) {
        console.error('No pdduid found, cannot test API');
        return;
    }
    
    const url = `https://mobile.yangkeduo.com/proxy/api/api/aristotle/order_list_v3?pdduid=${pdduid}`;
    const body = JSON.stringify({
        type: "all",
        page: 1,
        origin_host_name: "mobile.yangkeduo.com",
        scene: "order_list_h5",
        page_from: 0,
        pay_front_supports: [],
        anti_content: "",
        size: 10,
        offset: "",
    });
    
    console.log('Testing API URL:', url);
    console.log('Request body:', body);
    
    fetch(url, {
        method: 'POST',
        headers: {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
        },
        body: body,
        credentials: 'include',
    })
    .then(res => {
        console.log('API Response status:', res.status);
        console.log('API Response headers:', res.headers);
        return res.json();
    })
    .then(data => {
        console.log('API Response data:', data);
    })
    .catch(err => {
        console.error('API Test failed:', err);
    });
}

// Run all checks
function runAllChecks() {
    checkAllCookies();
    checkLocalStorage();
    checkWindowObjects();
    testAPIAccess();
}

// Make functions available globally
window.pddDebug = {
    checkAllCookies,
    checkLocalStorage,
    checkWindowObjects,
    testAPIAccess,
    runAllChecks
};

console.log('Debug functions available at window.pddDebug');
console.log('Run: window.pddDebug.runAllChecks() to check everything'); 