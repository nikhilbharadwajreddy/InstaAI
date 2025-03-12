/**
 * main.js - Main initialization script for the Instagram DM Automation dashboard
 */

// Import modules (using browser module system)
import { checkLoginStatus, logoutUser } from './auth/instagram-auth.js';
import { showNotification } from './ui/notifications.js';
import { initializeUI, setupTabNavigation } from './ui/ui-updates.js';
import { addDebugButton, checkLoginSuccess } from './ui/debug-tools.js';
import { setupMessageHandlers } from './features/messaging.js';
import { setupAutomationControls } from './features/automation.js';
import { setupCommentHandlers } from './features/comments.js';

// Global state
let appState = {
    isConnected: false,
    isLoading: false,
    accessToken: null,
    userId: null,
    automationEnabled: false
};

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing Instagram DM Automation Dashboard...');
    
    // Initialize UI components
    initializeUI();
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Check authentication status
    const authStatus = checkLoginStatus();
    appState.isConnected = authStatus.isConnected;
    appState.accessToken = authStatus.accessToken;
    appState.userId = authStatus.userId;
    
    // Check if returning from successful login
    checkLoginSuccess();
    
    // Set up feature handlers
    setupMessageHandlers();
    setupCommentHandlers();
    setupAutomationControls();
    
    // Add debug button (development only - remove for production)
    addDebugButton();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Initialization complete!');
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const oauthUrl = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=2388890974807228&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";
            window.location.href = oauthUrl;
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('disconnect-instagram');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to disconnect your Instagram account?')) {
                logoutUser();
                appState.isConnected = false;
                appState.accessToken = null;
                appState.userId = null;
                showNotification('Successfully disconnected from Instagram');
            }
        });
    }
    
    // Refresh data button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (appState.isConnected) {
                refreshData();
            } else {
                showNotification('Please connect your Instagram account first', 'error');
            }
        });
    }
}

/**
 * Refresh dashboard data
 */
function refreshData() {
    // Set loading state
    appState.isLoading = true;
    document.getElementById('refreshData').classList.add('fa-spin');
    
    // Update last updated time
    document.getElementById('last-updated-time').textContent = 'Updating...';
    
    // Import data module dynamically
    import('./data/api-client.js')
        .then(module => {
            return module.fetchInstagramData(appState.accessToken, appState.userId);
        })
        .then(data => {
            // Update UI with new data
            import('./ui/ui-updates.js').then(ui => {
                ui.updateDashboardWithData(data);
                
                // Reset loading state
                appState.isLoading = false;
                document.getElementById('refreshData').classList.remove('fa-spin');
                document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();
                
                showNotification('Data refreshed successfully!');
            });
        })
        .catch(error => {
            console.error('Error refreshing data:', error);
            showNotification('Failed to refresh data', 'error');
            
            // Reset loading state
            appState.isLoading = false;
            document.getElementById('refreshData').classList.remove('fa-spin');
        });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Force login button visibility on page load
window.addEventListener('load', () => {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && !appState.isConnected) {
        loginBtn.style.display = 'block';
    }
});

// Export app state for other modules to use
export { appState };