// Add these functions to your dashboard.js file

/**
 * Debug function to check authentication status
 * Add a small debug button in the bottom right corner
 */
 function addDebugButton() {
    const debugButton = document.createElement('button');
    debugButton.textContent = "Debug Auth";
    debugButton.id = "debug-auth-button";
    debugButton.style.position = "fixed";
    debugButton.style.bottom = "10px";
    debugButton.style.right = "10px";
    debugButton.style.padding = "5px 10px";
    debugButton.style.backgroundColor = "#f39c12";
    debugButton.style.color = "white";
    debugButton.style.border = "none";
    debugButton.style.borderRadius = "5px";
    debugButton.style.fontSize = "12px";
    debugButton.style.cursor = "pointer";
    debugButton.style.zIndex = "9999";
    
    debugButton.addEventListener('click', checkAuthDebug);
    
    document.body.appendChild(debugButton);
}

/**
 * Check authentication status and display debug information
 */
function checkAuthDebug() {
    // Create debug overlay
    const overlay = document.createElement('div');
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0,0,0,0.8)";
    overlay.style.color = "white";
    overlay.style.padding = "20px";
    overlay.style.boxSizing = "border-box";
    overlay.style.overflow = "auto";
    overlay.style.zIndex = "10000";
    overlay.style.fontFamily = "monospace";
    
    // Get auth data
    const sessionToken = sessionStorage.getItem('instagram_access_token');
    const sessionUserId = sessionStorage.getItem('instagram_user_id');
    const localToken = localStorage.getItem('instagram_access_token');
    const localUserId = localStorage.getItem('instagram_user_id');
    
    // Create content
    overlay.innerHTML = `
        <h2 style="color: #3498db;">Authentication Debug</h2>
        <button id="close-debug" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
        
        <h3>Session Storage:</h3>
        <pre>instagram_access_token: ${sessionToken ? '✓ ' + maskToken(sessionToken) : '✗ Not found'}</pre>
        <pre>instagram_user_id: ${sessionUserId || 'Not found'}</pre>
        
        <h3>Local Storage:</h3>
        <pre>instagram_access_token: ${localToken ? '✓ ' + maskToken(localToken) : '✗ Not found'}</pre>
        <pre>instagram_user_id: ${localUserId || 'Not found'}</pre>
        
        <h3>UI State:</h3>
        <pre>Login button visible: ${document.getElementById('loginBtn').style.display === 'none' ? 'No' : 'Yes'}</pre>
        <pre>Account status: ${document.getElementById('account-status').textContent}</pre>
        
        <div style="margin-top: 20px;">
            <button id="clear-auth-data" style="padding: 8px 16px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">Clear Auth Data</button>
            <button id="force-login-button" style="padding: 8px 16px; background-color: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">Fix Login Button</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('close-debug').addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    document.getElementById('clear-auth-data').addEventListener('click', function() {
        sessionStorage.removeItem('instagram_access_token');
        sessionStorage.removeItem('instagram_user_id');
        localStorage.removeItem('instagram_access_token');
        localStorage.removeItem('instagram_user_id');
        
        alert('Authentication data cleared. Page will reload.');
        window.location.reload();
    });
    
    document.getElementById('force-login-button').addEventListener('click', function() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.style.display = 'block';
            alert('Login button is now visible.');
            document.body.removeChild(overlay);
        }
    });
}

/**
 * Mask token for security
 */
function maskToken(token) {
    if (!token) return 'undefined';
    if (token.length <= 8) return token;
    
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
}

// Check if we came from a successful login
function checkLoginSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get("login_success");
    
    if (loginSuccess === "true") {
        // Remove the parameter from URL to prevent issues on refresh
        const url = new URL(window.location);
        url.searchParams.delete("login_success");
        window.history.replaceState({}, document.title, url);
        
        // Show success notification
        showNotification('Successfully connected to Instagram!', 'success');
    }
}

// Call debug functions after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add debug button to page
    addDebugButton();
    
    // Check if coming from successful login redirect
    checkLoginSuccess();
    
    // Original code...
});

// Force the login button to be visible if needed
function forceShowLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && !sessionStorage.getItem('instagram_access_token') && !localStorage.getItem('instagram_access_token')) {
        loginBtn.style.display = 'block';
    }
}

// Run this as early as possible
window.addEventListener('load', forceShowLoginButton);