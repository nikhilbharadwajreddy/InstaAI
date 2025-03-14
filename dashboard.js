// Minimal Instagram Connection Script using Lambda APIs
document.addEventListener('DOMContentLoaded', function() {
    // API endpoints from Lambda functions
    const LAMBDA_APIS = {
        exchangeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/exchange-token',
        storeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/store-token'
    };

    // Initialize
    checkLoginStatus();
    setupEventListeners();
    checkLoginSuccess();
    
    // Check stored tokens
    function checkLoginStatus() {
        let token = localStorage.getItem('instagram_access_token');
        let userId = localStorage.getItem('instagram_user_id');
        
        if (token && userId) {
            console.log("Found stored token for user:", userId);
            updateUIForLoggedInUser();
            verifyToken(token);
            return true;
        } else {
            console.log("No token found");
            document.getElementById('loginBtn').style.display = 'block';
            return false;
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        document.getElementById('loginBtn').addEventListener('click', loginWithInstagram);
        document.getElementById('disconnect-instagram').addEventListener('click', function() {
            if (confirm('Disconnect Instagram account?')) {
                logoutUser();
            }
        });
    }
    
    // Login with Instagram - Using exact OAuth URL from Lambda
    function loginWithInstagram() {
        showNotification('Connecting to Instagram...');
        
        const oauthUrl = "https://www.instagram.com/oauth/authorize" + 
            "?enable_fb_login=0" +
            "&force_authentication=1" +
            "&client_id=2388890974807228" +
            "&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html" +
            "&response_type=code" +
            "&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";
            
        window.location.href = oauthUrl;
    }
    
    // Verify token using same endpoint as in store_token.py Lambda
    function verifyToken(token) {
        fetch(`https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Token invalid:', data.error);
                    logoutUser();
                    showNotification('Session expired. Please login again.', 'error');
                } else {
                    console.log('Token valid:', data);
                    // Update UI with username from response
                    document.getElementById('instagram-username').textContent = data.username || 'Instagram User';
                    
                    // Also store token in backend via Lambda
                    storeTokenInBackend(token, data.user_id);
                }
            })
            .catch(error => {
                console.error('Validation error:', error);
            });
    }
    
    // Store token in backend using Lambda function
    function storeTokenInBackend(token, userId) {
        fetch(LAMBDA_APIS.storeToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: token,
                user_id: userId,
                token_type: 'long_lived'  // Same as in store_token.py
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Token stored in backend:', data);
        })
        .catch(error => {
            console.error('Error storing token in backend:', error);
        });
    }
    
    // Update UI after login
    function updateUIForLoggedInUser() {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('account-status').textContent = 'Online';
        document.getElementById('connection-status').textContent = 'Connected';
        document.getElementById('disconnect-instagram').removeAttribute('disabled');
    }
    
    // Logout user
    function logoutUser() {
        localStorage.removeItem('instagram_access_token');
        localStorage.removeItem('instagram_user_id');
        
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('account-status').textContent = 'Offline';
        document.getElementById('connection-status').textContent = 'Not Connected';
        document.getElementById('instagram-username').textContent = 'N/A';
        document.getElementById('disconnect-instagram').setAttribute('disabled', 'disabled');
        
        showNotification('Disconnected from Instagram');
    }
    
    // Check for login success in URL
    function checkLoginSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get("login_success") === "true") {
            // Clean URL
            const url = new URL(window.location);
            url.searchParams.delete("login_success");
            window.history.replaceState({}, document.title, url);
            
            showNotification('Connected to Instagram!');
        }
    }
    
    // Simple notification
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.backgroundColor = type === 'error' ? '#e74c3c' : '#2ecc71';
        notification.style.color = 'white';
        notification.style.zIndex = '1000';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
});