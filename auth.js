// auth.js - Instagram Authentication Module
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
    
    // Public methods
    return {
        // Check if user is authenticated
        isAuthenticated: function() {
            return !!localStorage.getItem(STORAGE_KEYS.accessToken);
        },
        
        // Get access token
        getAccessToken: function() {
            return localStorage.getItem(STORAGE_KEYS.accessToken);
        },
        
        // Get user ID
        getUserId: function() {
            return localStorage.getItem(STORAGE_KEYS.userId);
        },
        
        // Initialize authentication (check token, update UI)
        init: function() {
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
            if (!token) return false;
            
            fetch(`https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${token}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        console.error('Token invalid:', data.error);
                        this.logout();
                        Utils.showNotification('Session expired. Please login again.', 'error');
                    } else {
                        console.log('Token valid:', data);
                        
                        // Update username if available
                        if (data.username) {
                            const usernameElement = document.getElementById('instagram-username');
                            if (usernameElement) usernameElement.textContent = data.username;
                        }
                    }
                })
                .catch(error => {
                    console.error('Validation error:', error);
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
                
            window.location.href = oauthUrl;
        },
        
        // Process authentication from redirect
        handleRedirect: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            
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
            return fetch(API.exchangeToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                
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
            return fetch(API.storeToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: token,
                    user_id: userId,
                    token_type: 'long_lived'
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Token stored in backend:', data);
                return data;
            })
            .catch(error => {
                console.error('Error storing token in backend:', error);
                throw error;
            });
        },
        
        // Logout user
        logout: function() {
            localStorage.removeItem(STORAGE_KEYS.accessToken);
            localStorage.removeItem(STORAGE_KEYS.userId);
            
            Utils.updateUIForLoggedOutUser();
            Utils.showNotification('Disconnected from Instagram');
        },
        
        // Check for login success from redirect
        checkLoginSuccess: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const loginSuccess = urlParams.get("login_success");
            
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