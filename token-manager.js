// token-manager.js - Enhanced Token Management for Instagram
const TokenManager = (function() {
    // API endpoints
    const API = {
        checkUsername: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/check-username',
        storeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/store-token',
        exchangeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/exchange-token',
        deleteUser: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/delete-user'
    };
    
    // Storage keys
    const STORAGE = {
        accessToken: 'instagram_access_token',
        userId: 'instagram_user_id',
        username: 'instagram_username',
        tokenExpiryDate: 'instagram_token_expiry'
    };
    
    // Token expiration time (59 days in milliseconds)
    const TOKEN_EXPIRY_MS = 59 * 24 * 60 * 60 * 1000;
    
    // Calculate expiry date from now
    function calculateExpiryDate() {
        return new Date(Date.now() + TOKEN_EXPIRY_MS).toISOString();
    }
    
    // Check if token is expired
    function isTokenExpired() {
        const expiryDateStr = localStorage.getItem(STORAGE.tokenExpiryDate);
        if (!expiryDateStr) return true;
        
        const expiryDate = new Date(expiryDateStr);
        return Date.now() > expiryDate.getTime();
    }
    
    // Store token data locally
    function storeLocalTokenData(data) {
        localStorage.setItem(STORAGE.accessToken, data.access_token);
        localStorage.setItem(STORAGE.userId, data.user_id);
        
        if (data.username) {
            localStorage.setItem(STORAGE.username, data.username);
        }
        
        // Set expiry date (59 days from now)
        localStorage.setItem(STORAGE.tokenExpiryDate, calculateExpiryDate());
    }
    
    // Clear local token data
    function clearLocalTokenData() {
        localStorage.removeItem(STORAGE.accessToken);
        localStorage.removeItem(STORAGE.userId);
        localStorage.removeItem(STORAGE.username);
        localStorage.removeItem(STORAGE.tokenExpiryDate);
    }
    
    // Public methods
    return {
        // Check if user is already authenticated with valid token
        isAuthenticated: function() {
            const hasToken = !!localStorage.getItem(STORAGE.accessToken);
            const hasUserId = !!localStorage.getItem(STORAGE.userId);
            
            // If we don't have token or user ID, not authenticated
            if (!hasToken || !hasUserId) return false;
            
            // Check if token is expired
            if (isTokenExpired()) {
                console.log("Token is expired, clearing local data");
                clearLocalTokenData();
                return false;
            }
            
            return true;
        },
        
        // Get access token
        getAccessToken: function() {
            return localStorage.getItem(STORAGE.accessToken);
        },
        
        // Get user ID
        getUserId: function() {
            return localStorage.getItem(STORAGE.userId);
        },
        
        // Get username
        getUsername: function() {
            return localStorage.getItem(STORAGE.username);
        },
        
        // Check if username exists in our database
        checkUsername: function(username) {
            return fetch(`${API.checkUsername}?username=${encodeURIComponent(username)}`)
                .then(response => response.json())
                .then(data => {
                    // If the API doesn't exist yet, we can modify to return a mock response
                    if (data.error && data.error.includes('Not Found')) {
                        console.warn('Check username API not implemented yet, skipping check');
                        return { exists: false };
                    }
                    
                    if (data.exists && data.token_valid && data.access_token) {
                        // If username exists and token is valid, store it locally
                        storeLocalTokenData({
                            access_token: data.access_token,
                            user_id: data.user_id,
                            username: username
                        });
                        
                        return {
                            exists: true,
                            valid: true
                        };
                    }
                    
                    return {
                        exists: !!data.exists,
                        valid: !!data.token_valid
                    };
                })
                .catch(error => {
                    console.error('Error checking username:', error);
                    // Return default value on error
                    return { exists: false, error: error.message };
                });
        },
        
        // Start Instagram authentication flow
        beginAuthentication: function(username) {
            // Store the username if provided
            if (username) {
                localStorage.setItem(STORAGE.username, username);
            }
            
            // Build the OAuth URL
            const oauthUrl = "https://www.instagram.com/oauth/authorize" + 
                "?enable_fb_login=0" +
                "&force_authentication=1" +
                "&client_id=2388890974807228" +
                "&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html" +
                "&response_type=code" +
                "&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";
            
            // Redirect to Instagram auth
            window.location.href = oauthUrl;
        },
        
        // Process the authentication code
        processAuthCode: function(code) {
            if (!code) {
                return Promise.reject('No authorization code provided');
            }
            
            // Exchange the code for a token
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
                    throw new Error('Invalid response from authentication server');
                }
                
                // Store the token locally
                storeLocalTokenData(data);
                
                // Store the token in our backend with username if available
                const username = localStorage.getItem(STORAGE.username);
                
                this.storeTokenInBackend(data.access_token, data.user_id, username);
                
                return data;
            });
        },
        
        // Store token in backend with additional metadata
        storeTokenInBackend: function(token, userId, username) {
            // Create payload
            const payload = {
                access_token: token,
                user_id: userId,
                token_type: 'long_lived',
                is_deleted: false
            };
            
            // Add username if available
            if (username) {
                payload.username = username;
            }
            
            // Add expiry date
            payload.expiry_date = calculateExpiryDate();
            
            // Call the API
            return fetch(API.storeToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error storing token in backend:', data.error);
                    return { success: false, error: data.error };
                }
                
                return { success: true, data: data };
            })
            .catch(error => {
                console.error('Error storing token in backend:', error);
                return { success: false, error: error.message };
            });
        },
        
        // Mark user data as deleted in backend
        markAsDeleted: function() {
            const userId = localStorage.getItem(STORAGE.userId);
            
            if (!userId) {
                return Promise.reject('No user ID found');
            }
            
            return fetch(API.deleteUser, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    is_deleted: true
                })
            })
            .then(response => response.json())
            .then(data => {
                // Clear local data regardless of backend result
                clearLocalTokenData();
                
                if (data.error) {
                    return { success: false, error: data.error };
                }
                
                return { success: true };
            })
            .catch(error => {
                // Also clear local data on error
                clearLocalTokenData();
                return { success: false, error: error.message };
            });
        },
        
        // Logout user (clear tokens)
        logout: function() {
            clearLocalTokenData();
        },
        
        // Get days until token expiry
        getDaysUntilExpiry: function() {
            const expiryDateStr = localStorage.getItem(STORAGE.tokenExpiryDate);
            if (!expiryDateStr) return 0;
            
            const expiryDate = new Date(expiryDateStr);
            const now = new Date();
            
            // Calculate days remaining
            const daysRemaining = Math.max(0, Math.floor((expiryDate - now) / (24 * 60 * 60 * 1000)));
            
            return daysRemaining;
        }
    };
})();