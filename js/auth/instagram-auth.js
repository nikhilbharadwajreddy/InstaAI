/**
 * instagram-auth.js - Instagram authentication module
 */

 import { storeToken, retrieveToken, clearTokens } from './token-storage.js';
 import { updateUIForLoggedInUser, resetUIForLoggedOut } from '../ui/ui-updates.js';
 import { showNotification } from '../ui/notifications.js';
 import { API_ENDPOINTS } from '../data/api-client.js';
 
 /**
  * Check if user is already logged in
  * @returns {Object} Authentication status information
  */
 function checkLoginStatus() {
     console.log('Checking authentication status...');
     
     // Get stored tokens
     const authData = retrieveToken();
     
     if (authData.accessToken && authData.userId) {
         console.log('User is authenticated');
         
         // Update UI for logged in state
         updateUIForLoggedInUser(authData);
         
         return {
             isConnected: true,
             accessToken: authData.accessToken,
             userId: authData.userId
         };
     } else {
         console.log('User is not authenticated');
         
         // Make sure login button is visible
         forceShowLoginButton();
         
         return {
             isConnected: false,
             accessToken: null,
             userId: null
         };
     }
 }
 
 /**
  * Force the login button to be visible
  */
 function forceShowLoginButton() {
     const loginBtn = document.getElementById('loginBtn');
     if (loginBtn) {
         loginBtn.style.display = 'block';
         console.log('Login button forced visible');
     }
 }
 
 /**
  * Exchange OAuth code for access token
  * @param {string} code - OAuth authorization code
  * @returns {Promise} Promise that resolves with token data
  */
 function exchangeCodeForToken(code) {
     console.log('Exchanging code for token...');
     
     return fetch(API_ENDPOINTS.exchangeToken, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ code: code })
     })
     .then(response => {
         if (!response.ok) {
             throw new Error(`HTTP error! Status: ${response.status}`);
         }
         return response.json();
     })
     .then(data => {
         if (data.access_token) {
             console.log('Token exchange successful');
             
             // Store token locally
             storeToken(data.access_token, data.user_id);
             
             // Store token in backend for future use
             storeTokenInBackend(data.access_token, data.user_id);
             
             // Update UI
             updateUIForLoggedInUser({
                 accessToken: data.access_token,
                 userId: data.user_id
             });
             
             showNotification('Successfully connected to Instagram!');
             
             return {
                 success: true,
                 accessToken: data.access_token,
                 userId: data.user_id
             };
         } else {
             console.error('Token exchange failed:', data.error || 'Unknown error');
             showNotification('Failed to connect to Instagram', 'error');
             
             return {
                 success: false,
                 error: data.error || 'Failed to exchange code for token'
             };
         }
     })
     .catch(error => {
         console.error('Error exchanging code for token:', error);
         showNotification('Error connecting to Instagram', 'error');
         
         return {
             success: false,
             error: error.message
         };
     });
 }
 
 /**
  * Store access token in backend
  * @param {string} token - Instagram access token
  * @param {string} userId - Instagram user ID
  * @returns {Promise} Promise that resolves with storage result
  */
 function storeTokenInBackend(token, userId) {
     console.log('Storing token in backend...');
     
     return fetch(API_ENDPOINTS.storeToken, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
             access_token: token,
             user_id: userId
         })
     })
     .then(response => response.json())
     .then(data => {
         console.log('Token stored in backend successfully');
         return data;
     })
     .catch(error => {
         console.error('Error storing token in backend:', error);
         // Continue without failing - frontend storage is sufficient for now
         return { success: false, error: error.message };
     });
 }
 
 /**
  * Log out the user
  * @returns {boolean} Success status
  */
 function logoutUser() {
     console.log('Logging out user...');
     
     // Clear authentication tokens
     clearTokens();
     
     // Reset UI
     resetUIForLoggedOut();
     
     return true;
 }
 
 /**
  * Verify token validity with a test API call
  * @param {string} token - Instagram access token
  * @returns {Promise} Promise that resolves with validation result
  */
 function verifyTokenValidity(token) {
     console.log('Verifying token validity...');
     
     // Use a simple API call to verify token
     const url = `https://graph.instagram.com/me?fields=id,username&access_token=${token}`;
     
     return fetch(url)
         .then(response => {
             if (!response.ok) {
                 throw new Error(`HTTP error! Status: ${response.status}`);
             }
             return response.json();
         })
         .then(data => {
             if (data.id) {
                 console.log('Token is valid');
                 return { valid: true, userId: data.id, username: data.username };
             } else {
                 console.error('Token validation failed:', data);
                 return { valid: false, error: 'Invalid token response' };
             }
         })
         .catch(error => {
             console.error('Error validating token:', error);
             return { valid: false, error: error.message };
         });
 }
 
 // Export functions for use in other modules
 export {
     checkLoginStatus,
     exchangeCodeForToken,
     logoutUser,
     verifyTokenValidity,
     forceShowLoginButton
 };