// Global variables
let accessToken = null;
let instagramUserId = null;
let userProfile = null;
let messages = [];
let comments = [];
let automationEnabled = false;

// API endpoints
const API_ENDPOINTS = {
    exchangeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/exchange-token',
    webhook: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/webhook',
    storeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/store-token',
    sendMessage: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/send-message',
    getEvents: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-events'
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the UI
    initializeUI();
    
    // Check if user is already logged in (has a stored token)
    checkLoginStatus();
    
    // Add event listeners for navigation
    setupEventListeners();
    
    // Add debug button to page
    addDebugButton();
    
    // Check if coming from successful login redirect
    checkLoginSuccess();
    
    // Add connection recovery mechanism
    setupConnectionRecovery();
    
    // Add loading state protection
    setupLoadingStateProtection();
});