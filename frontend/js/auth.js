// Authentication Module
const Auth = {
    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('instagram_access_token') && 
               !!localStorage.getItem('instagram_user_id');
    },

    // Get user ID
    getUserId() {
        return localStorage.getItem('instagram_user_id');
    },

    // Get access token
    getAccessToken() {
        return localStorage.getItem('instagram_access_token');
    },

    // Get username
    getUsername() {
        return localStorage.getItem('instagram_username') || 'User';
    },

    // Logout
    logout() {
        localStorage.removeItem('instagram_access_token');
        localStorage.removeItem('instagram_user_id');
        localStorage.removeItem('instagram_token_type');
        localStorage.removeItem('instagram_username');
        window.location.href = 'auth.html';
    },

    // Verify token validity
    async verifyToken() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            const userId = this.getUserId();
            const response = await Utils.apiRequest('getConversations', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }, `?user_id=${userId}`);

            return !!response;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }
};

