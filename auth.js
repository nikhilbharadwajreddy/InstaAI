// auth.js - Instagram Authentication Module (Debug Version)
const Auth = (function() {
    // API endpoints
    const API = {
        exchangeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/exchange-token',
        storeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/store-token'
    };
    
    // Storage keys
    const STORAGE_KEYS = {
        accessToken: 'instagram_access_token',
        userId: 'instagram_user_id'
    };

    // Debug logging function
    function logDebug(title, data) {
        console.group(`🔐 AUTH DEBUG: ${title}`);
        console.log(data);
        console.groupEnd();
        
        // Display debug on page if debug container exists
        const debugContainer = document.getElementById('debug-container');
        if (debugContainer) {
            const debugEntry = document.createElement('div');
            debugEntry.className = 'debug-entry';
            debugEntry.style.marginBottom = '10px';
            debugEntry.style.paddingBottom = '10px';
            debugEntry.style.borderBottom = '1px dashed #555';
            
            const debugTitle = document.createElement('h4');
            debugTitle.textContent = title;
            debugTitle.style.color = '#f39c12';
            debugTitle.style.marginBottom = '5px';
            
            const debugContent = document.createElement('pre');
            debugContent.style.margin = '0';
            debugContent.style.whiteSpace = 'pre-wrap';
            
            // If data contains token, mask it for security
            let displayData = data;
            if (typeof data === 'object' && data !== null) {
                // Create a copy to avoid modifying the original
                displayData = JSON.parse(JSON.stringify(data));
                
                // Mask token if present
                if (displayData.token) {
                    displayData.token = displayData.token.substring(0, 5) + '...' + 
                        displayData.token.substring(displayData.token.length - 5);
                }
                
                // Mask access_token if present
                if (displayData.access_token) {
                    displayData.access_token = displayData.access_token.substring(0, 5) + '...' + 
                        displayData.access_token.substring(displayData.access_token.length - 5);
                }
            }
            
            debugContent.textContent = typeof displayData === 'object' ? 
                JSON.stringify(displayData, null, 2) : String(displayData);
            
            debugEntry.appendChild(debugTitle);
            debugEntry.appendChild(debugContent);
            
            debugContainer.appendChild(debugEntry);
            debugContainer.scrollTop = debugContainer.scrollHeight;
        }
    }
    
    // Public methods
    return {
        // Check if user is authenticated
        isAuthenticated: function() {
            const hasToken = !!localStorage.getItem(STORAGE_KEYS.accessToken);
            logDebug('isAuthenticated Check', { hasToken });
            return hasToken;
        },
        
        // Get access token
        getAccessToken: function() {
            const token = localStorage.getItem(STORAGE_KEYS.accessToken);
            logDebug('getAccessToken', { 
                hasToken: !!token, 
                token: token ? token.substring(0, 5) + '...' + token.substring(token.length - 5) : null 
            });
            return token;
        },
        
        // Get user ID
        getUserId: function() {
            const userId = localStorage.getItem(STORAGE_KEYS.userId);
            logDebug('getUserId', { userId });
            return userId;
        },
        
        // Initialize authentication (check token, update UI)
        init: function() {
            logDebug('Initializing Auth Module', {
                hasToken: !!localStorage.getItem(STORAGE_KEYS.accessToken),
                hasUserId: !!localStorage.getItem(STORAGE_KEYS.userId)
            });
            
            if (this.isAuthenticated()) {
                this.verifyToken();
                Utils.updateUIForLoggedInUser();
                return true;
            } else {
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.style.display = 'block';
                return false;
            }
        },
        
        // Verify token with Instagram API
        verifyToken: function() {
            const token = this.getAccessToken();
            if (!token) {
                logDebug('verifyToken Failed', { reason: 'No token found' });
                return false;
            }
            
            logDebug('Verifying Token', { tokenPrefix: token.substring(0, 5) });
            
            fetch(`https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${token}`)
                .then(response => {
                    logDebug('Token Verification Response', { 
                        status: response.status,
                        statusText: response.statusText
                    });
                    return response.json();
                })
                .then(data => {
                    logDebug('Token Verification Data', data);
                    
                    if (data.error) {
                        console.error('Token invalid:', data.error);
                        this.logout();
                        Utils.showNotification('Session expired. Please login again.', 'error');
                    } else {
                        console.log('Token valid:', data);
                        
                        // Check if user_id in response matches stored user_id
                        const storedUserId = this.getUserId();
                        if (data.user_id && storedUserId && data.user_id !== storedUserId) {
                            logDebug('User ID Mismatch', {
                                stored: storedUserId,
                                received: data.user_id
                            });
                            // Update stored user_id
                            localStorage.setItem(STORAGE_KEYS.userId, data.user_id);
                        }
                        
                        // Update username if available
                        if (data.username) {
                            const usernameElement = document.getElementById('instagram-username');
                            if (usernameElement) usernameElement.textContent = data.username;
                        }
                        
                        // Check if token needs to be stored in backend
                        this.storeTokenInBackend(token, data.user_id);
                    }
                })
                .catch(error => {
                    logDebug('Token Verification Error', { 
                        message: error.message,
                        stack: error.stack
                    });
                });
        },
        
        // Login with Instagram
        login: function() {
            Utils.showNotification('Connecting to Instagram...');
            
            const oauthUrl = "https://www.instagram.com/oauth/authorize" + 
                "?enable_fb_login=0" +
                "&force_authentication=1" +
                "&client_id=2388890974807228" +
                "&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html" +
                "&response_type=code" +
                "&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";
            
            logDebug('Initiating OAuth Login', {
                oauthUrl
            });
                
            window.location.href = oauthUrl;
        },
        
        // Process authentication from redirect
        handleRedirect: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            
            logDebug('Checking Redirect Parameters', {
                hasCode: !!code,
                hasError: !!error,
                error: error || 'None'
            });
            
            if (error) {
                Utils.showNotification('Authentication failed: ' + error, 'error');
                return;
            }
            
            if (!code) {
                return;
            }
            
            // Exchange code for token
            this.exchangeCodeForToken(code);
        },
        
        // Exchange authorization code for access token
        exchangeCodeForToken: function(code) {
            logDebug('Exchanging Code for Token', {
                codePrefix: code.substring(0, 5) + '...',
                endpoint: API.exchangeToken
            });
            
            return fetch(API.exchangeToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            })
            .then(response => {
                logDebug('Token Exchange Response', {
                    status: response.status,
                    statusText: response.statusText
                });
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    logDebug('Token Exchange Error', data.error);
                    throw new Error(data.error);
                }
                
                logDebug('Token Exchange Success', {
                    hasAccessToken: !!data.access_token,
                    hasUserId: !!data.user_id,
                    userId: data.user_id,
                    tokenType: data.token_type || 'unknown'
                });
                
                if (!data.access_token || !data.user_id) {
                    throw new Error('Invalid response from server');
                }
                
                // Store in localStorage
                localStorage.setItem(STORAGE_KEYS.accessToken, data.access_token);
                localStorage.setItem(STORAGE_KEYS.userId, data.user_id);
                
                // Store in backend
                this.storeTokenInBackend(data.access_token, data.user_id);
                
                return data;
            });
        },
        
        // Store token in backend
        storeTokenInBackend: function(token, userId) {
            if (!token || !userId) {
                logDebug('Store Token Failed', {
                    reason: 'Missing token or userId',
                    hasToken: !!token,
                    hasUserId: !!userId
                });
                return Promise.reject('Missing token or userId');
            }
            
            logDebug('Storing Token in Backend', {
                userId,
                tokenPrefix: token.substring(0, 5) + '...',
                endpoint: API.storeToken
            });
            
            return fetch(API.storeToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: token,
                    user_id: userId,
                    token_type: 'long_lived'
                })
            })
            .then(response => {
                logDebug('Store Token Response', {
                    status: response.status,
                    statusText: response.statusText
                });
                return response.json();
            })
            .then(data => {
                logDebug('Store Token Result', data);
                
                if (data.error) {
                    console.error('Error storing token in backend:', data.error);
                    return { success: false, error: data.error };
                }
                
                console.log('Token stored successfully in backend:', data);
                return { success: true, data };
            })
            .catch(error => {
                logDebug('Store Token Error', {
                    message: error.message,
                    stack: error.stack
                });
                return { success: false, error: error.message };
            });
        },
        
        // Logout user
        logout: function() {
            logDebug('Logging Out User', {
                hadToken: !!localStorage.getItem(STORAGE_KEYS.accessToken),
                hadUserId: !!localStorage.getItem(STORAGE_KEYS.userId)
            });
            
            localStorage.removeItem(STORAGE_KEYS.accessToken);
            localStorage.removeItem(STORAGE_KEYS.userId);
            
            Utils.updateUIForLoggedOutUser();
            Utils.showNotification('Disconnected from Instagram');
        },
        
        // Check for login success from redirect
        checkLoginSuccess: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const loginSuccess = urlParams.get("login_success");
            
            logDebug('Checking Login Success Flag', {
                loginSuccess
            });
            
            if (loginSuccess === "true") {
                // Clean URL
                const url = new URL(window.location);
                url.searchParams.delete("login_success");
                window.history.replaceState({}, document.title, url);
                
                Utils.showNotification('Connected to Instagram!');
                this.init();
            }
        }
    };
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add a debug container if it doesn't exist
    if (!document.getElementById('debug-container')) {
        const debugContainer = document.createElement('div');
        debugContainer.id = 'debug-container';
        debugContainer.style.position = 'fixed';
        debugContainer.style.bottom = '10px';
        debugContainer.style.right = '10px';
        debugContainer.style.width = '400px';
        debugContainer.style.height = '300px';
        debugContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
        debugContainer.style.color = 'white';
        debugContainer.style.padding = '10px';
        debugContainer.style.overflow = 'auto';
        debugContainer.style.zIndex = '9999';
        debugContainer.style.fontSize = '12px';
        debugContainer.style.fontFamily = 'monospace';
        debugContainer.style.borderRadius = '5px';
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close Debug';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '5px';
        closeBtn.style.right = '5px';
        closeBtn.style.padding = '2px 5px';
        closeBtn.style.backgroundColor = '#f39c12';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '3px';
        closeBtn.style.cursor = 'pointer';
        
        closeBtn.addEventListener('click', function() {
            debugContainer.style.display = 'none';
        });
        
        debugContainer.appendChild(closeBtn);
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Debug Console';
        title.style.marginBottom = '10px';
        title.style.borderBottom = '1px solid #aaa';
        title.style.paddingBottom = '5px';
        
        debugContainer.appendChild(title);
        
        // Add to body
        document.body.appendChild(debugContainer);
    }
    
    // Handle auth-related buttons
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            Auth.login();
        });
    }
    
    const logoutBtn = document.getElementById('disconnect-instagram');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to disconnect your Instagram account?')) {
                Auth.logout();
            }
        });
    }
    
    // Check for redirect parameters
    Auth.handleRedirect();
    
    // Check for login success
    Auth.checkLoginSuccess();
    
    // Initialize auth state
    Auth.init();
});