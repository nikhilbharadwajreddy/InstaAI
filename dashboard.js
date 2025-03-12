// Authentication and session handling functions

/**
 * Check if user is already logged in on page load
 * and update the UI accordingly
 */
 function checkLoginStatus() {
    // Try session storage first (current session)
    let accessToken = sessionStorage.getItem('instagram_access_token');
    let instagramUserId = sessionStorage.getItem('instagram_user_id');
    
    // If not in session storage, try local storage (persisted)
    if (!accessToken || !instagramUserId) {
        accessToken = localStorage.getItem('instagram_access_token');
        instagramUserId = localStorage.getItem('instagram_user_id');
        
        // If found in localStorage, also set in sessionStorage for this session
        if (accessToken && instagramUserId) {
            sessionStorage.setItem('instagram_access_token', accessToken);
            sessionStorage.setItem('instagram_user_id', instagramUserId);
        }
    }
    
    // If we have valid credentials, update the UI
    if (accessToken && instagramUserId) {
        updateUIForLoggedInUser();
        fetchInstagramData();
        return true;
    }
    
    return false;
}

/**
 * Update UI elements to show logged-in state
 */
function updateUIForLoggedInUser() {
    // Hide login button, show user info
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'none';
    
    // Update account status
    const accountStatus = document.getElementById('account-status');
    if (accountStatus) accountStatus.textContent = 'Online';
    
    const accountName = document.getElementById('account-name');
    if (accountName) accountName.textContent = 'Retrieving...';
    
    // Update connection status in settings
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) connectionStatus.textContent = 'Connected';
    
    // Enable disconnect button
    const disconnectBtn = document.getElementById('disconnect-instagram');
    if (disconnectBtn) disconnectBtn.removeAttribute('disabled');
    
    // Enable message input
    const messageInput = document.getElementById('message-input');
    if (messageInput) messageInput.removeAttribute('disabled');
    
    const sendMessage = document.getElementById('send-message');
    if (sendMessage) sendMessage.removeAttribute('disabled');
    
    // Show loading state for data
    showLoadingState();
    
    // Fetch user profile data and update profile display
    fetchUserProfile();
    
    // Show success notification
    showNotification('Successfully connected to Instagram!');
}

/**
 * Show loading state while fetching data
 */
function showLoadingState() {
    // Show loading indicators in various sections
    const sections = ['dashboard', 'messages', 'comments'];
    
    sections.forEach(section => {
        const container = document.getElementById(`${section}-section`);
        if (container) {
            const loadingElements = container.querySelectorAll('.empty-state');
            loadingElements.forEach(el => {
                el.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading data...</p></div>';
            });
        }
    });
    
    // Update last updated time
    const lastUpdatedTime = document.getElementById('last-updated-time');
    if (lastUpdatedTime) lastUpdatedTime.textContent = 'Updating...';
}

/**
 * Fetch user profile information from Instagram
 */
function fetchUserProfile() {
    const instagramUserId = sessionStorage.getItem('instagram_user_id');
    
    // In a real implementation, you would call your API
    // For demo, we'll use setTimeout to simulate API call
    setTimeout(() => {
        // Update profile data (in real app, this would be from API)
        const accountName = document.getElementById('account-name');
        if (accountName) accountName.textContent = 'Your Business';
        
        const profileImg = document.getElementById('profile-img');
        if (profileImg) profileImg.src = 'https://via.placeholder.com/40';
        
        const instagramUsername = document.getElementById('instagram-username');
        if (instagramUsername) instagramUsername.textContent = 'yourbusiness';
        
        const connectedSince = document.getElementById('connected-since');
        if (connectedSince) connectedSince.textContent = new Date().toLocaleDateString();
    }, 1500);
}

/**
 * Log out the user and reset the UI
 */
function logoutUser() {
    // Clear tokens
    sessionStorage.removeItem('instagram_access_token');
    sessionStorage.removeItem('instagram_user_id');
    localStorage.removeItem('instagram_access_token');
    localStorage.removeItem('instagram_user_id');
    
    // Reset UI
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    
    const accountStatus = document.getElementById('account-status');
    if (accountStatus) accountStatus.textContent = 'Offline';
    
    const accountName = document.getElementById('account-name');
    if (accountName) accountName.textContent = 'Not Connected';
    
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) connectionStatus.textContent = 'Not Connected';
    
    const instagramUsername = document.getElementById('instagram-username');
    if (instagramUsername) instagramUsername.textContent = 'N/A';
    
    const connectedSince = document.getElementById('connected-since');
    if (connectedSince) connectedSince.textContent = 'N/A';
    
    const disconnectBtn = document.getElementById('disconnect-instagram');
    if (disconnectBtn) disconnectBtn.setAttribute('disabled', 'disabled');
    
    // Disable message input
    const messageInput = document.getElementById('message-input');
    if (messageInput) messageInput.setAttribute('disabled', 'disabled');
    
    const sendMessage = document.getElementById('send-message');
    if (sendMessage) sendMessage.setAttribute('disabled', 'disabled');
    
    // Reset data containers
    resetDataContainers();
    
    // Show notification
    showNotification('Successfully logged out');
}

/**
 * Reset all data containers to empty state
 */
function resetDataContainers() {
    // Reset conversations list
    const conversationsList = document.getElementById('conversations-list');
    if (conversationsList) {
        conversationsList.innerHTML = '<p class="empty-state">No conversations yet</p>';
    }
    
    // Reset messages view
    const messagesList = document.getElementById('messages-list');
    if (messagesList) {
        messagesList.innerHTML = '<div class="empty-conversation"><i class="fas fa-comments"></i><p>Select a conversation to view messages</p></div>';
    }
    
    // Reset comments table
    const commentsTableBody = document.getElementById('comments-table-body');
    if (commentsTableBody) {
        commentsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No comments found</td></tr>';
    }
    
    // Reset activity feed
    const activityFeed = document.getElementById('activity-feed');
    if (activityFeed) {
        activityFeed.innerHTML = '<p class="empty-state">No recent activity</p>';
    }
    
    // Reset stats
    const statElements = ['total-messages', 'auto-replies', 'total-comments', 'unique-users'];
    statElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
    });
}

// Add these event listeners to the document ready function
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkLoginStatus();
    
    // Add event listener for login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            const oauthUrl = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=2388890974807228&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";
            window.location.href = oauthUrl;
        });
    }
    
    // Add event listener for logout button
    const disconnectBtn = document.getElementById('disconnect-instagram');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to disconnect your Instagram account?')) {
                logoutUser();
            }
        });
    }
});


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