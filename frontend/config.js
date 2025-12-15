// API Configuration
const API_CONFIG = {
    BASE_URL: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod',
    ENDPOINTS: {
        exchangeToken: '/exchange-token',
        storeToken: '/store-token',
        getConversations: '/get-conversations',
        getMessages: '/get-messages',
        sendMessage: '/send-message',
        getEvents: '/get-events',
        deleteUser: '/delete-user',
        webhook: '/webhook'
    },
    INSTAGRAM: {
        CLIENT_ID: '2388890974807228',
        // Redirect URI - will be set dynamically based on environment
        REDIRECT_URI: (() => {
            // Use Vercel URL in production, localhost for development
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                return 'http://localhost:8000/auth-callback.html';
            }
            // Vercel will replace this with actual deployment URL
            return window.location.origin + '/auth-callback.html';
        })(),
        SCOPE: 'instagram_graph_user_profile,instagram_graph_user_media'
    }
};

// Helper to get full API URL
API_CONFIG.getUrl = function(endpoint) {
    return this.BASE_URL + this.ENDPOINTS[endpoint];
};

