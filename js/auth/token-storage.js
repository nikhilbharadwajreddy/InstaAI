/**
 * token-storage.js - Token storage and retrieval module
 */

// Constants
const TOKEN_KEY = 'instagram_access_token';
const USER_ID_KEY = 'instagram_user_id';
const CONNECTION_DATE_KEY = 'instagram_connected_since';

/**
 * Store Instagram authentication token
 * @param {string} token - Instagram access token
 * @param {string} userId - Instagram user ID
 * @returns {boolean} Success status
 */
function storeToken(token, userId) {
    try {
        if (!token || !userId) {
            console.error('Cannot store empty token or user ID');
            return false;
        }
        
        // Store in session storage (current session)
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_ID_KEY, userId);
        
        // Store in local storage (persisted across sessions)
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_ID_KEY, userId);
        
        // Store connection date
        const connectionDate = new Date().toISOString();
        localStorage.setItem(CONNECTION_DATE_KEY, connectionDate);
        
        console.log('Token stored successfully');
        return true;
    } catch (error) {
        console.error('Error storing token:', error);
        return false;
    }
}

/**
 * Retrieve stored authentication token and user ID
 * @returns {Object} Object containing accessToken and userId
 */
function retrieveToken() {
    try {
        // Try session storage first (current session)
        let accessToken = sessionStorage.getItem(TOKEN_KEY);
        let userId = sessionStorage.getItem(USER_ID_KEY);
        
        // If not in session storage, try local storage (persisted)
        if (!accessToken || !userId) {
            accessToken = localStorage.getItem(TOKEN_KEY);
            userId = localStorage.getItem(USER_ID_KEY);
            
            // If found in localStorage, also set in sessionStorage for this session
            if (accessToken && userId) {
                sessionStorage.setItem(TOKEN_KEY, accessToken);
                sessionStorage.setItem(USER_ID_KEY, userId);
            }
        }
        
        return {
            accessToken: accessToken,
            userId: userId,
            connectionDate: localStorage.getItem(CONNECTION_DATE_KEY)
        };
    } catch (error) {
        console.error('Error retrieving token:', error);
        return {
            accessToken: null,
            userId: null,
            connectionDate: null
        };
    }
}

/**
 * Clear all stored tokens
 * @returns {boolean} Success status
 */
function clearTokens() {
    try {
        // Clear from session storage
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_ID_KEY);
        
        // Clear from local storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(CONNECTION_DATE_KEY);
        
        console.log('Tokens cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing tokens:', error);
        return false;
    }
}

/**
 * Get date when Instagram was connected
 * @returns {string|null} ISO date string or null if not available
 */
function getConnectionDate() {
    return localStorage.getItem(CONNECTION_DATE_KEY);
}

/**
 * Format connection date for display
 * @returns {string} Formatted date string
 */
function getFormattedConnectionDate() {
    const dateStr = getConnectionDate();
    
    if (!dateStr) {
        return 'N/A';
    }
    
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting connection date:', error);
        return 'Unknown';
    }
}

// Export functions for use in other modules
export {
    storeToken,
    retrieveToken,
    clearTokens,
    getConnectionDate,
    getFormattedConnectionDate
};