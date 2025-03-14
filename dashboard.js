/**
 * Simplified Instagram DM Dashboard - Only Authentication
 * Handles Instagram OAuth authentication and token storage
 */

// Module pattern to avoid global namespace pollution
const InstaAI = (function() {
    // Configuration
    const config = {
        // API endpoints
        api: {
            exchangeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/exchange-token',
            storeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/store-token'
        },
        // OAuth configuration
        oauth: {
            clientId: '2388890974807228',
            redirectUri: 'https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html',
            // Using correct scope from your Lambda function exchange_token.py
            scope: 'instagram_basic,instagram_manage_messaging'
        },
        // Storage keys
        storage: {
            accessToken: 'instagram_access_token',
            userId: 'instagram_user_id',
            tokenType: 'instagram_token_type',
            oauthState: 'oauth_state'
        }
    };

    // State management
    const state = {
        accessToken: null,
        userId: null,
        isConnected: false
    };

    // ===================================================
    // AUTH MODULE - Handles authentication
    // ===================================================
    const auth = {
        /**
         * Initializes authentication state from stored tokens
         * @returns {boolean} True if authentication found
         */
        init: function() {
            console.log("Initializing auth state");
            
            // Try session storage first (current session)
            let storedToken = sessionStorage.getItem(config.storage.accessToken);
            let storedUserId = sessionStorage.getItem(config.storage.userId);
            
            // If not in session storage, try local storage (persisted)
            if (!storedToken || !storedUserId) {
                storedToken = localStorage.getItem(config.storage.accessToken);
                storedUserId = localStorage.getItem(config.storage.userId);
                
                // If found in localStorage, also set in sessionStorage for this session
                if (storedToken && storedUserId) {
                    sessionStorage.setItem(config.storage.accessToken, storedToken);
                    sessionStorage.setItem(config.storage.userId, storedUserId);
                }
            }
            
            if (storedToken && storedUserId) {
                console.log("Found stored credentials for user:", storedUserId);
                state.accessToken = storedToken;
                state.userId = storedUserId;
                state.isConnected = true;
                
                // Update UI immediately
                ui.updateForLoggedInUser();
                
                // Verify token
                this.verifyToken(storedToken, storedUserId);
                
                return true;
            } else {
                console.log("No stored credentials found");
                ui.showLoginButton();
                return false;
            }
        },
        
        /**
         * Initiates Instagram OAuth flow
         */
        loginWithInstagram: function() {
            // Show connecting notification
            ui.showNotification('Connecting to Instagram...', 'info');
            
            // Generate random state parameter for CSRF protection
            const stateParam = this.generateStateParam();
            
            // Build OAuth URL
            const oauthUrl = "https://www.instagram.com/oauth/authorize" + 
                "?client_id=" + config.oauth.clientId +
                "&redirect_uri=" + encodeURIComponent(config.oauth.redirectUri) +
                "&scope=" + encodeURIComponent(config.oauth.scope) +
                "&response_type=code" +
                "&state=" + stateParam;
            
            // Store the current timestamp for OAuth initiation
            localStorage.setItem('oauth_initiated', Date.now());
            
            // Open in a new window if mobile, otherwise redirect
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                window.location.href = oauthUrl;
            } else {
                // Try to use a popup on desktop
                const authWindow = window.open(oauthUrl, '_blank', 'width=600,height=700');
                
                // Check if popup was blocked and redirect instead
                if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
                    console.log("Popup blocked, redirecting instead");
                    window.location.href = oauthUrl;
                }
            }
        },
        
        /**
         * Generates a random state parameter for OAuth security
         * @returns {string} Random state parameter
         */
        generateStateParam: function() {
            const randomStr = Math.random().toString(36).substring(2, 15);
            const timestamp = Date.now().toString(36);
            const state = `${randomStr}_${timestamp}`;
            
            // Store in sessionStorage to verify later
            sessionStorage.setItem(config.storage.oauthState, state);
            
            return state;
        },
        
        /**
         * Exchanges authorization code for access token
         * @param {string} code - Authorization code
         * @param {string} state - State parameter
         */
        exchangeCodeForToken: function(code, state) {
            // Check state parameter for CSRF protection
            const storedState = sessionStorage.getItem(config.storage.oauthState);
            if (state && storedState && state !== storedState) {
                console.error("State parameter mismatch - possible CSRF attack");
                ui.showNotification('Security error: Authentication request may have been tampered with.', 'error');
                return;
            }
            
            // Show loading indicator
            ui.showNotification('Authenticating with Instagram...', 'info');
            
            apiService.post(config.api.exchangeToken, { code: code })
                .then(data => {
                    if (data.access_token) {
                        state.accessToken = data.access_token;
                        state.userId = data.user_id;
                        state.isConnected = true;
                        
                        console.log("Authentication successful. User ID:", state.userId);
                        
                        // Store token in session and local storage
                        sessionStorage.setItem(config.storage.accessToken, state.accessToken);
                        sessionStorage.setItem(config.storage.userId, state.userId);
                        localStorage.setItem(config.storage.accessToken, state.accessToken);
                        localStorage.setItem(config.storage.userId, state.userId);
                        
                        // Store token in backend for future use
                        this.storeTokenInBackend(state.accessToken, state.userId);
                        
                        // Update UI
                        ui.updateForLoggedInUser();
                        
                        ui.showNotification('Successfully connected to Instagram!');
                    } else {
                        console.error("Failed to get access token:", data.error || data);
                        ui.showNotification('Failed to connect to Instagram: ' + (data.error_message || data.error || 'Unknown error'), 'error');
                    }
                })
                .catch(error => {
                    console.error("Error exchanging code for token:", error);
                    ui.showNotification('Error connecting to Instagram: ' + error.message, 'error');
                });
        },
        
        /**
         * Stores token in backend for future use
         * @param {string} token - Access token
         * @param {string} userId - User ID
         */
        storeTokenInBackend: function(token, userId) {
            console.log("Storing token in backend for user:", userId);
            
            apiService.post(config.api.storeToken, { 
                access_token: token,
                user_id: userId,
                token_type: 'long_lived' // Default token type
            })
            .then(data => {
                console.log("Token storage result:", data);
                if (data.error) {
                    console.error("Error storing token:", data.error);
                } else {
                    console.log('Token stored successfully in backend:', data);
                }
            })
            .catch(error => {
                console.error("Error storing token in backend:", error);
            });
        },
        
        /**
         * Verifies token validity
         * @param {string} token - Access token to verify
         * @param {string} userId - User ID
         */
        verifyToken: function(token, userId) {
            console.log("Verifying token validity for user:", userId);
            
            // Make a simple request to check token validity using Instagram Graph API
            // Using the same endpoint as in your store_token.py Lambda function
            fetch(`https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${token}`)
                .then(response => {
                    console.log("Token validation status:", response.status);
                    return response.json();
                })
                .then(data => {
                    console.log("Token validation response:", data);
                    
                    if (data.error) {
                        // Token is invalid
                        console.error('Token is invalid:', data.error);
                        this.logout();
                        ui.showNotification('Your session has expired. Please login again.', 'error');
                    } else {
                        // Token is valid
                        console.log('Token is valid, user is authenticated');
                        ui.updateConnectionStatus('Connected');
                        
                        // Update username if available
                        if (data.username) {
                            document.getElementById('instagram-username').textContent = data.username;
                        }
                    }
                })
                .catch(error => {
                    // Network error
                    console.error('Network error during validation:', error);
                    ui.updateConnectionStatus('Connection issues');
                });
        },
        
        /**
         * Logs out the user, clears tokens and resets UI
         */
        logout: function() {
            // Clear tokens
            sessionStorage.removeItem(config.storage.accessToken);
            sessionStorage.removeItem(config.storage.userId);
            localStorage.removeItem(config.storage.accessToken);
            localStorage.removeItem(config.storage.userId);
            
            // Reset state
            state.accessToken = null;
            state.userId = null;
            state.isConnected = false;
            
            // Reset UI
            ui.resetForLoggedOutUser();
            
            // Show notification
            ui.showNotification('Successfully logged out');
        },
        
        /**
         * Checks for login success in URL parameters
         */
        checkLoginSuccess: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const loginSuccess = urlParams.get("login_success");
            const error = urlParams.get("error");
            const errorReason = urlParams.get("error_reason");
            const errorDescription = urlParams.get("error_description");
            const code = urlParams.get("code");
            
            // If we have a code directly in the URL, use it (useful for testing)
            if (code) {
                console.log("Found authorization code in URL");
                // Clean URL
                const url = new URL(window.location);
                url.searchParams.delete("code");
                window.history.replaceState({}, document.title, url);
                
                // Exchange code for token
                this.exchangeCodeForToken(code);
                return;
            }
            
            // Handle OAuth errors
            if (error) {
                console.error("OAuth Error:", error, errorReason, errorDescription);
                
                // Clean URL
                const url = new URL(window.location);
                url.searchParams.delete("error");
                url.searchParams.delete("error_reason");
                url.searchParams.delete("error_description");
                window.history.replaceState({}, document.title, url);
                
                // Show appropriate error message
                if (errorReason === "user_denied") {
                    ui.showNotification('Instagram access was denied. Please try again and approve the permissions.', 'error');
                } else {
                    ui.showNotification(`Authentication error: ${errorDescription || error}`, 'error');
                }
                
                return;
            }
            
            if (loginSuccess === "true") {
                // Remove the parameter from URL to prevent issues on refresh
                const url = new URL(window.location);
                url.searchParams.delete("login_success");
                window.history.replaceState({}, document.title, url);
                
                // Show success notification
                ui.showNotification('Successfully connected to Instagram!', 'success');
                
                // Make sure UI is updated
                this.init();
            }
        }
    };

    // ===================================================
    // API SERVICE - Handles API requests
    // ===================================================
    const apiService = {
        /**
         * Makes a POST request
         * @param {string} url - API endpoint
         * @param {Object} data - Request body
         * @returns {Promise} API response
         */
        post: function(url, data = {}) {
            return fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            })
            .then(this.handleResponse);
        },
        
        /**
         * Handles API response
         * @param {Response} response - Fetch API response
         * @returns {Promise} Parsed response data
         */
        handleResponse: function(response) {
            return response.json().then(data => {
                if (!response.ok) {
                    // Create error with details from response
                    const error = new Error(data.error || response.statusText);
                    error.status = response.status;
                    error.responseData = data;
                    throw error;
                }
                return data;
            });
        }
    };

    // ===================================================
    // UI MODULE - Handles user interface updates
    // ===================================================
    const ui = {
        /**
         * Initializes UI elements and event listeners
         */
        init: function() {
            this.setupEventListeners();
            this.addDebugButton();
        },
        
        /**
         * Sets up event listeners for the application
         */
        setupEventListeners: function() {
            // Add handler for login button
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', () => auth.loginWithInstagram());
            }
            
            // Disconnect Instagram button
            const disconnectBtn = document.getElementById('disconnect-instagram');
            if (disconnectBtn) {
                disconnectBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you want to disconnect your Instagram account?')) {
                        auth.logout();
                    }
                });
            }
        },
        
        /**
         * Updates UI elements for logged in user
         */
        updateForLoggedInUser: function() {
            // Hide login button, show user info
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('account-status').textContent = 'Online';
            document.getElementById('connection-status').textContent = 'Connected';
            document.getElementById('disconnect-instagram').removeAttribute('disabled');
            
            // Show the account section
            const connectedAccount = document.getElementById('connected-account');
            if (connectedAccount) {
                connectedAccount.style.display = 'block';
            }
            
            // Update timestamp
            const connectedSince = document.getElementById('connected-since');
            if (connectedSince) {
                connectedSince.textContent = new Date().toLocaleDateString();
            }
        },
        
        /**
         * Updates connection status display
         * @param {string} status - Connection status
         */
        updateConnectionStatus: function(status) {
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) {
                connectionStatus.textContent = status;
            }
        },
        
        /**
         * Resets UI for logged out user
         */
        resetForLoggedOutUser: function() {
            // Show login button
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.style.display = 'block';
            
            // Update status
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
            
            // Disable buttons
            const disconnectBtn = document.getElementById('disconnect-instagram');
            if (disconnectBtn) disconnectBtn.setAttribute('disabled', 'disabled');
            
            // Hide the account section
            const connectedAccount = document.getElementById('connected-account');
            if (connectedAccount) {
                connectedAccount.style.display = 'none';
            }
        },
        
        /**
         * Shows login button
         */
        showLoginButton: function() {
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.style.display = 'block';
                console.log("Login button shown");
            }
        },
        
        /**
         * Shows a notification
         * @param {string} message - Notification message
         * @param {string} type - Notification type (success, error, info, warning)
         */
        showNotification: function(message, type = 'success') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            // Choose icon based on type
            let icon = 'fa-check-circle';
            if (type === 'error') icon = 'fa-exclamation-circle';
            if (type === 'info') icon = 'fa-info-circle';
            if (type === 'warning') icon = 'fa-exclamation-triangle';
            
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas ${icon}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            // Add notification styles if not already added
            this.addNotificationStyles();
            
            // Add to body
            document.body.appendChild(notification);
            
            // Show notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Remove after 5 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);
        },
        
        /**
         * Adds notification styles to document if not already present
         */
        addNotificationStyles: function() {
            // Check if styles are already added
            if (document.getElementById('notification-styles')) {
                return;
            }
            
            // Create style element
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background-color: white;
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                    border-radius: 5px;
                    padding: 15px;
                    transform: translateX(120%);
                    transition: transform 0.3s ease;
                    z-index: 1000;
                }
                
                .notification.show {
                    transform: translateX(0);
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                }
                
                .notification.success i {
                    color: #2ecc71;
                }
                
                .notification.error i {
                    color: #e74c3c;
                }
                
                .notification.info i {
                    color: #3498db;
                }
                
                .notification.warning i {
                    color: #f39c12;
                }
                
                .notification i {
                    margin-right: 10px;
                    font-size: 18px;
                }
            `;
            
            // Add to head
            document.head.appendChild(style);
        },
        
        /**
         * Adds debug button
         */
        addDebugButton: function() {
            // Check if debug button already exists
            if (document.getElementById('debug-auth-button')) {
                return;
            }
            
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
            
            debugButton.addEventListener('click', this.showDebugInfo);
            
            document.body.appendChild(debugButton);
        },
        
        /**
         * Shows debug information
         */
        showDebugInfo: function() {
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
            const sessionToken = sessionStorage.getItem(config.storage.accessToken);
            const sessionUserId = sessionStorage.getItem(config.storage.userId);
            const localToken = localStorage.getItem(config.storage.accessToken);
            const localUserId = localStorage.getItem(config.storage.userId);
            
            // Function to mask token
            const maskToken = (token) => {
                if (!token) return 'undefined';
                if (token.length <= 8) return token;
                return token.substring(0, 4) + '...' + token.substring(token.length - 4);
            };
            
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
                
                <div style="margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px;">
                    <button id="clear-auth-data" style="padding: 8px 16px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear Auth Data</button>
                    <button id="force-login-button" style="padding: 8px 16px; background-color: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">Fix Login Button</button>
                    <button id="reload-page" style="padding: 8px 16px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Reload Page</button>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Add event listeners
            document.getElementById('close-debug').addEventListener('click', function() {
                document.body.removeChild(overlay);
            });
            
            document.getElementById('clear-auth-data').addEventListener('click', function() {
                sessionStorage.removeItem(config.storage.accessToken);
                sessionStorage.removeItem(config.storage.userId);
                localStorage.removeItem(config.storage.accessToken);
                localStorage.removeItem(config.storage.userId);
                
                alert('Authentication data cleared. Page will reload.');
                window.location.reload();
            });
            
            document.getElementById('force-login-button').addEventListener('click', function() {
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) {
                    loginBtn.style.display = 'block';
                    alert('Login button is now visible.');
                }
            });
            
            document.getElementById('reload-page').addEventListener('click', function() {
                window.location.reload();
            });
        }
    };

    // ===================================================
    // PUBLIC API - Methods exposed to the global scope
    // ===================================================
    return {
        // Initialization
        init: function() {
            ui.init();
            auth.checkLoginSuccess();
            auth.init();
        },
        
        // Auth methods
        login: function() {
            auth.loginWithInstagram();
        },
        
        logout: function() {
            auth.logout();
        }
    };
})();

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    InstaAI.init();
});