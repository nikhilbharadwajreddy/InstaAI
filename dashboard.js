/**
 * Instagram DM Automation Dashboard - Main JavaScript
 * Handles Instagram authentication, messages, comments, and automation
 */

// Module pattern to avoid global namespace pollution
const InstaAI = (function() {
    // Configuration
    const config = {
        // API endpoints
        api: {
            exchangeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/exchange-token',
            webhook: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/webhook',
            storeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/store-token',
            sendMessage: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/send-message',
            getMessages: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-messages',
            getConversations: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-conversations',
            getEvents: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-events'
        },
        // OAuth configuration
        oauth: {
            clientId: '2388890974807228',
            redirectUri: 'https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html',
            scope: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights'
        },
        // Storage keys
        storage: {
            accessToken: 'instagram_access_token',
            userId: 'instagram_user_id',
            tokenType: 'instagram_token_type',
            oauthState: 'oauth_state'
        },
        // Polling interval for new messages (in ms)
        pollingInterval: 30000,
        // Timeout for API requests (in ms)
        apiTimeout: 15000
    };

    // State management
    const state = {
        accessToken: null,
        userId: null,
        userProfile: null,
        conversations: [],
        messages: [],
        comments: [],
        automationEnabled: false,
        activeConversationId: null,
        pollingIntervalId: null,
        lastUpdated: null
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
                
                // Update UI immediately without waiting for validation
                ui.updateForLoggedInUser();
                
                // Verify token with a slight delay to allow UI to load first
                setTimeout(() => {
                    this.verifyToken(storedToken, storedUserId);
                }, 2000);
                
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
                        
                        // Fetch user data
                        dataService.fetchAll();
                        
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
                    // Don't log out - connection can still work with local storage
                } else {
                    console.log('Token stored successfully in backend:', data);
                }
            })
            .catch(error => {
                console.error("Error storing token in backend:", error);
                // Don't log out - connection can still work with local storage
            });
        },
        
        /**
         * Verifies token validity
         * @param {string} token - Access token to verify
         * @param {string} userId - User ID
         */
        verifyToken: function(token, userId) {
            console.log("Verifying token validity for user:", userId);
            
            // First, show that we're trying to fetch data
            ui.showLoadingState();
            
            // Ensure userId is a string
            const userIdStr = String(userId);
            
            // Make a simple request to check token validity
            fetch(`https://graph.facebook.com/v22.0/${userIdStr}?fields=id,username&access_token=${token}`)
                .then(response => {
                    console.log("Token validation status:", response.status);
                    return response.json();
                })
                .then(data => {
                    console.log("Token validation response:", data);
                    
                    if (data.error) {
                        // Only log out for very specific permanent errors
                        if (data.error.code === 190) { // Invalid token
                            console.error('Token is permanently invalid:', data.error);
                            this.logout();
                            ui.showNotification('Your session has expired. Please login again.', 'error');
                        } else {
                            // For ALL other errors, keep session active and load sample data
                            console.warn('API returned error but keeping session:', data.error);
                            ui.updateForLoggedInUser();
                            
                            // Load sample data even with errors
                            dataService.loadSampleData();
                            ui.showNotification('Minor connection issue, but session maintained - using sample data', 'warning');
                        }
                    } else {
                        // Token is valid
                        console.log('Token is valid, user is authenticated');
                        ui.updateForLoggedInUser();
                        dataService.fetchAll();
                    }
                })
                .catch(error => {
                    // On network error, don't log out and use sample data
                    console.error('Network error during validation:', error);
                    ui.updateForLoggedInUser();
                    
                    // Load sample data on network error
                    dataService.loadSampleData();
                    ui.showNotification('Connection issue detected, using sample data', 'warning');
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
            state.userProfile = null;
            state.conversations = [];
            state.messages = [];
            state.comments = [];
            
            // Clear polling interval
            if (state.pollingIntervalId) {
                clearInterval(state.pollingIntervalId);
                state.pollingIntervalId = null;
            }
            
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
         * Makes a GET request with timeout
         * @param {string} url - API endpoint
         * @param {Object} params - URL parameters
         * @returns {Promise} API response
         */
        get: function(url, params = {}) {
            // Build query string
            const queryString = Object.keys(params)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                .join('&');
            
            const fullUrl = queryString ? `${url}?${queryString}` : url;
            
            // Create a promise with timeout
            return Promise.race([
                fetch(fullUrl, {
                    method: 'GET',
                    headers: {'Content-Type': 'application/json'}
                }).then(this.handleResponse),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), config.apiTimeout)
                )
            ]);
        },
        
        /**
         * Makes a POST request with timeout
         * @param {string} url - API endpoint
         * @param {Object} data - Request body
         * @returns {Promise} API response
         */
        post: function(url, data = {}) {
            // Create a promise with timeout
            return Promise.race([
                fetch(url, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(data)
                }).then(this.handleResponse),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), config.apiTimeout)
                )
            ]);
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
    // DATA SERVICE - Handles data fetching and processing
    // ===================================================
    const dataService = {
        /**
         * Fetches all data (messages, comments, etc.)
         */
        fetchAll: function() {
            ui.showLoadingState();
            
            // If no auth, show error and use sample data
            if (!state.accessToken || !state.userId) {
                ui.showNotification('Please login with Instagram first', 'error');
                this.loadSampleData();
                return;
            }
            
            // Set a timeout for the whole fetch operation
            const fetchTimeout = setTimeout(() => {
                console.warn("Data fetch timeout - falling back to sample data");
                this.loadSampleData();
                ui.showNotification('Data fetch timed out - using sample data', 'warning');
            }, config.apiTimeout);
            
            // Track if we need to use sample data
            let usingSampleData = false;
            
            // API call status tracking
            const apiStatus = {
                messages: false,
                comments: false
            };
            
            // Fetch messages/conversations
            this.fetchConversations()
                .then(conversations => {
                    state.conversations = conversations;
                    ui.populateConversations(conversations);
                    apiStatus.messages = true;
                    checkAllComplete();
                })
                .catch(error => {
                    console.error("Error fetching conversations:", error);
                    usingSampleData = true;
                    this.loadSampleMessages();
                    apiStatus.messages = true;
                    checkAllComplete();
                });
            
            // We'll use sample comments for now
            setTimeout(() => {
                this.loadSampleComments();
                apiStatus.comments = true;
                checkAllComplete();
            }, 1000);
            
            // Check if all API calls are complete
            const checkAllComplete = () => {
                if (apiStatus.messages && apiStatus.comments) {
                    // All data loaded, update UI
                    ui.updateDashboardStats();
                    ui.updateActivityFeed();
                    
                    // Update last updated time
                    state.lastUpdated = new Date();
                    ui.updateLastUpdatedTime(usingSampleData);
                    
                    // Clear the timeout
                    clearTimeout(fetchTimeout);
                    
                    // Setup polling for new messages
                    this.setupPolling();
                }
            };
        },
        
        /**
         * Fetches conversations from the API
         * @returns {Promise} Conversations data
         */
        fetchConversations: function() {
            return new Promise((resolve, reject) => {
                // Get conversations
                apiService.get(config.api.getConversations, { user_id: state.userId })
                    .then(data => {
                        if (data.error) {
                            reject(new Error(data.error.message || 'API error'));
                            return;
                        }
                        
                        if (!data.data || data.data.length === 0) {
                            console.log('No conversations found');
                            resolve([]);
                            return;
                        }
                        
                        console.log('Conversations data received:', data);
                        
                        // Process each conversation
                        const conversations = [];
                        const conversationPromises = [];
                        
                        data.data.forEach(conversation => {
                            const conversationId = conversation.id;
                            
                            // Create conversation object
                            const convo = {
                                id: conversationId,
                                updated_time: conversation.updated_time,
                                participants: conversation.participants?.data || [],
                                messages: []
                            };
                            
                            // Find the other participant (not the user)
                            convo.otherParticipant = convo.participants.find(p => p.id !== state.userId) || {
                                id: 'unknown',
                                username: 'Instagram User',
                                profile_pic_url: 'https://via.placeholder.com/40'
                            };
                            
                            conversations.push(convo);
                            
                            // Fetch messages for this conversation
                            const msgPromise = apiService.get(config.api.getMessages, {
                                conversation_id: conversationId,
                                user_id: state.userId
                            })
                            .then(msgData => {
                                if (msgData.error || !msgData.messages || !msgData.messages.data) {
                                    return [];
                                }
                                
                                // Process messages
                                const messages = msgData.messages.data.map(msg => {
                                    return {
                                        id: msg.id,
                                        conversationId: conversationId,
                                        from: msg.from,
                                        to: msg.to,
                                        message: msg.message || '',
                                        created_time: msg.created_time,
                                        type: msg.from?.id === state.userId ? 'sent' : 'received',
                                        read: true
                                    };
                                });
                                
                                // Store messages in conversation
                                convo.messages = messages;
                                
                                // Also add to global messages array
                                state.messages = [...state.messages, ...messages];
                                
                                return messages;
                            })
                            .catch(error => {
                                console.error(`Error fetching messages for conversation ${conversationId}:`, error);
                                return [];
                            });
                            
                            conversationPromises.push(msgPromise);
                        });
                        
                        // Wait for all message fetches to complete
                        Promise.all(conversationPromises)
                            .then(() => {
                                resolve(conversations);
                            })
                            .catch(error => {
                                console.error("Error processing messages:", error);
                                reject(error);
                            });
                    })
                    .catch(error => {
                        console.error("Error fetching conversations:", error);
                        reject(error);
                    });
            });
        },
        
        /**
         * Sends a message to a recipient
         * @param {string} recipientId - Recipient user ID
         * @param {string} messageText - Message content
         * @returns {Promise} Send result
         */
        sendMessage: function(recipientId, messageText) {
            if (!state.accessToken || !state.userId) {
                ui.showNotification('Please login with Instagram first', 'error');
                return Promise.reject(new Error('Not authenticated'));
            }
            
            // Show sending notification
            ui.showNotification('Sending message...', 'info');
            
            // Ensure IDs are strings
            const userIdStr = String(state.userId);
            const recipientIdStr = String(recipientId);
            
            // Call the API
            return apiService.post(config.api.sendMessage, {
                user_id: userIdStr,
                recipient_id: recipientIdStr,
                message: messageText
            })
            .then(data => {
                if (data.error) {
                    throw new Error(data.error.message || 'Error sending message');
                }
                
                console.log('Message sent successfully:', data);
                ui.showNotification('Message sent successfully!');
                
                // Add the message to the state and UI
                const newMessage = {
                    id: `local_${Date.now()}`,
                    conversationId: state.activeConversationId,
                    from: { id: state.userId },
                    message: messageText,
                    created_time: new Date().toISOString(),
                    type: 'sent',
                    read: true
                };
                
                // Add to state
                state.messages.push(newMessage);
                
                // Find the conversation and add the message
                const conversation = state.conversations.find(c => 
                    c.id === state.activeConversationId
                );
                
                if (conversation) {
                    conversation.messages.push(newMessage);
                    conversation.updated_time = new Date().toISOString();
                }
                
                // Update UI
                ui.addMessageToConversation(newMessage);
                ui.updateDashboardStats();
                
                // Simulate auto-response if automation is enabled
                if (state.automationEnabled) {
                    setTimeout(() => {
                        const aiResponse = "Thanks for your message! This is an automated response from our AI system. How can I help you further?";
                        
                        const autoMessage = {
                            id: `local_auto_${Date.now()}`,
                            conversationId: state.activeConversationId,
                            from: { id: recipientIdStr },
                            message: aiResponse,
                            created_time: new Date().toISOString(),
                            type: 'received',
                            read: true,
                            automated: true
                        };
                        
                        // Add to state
                        state.messages.push(autoMessage);
                        
                        // Add to conversation
                        if (conversation) {
                            conversation.messages.push(autoMessage);
                        }
                        
                        // Update UI
                        ui.addMessageToConversation(autoMessage);
                        ui.updateDashboardStats();
                    }, 3000);
                }
                
                return data;
            })
            .catch(error => {
                console.error('Error sending Instagram message:', error);
                ui.showNotification('Failed to send message: ' + error.message, 'error');
                throw error;
            });
        },
        
        /**
         * Sets up polling for new messages and events
         */
        setupPolling: function() {
            // Clear existing interval if any
            if (state.pollingIntervalId) {
                clearInterval(state.pollingIntervalId);
            }
            
            // Define polling function
            const pollForUpdates = () => {
                // Only poll if authenticated
                if (!state.accessToken || !state.userId) return;
                
                console.log("Polling for updates...");
                
                // Check for new events
                apiService.get(config.api.getEvents, {
                    user_id: state.userId,
                    last_minutes: 5
                })
                .then(data => {
                    if (data.error) {
                        console.error('Error getting events:', data.error);
                        return;
                    }
                    
                    if (data.events && data.events.length > 0) {
                        console.log('New events received:', data.events.length);
                        
                        // Check if any events require UI updates
                        let needsRefresh = false;
                        
                        data.events.forEach(event => {
                            // Process event - check if it's a messaging event
                            if (event.messaging || 
                                (event.changes && event.changes[0] && 
                                 event.changes[0].value && 
                                 event.changes[0].value.messages)) {
                                needsRefresh = true;
                            }
                        });
                        
                        // Refresh data if needed
                        if (needsRefresh) {
                            this.fetchAll();
                            ui.showNotification('New messages received', 'info');
                        }
                    }
                })
                .catch(error => {
                    console.error('Error polling for events:', error);
                });
            };
            
            // Set up the interval
            state.pollingIntervalId = setInterval(pollForUpdates, config.pollingInterval);
            
            // Do an initial poll
            pollForUpdates();
        },
        
        /**
         * Loads sample messages when API fails
         */
        loadSampleMessages: function() {
            console.log("Loading sample messages");
            
            const users = [
                { id: 'user1', username: 'johndoe', profileImg: 'https://via.placeholder.com/40/3498db/ffffff?text=JD' },
                { id: 'user2', username: 'janedoe', profileImg: 'https://via.placeholder.com/40/e74c3c/ffffff?text=JD' },
                { id: 'user3', username: 'robertsmith', profileImg: 'https://via.placeholder.com/40/2ecc71/ffffff?text=RS' },
            ];
            
            const conversations = [];
            state.messages = [];
            
            // User 1 conversation
            const conv1 = {
                id: 'conv1',
                updated_time: new Date(Date.now() - 3300000).toISOString(),
                otherParticipant: {
                    id: users[0].id,
                    username: users[0].username,
                    profile_pic_url: users[0].profileImg
                },
                messages: []
            };
            
            // User 1 messages
            const user1Messages = [
                { id: 'msg1', conversationId: 'conv1', type: 'received', message: 'Hey there! I\'m interested in your products. Do you ship internationally?', created_time: new Date(Date.now() - 3600000).toISOString(), read: true },
                { id: 'msg2', conversationId: 'conv1', type: 'sent', message: 'Hi John! Yes, we do ship internationally. Shipping costs depend on your location. Where are you based?', created_time: new Date(Date.now() - 3500000).toISOString(), read: true },
                { id: 'msg3', conversationId: 'conv1', type: 'received', message: 'I\'m in Canada. How much would shipping be for 2-3 items?', created_time: new Date(Date.now() - 3400000).toISOString(), read: true },
                { id: 'msg4', conversationId: 'conv1', type: 'sent', message: 'For Canada, shipping is around $15-20 for 2-3 items. We offer free shipping for orders over $100.', created_time: new Date(Date.now() - 3300000).toISOString(), read: true, automated: true }
            ];
            
            conv1.messages = user1Messages;
            state.messages = [...state.messages, ...user1Messages];
            conversations.push(conv1);
            
            // User 2 conversation
            const conv2 = {
                id: 'conv2',
                updated_time: new Date(Date.now() - 7100000).toISOString(),
                otherParticipant: {
                    id: users[1].id,
                    username: users[1].username,
                    profile_pic_url: users[1].profileImg
                },
                messages: []
            };
            
            // User 2 messages
            const user2Messages = [
                { id: 'msg5', conversationId: 'conv2', type: 'received', message: 'I saw your latest post. When will the new collection be available?', created_time: new Date(Date.now() - 7200000).toISOString(), read: false },
                { id: 'msg6', conversationId: 'conv2', type: 'sent', message: 'Hi Jane! Our new collection will be launching next Friday. Would you like me to send you a preview?', created_time: new Date(Date.now() - 7100000).toISOString(), read: true, automated: true }
            ];
            
            conv2.messages = user2Messages;
            state.messages = [...state.messages, ...user2Messages];
            conversations.push(conv2);
            
            // User 3 conversation
            const conv3 = {
                id: 'conv3',
                updated_time: new Date(Date.now() - 83000000).toISOString(),
                otherParticipant: {
                    id: users[2].id,
                    username: users[2].username,
                    profile_pic_url: users[2].profileImg
                },
                messages: []
            };
            
            // User 3 messages
            const user3Messages = [
                { id: 'msg7', conversationId: 'conv3', type: 'received', message: 'Do you have the blue version of the jacket shown in your latest post?', created_time: new Date(Date.now() - 86400000).toISOString(), read: true },
                { id: 'msg8', conversationId: 'conv3', type: 'sent', message: 'Hi Robert! Yes, we do have the blue version in stock in sizes S, M, and L. The price is $79.99. Would you like me to reserve one for you?', created_time: new Date(Date.now() - 85000000).toISOString(), read: true },
                { id: 'msg9', conversationId: 'conv3', type: 'received', message: 'That would be great! I need it in size M.', created_time: new Date(Date.now() - 84000000).toISOString(), read: true },
                { id: 'msg10', conversationId: 'conv3', type: 'sent', message: 'Perfect! I\'ve reserved a blue jacket in size M for you. You can purchase it on our website or in-store. The reservation will be valid for 48 hours. Would you like me to send you the direct link to purchase?', created_time: new Date(Date.now() - 83000000).toISOString(), read: true, automated: true }
            ];
            
            conv3.messages = user3Messages;
            state.messages = [...state.messages, ...user3Messages];
            conversations.push(conv3);
            
            // Update state and UI
            state.conversations = conversations;
            ui.populateConversations(conversations);
        },
        
        /**
         * Loads sample comments when API fails
         */
        loadSampleComments: function() {
            state.comments = [
                { id: 'comment1', username: 'fashionlover', userImg: 'https://via.placeholder.com/30/f39c12/ffffff?text=FL', text: 'Love this style! Will you be restocking the small size?', postTitle: 'Summer Collection 2023', timestamp: new Date(Date.now() - 5400000) },
                { id: 'comment2', username: 'stylehunter', userImg: 'https://via.placeholder.com/30/9b59b6/ffffff?text=SH', text: 'These colors are perfect for fall! 😍', postTitle: 'Fall Fashion Preview', timestamp: new Date(Date.now() - 86400000) },
                { id: 'comment3', username: 'trendspotter', userImg: 'https://via.placeholder.com/30/1abc9c/ffffff?text=TS', text: 'Can you do a tutorial on how to style this?', postTitle: 'Accessory Guide', timestamp: new Date(Date.now() - 172800000) },
                { id: 'comment4', username: 'fashionista', userImg: 'https://via.placeholder.com/30/e74c3c/ffffff?text=F', text: 'Just ordered the black one! Can\'t wait for it to arrive!', postTitle: 'New Arrivals', timestamp: new Date(Date.now() - 259200000) }
            ];
            
            ui.populateComments(state.comments);
        },
        
        /**
         * Loads all sample data when API fails
         */
        loadSampleData: function() {
            console.log("Loading all sample data as fallback");
            
            // Load sample messages and comments
            this.loadSampleMessages();
            this.loadSampleComments();
            
            // Update UI
            ui.updateDashboardStats();
            ui.updateActivityFeed();
            ui.updateLastUpdatedTime(true);
        },
        
        /**
         * Gets automation templates from UI
         * @returns {Array} Template objects
         */
        getTemplates: function() {
            const templates = [];
            const templateItems = document.querySelectorAll('.template-item');
            
            templateItems.forEach(item => {
                const name = item.querySelector('h4')?.textContent;
                const toggle = item.querySelector('input[type="checkbox"]');
                const textarea = item.querySelector('textarea');
                const triggerEl = item.querySelector('.template-trigger small');
                
                if (name && textarea) {
                    templates.push({
                        name: name,
                        enabled: toggle ? toggle.checked : true,
                        trigger: triggerEl ? triggerEl.textContent.replace('Triggers: ', '') : '',
                        response: textarea.value
                    });
                }
            });
            
            return templates;
        },
        
        /**
         * Saves automation settings
         */
        saveAutomationSettings: function() {
            // In a real app, you would send these settings to your backend
            const settings = {
                responseDelay: document.getElementById('response-delay').value,
                aiModel: document.getElementById('ai-model-select').value,
                respondToMessages: document.getElementById('respond-messages').checked,
                respondToComments: document.getElementById('respond-comments').checked,
                aiTone: document.getElementById('ai-tone').value,
                aiPersonality: document.getElementById('ai-personality').value,
                aiInstructions: document.getElementById('ai-instructions').value,
                templates: this.getTemplates()
            };
            
            console.log('Saving automation settings:', settings);
            ui.showNotification('Automation settings saved successfully!');
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
            this.setupTabNavigation();
            this.setupAutomationToggle();
            this.setupEventListeners();
            this.addDebugButton();
        },
        
        /**
         * Sets up tab navigation
         */
        setupTabNavigation: function() {
            const tabItems = document.querySelectorAll('.sidebar-nav li');
            tabItems.forEach(item => {
                item.addEventListener('click', () => {
                    // Remove active class from all tabs
                    tabItems.forEach(tab => tab.classList.remove('active'));
                    // Add active class to clicked tab
                    item.classList.add('active');
                    
                    // Hide all content sections
                    const sections = document.querySelectorAll('.content-section');
                    sections.forEach(section => section.classList.remove('active'));
                    
                    // Show the corresponding section
                    const tabId = item.getAttribute('data-tab');
                    document.getElementById(`${tabId}-section`).classList.add('active');
                });
            });
        },
        
        /**
         * Sets up automation toggle
         */
        setupAutomationToggle: function() {
            const automationToggle = document.getElementById('automation-toggle');
            if (automationToggle) {
                automationToggle.addEventListener('change', function() {
                    state.automationEnabled = this.checked;
                    document.getElementById('automation-status').textContent = state.automationEnabled ? 'Active' : 'Inactive';
                    
                    if (state.automationEnabled) {
                        ui.showNotification('Automation enabled! The system will now respond to new messages automatically.');
                    } else {
                        ui.showNotification('Automation disabled. You will need to respond to messages manually.');
                    }
                });
            }
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
            
            // Handler for message input enter key
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        document.getElementById('send-message').click();
                    }
                });
            }
            
            // Handler for send message button
            const sendMessageBtn = document.getElementById('send-message');
            if (sendMessageBtn) {
                sendMessageBtn.addEventListener('click', function() {
                    const messageInput = document.getElementById('message-input');
                    const messageText = messageInput.value.trim();
                    
                    if (messageText && state.accessToken) {
                        // Get the currently selected conversation
                        const activeConversation = document.querySelector('.conversation-item.active');
                        if (activeConversation) {
                            const recipientId = activeConversation.getAttribute('data-user-id');
                            
                            // Send the message
                            dataService.sendMessage(recipientId, messageText);
                            
                            // Clear input
                            messageInput.value = '';
                        } else {
                            ui.showNotification('Please select a conversation first', 'error');
                        }
                    }
                });
            }
            
            // Refresh data button
            const refreshBtn = document.getElementById('refreshData');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', function() {
                    if (state.accessToken) {
                        this.classList.add('fa-spin');
                        dataService.fetchAll();
                        
                        setTimeout(() => {
                            this.classList.remove('fa-spin');
                        }, 1500);
                    } else {
                        ui.showNotification('Please login with Instagram first', 'error');
                    }
                });
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
            
            // Template modal buttons
            document.getElementById('add-template')?.addEventListener('click', function() {
                ui.showModal('template-modal');
            });
            
            document.querySelectorAll('.close-modal').forEach(button => {
                button.addEventListener('click', function() {
                    const modals = document.querySelectorAll('.modal');
                    modals.forEach(modal => {
                        modal.style.display = 'none';
                    });
                });
            });
            
            document.getElementById('save-template')?.addEventListener('click', function() {
                const templateName = document.getElementById('template-name').value;
                const templateTrigger = document.getElementById('template-trigger').value;
                const templateResponse = document.getElementById('template-response').value;
                
                if (templateName && templateResponse) {
                    ui.addNewTemplate(templateName, templateTrigger, templateResponse);
                    document.getElementById('template-modal').style.display = 'none';
                    
                    // Clear the form
                    document.getElementById('template-name').value = '';
                    document.getElementById('template-trigger').value = '';
                    document.getElementById('template-response').value = '';
                    
                    ui.showNotification('New template saved successfully!');
                } else {
                    alert('Please fill in all required fields');
                }
            });
            
            // Save automation settings
            document.getElementById('save-automation')?.addEventListener('click', function() {
                dataService.saveAutomationSettings();
            });
            
            // Test automation response
            document.getElementById('test-automation')?.addEventListener('click', function() {
                ui.showNotification('Testing the AI response system...');
                
                // Simulate an AI response
                setTimeout(() => {
                    const testResponse = "Thank you for your message! This is a test of our automated response system. How can I help you today?";
                    
                    // Check if there's an active conversation
                    if (state.activeConversationId) {
                        const autoMessage = {
                            id: `test_auto_${Date.now()}`,
                            conversationId: state.activeConversationId,
                            type: 'received',
                            message: testResponse,
                            created_time: new Date().toISOString(),
                            read: true,
                            automated: true
                        };
                        
                        ui.addMessageToConversation(autoMessage);
                    } else {
                        ui.showNotification('Please select a conversation to see test responses', 'warning');
                    }
                    
                    ui.showNotification('Test response generated successfully!');
                }, 1500);
            });
            
            // Save API keys
            document.getElementById('save-api-keys')?.addEventListener('click', function() {
                const openaiKey = document.getElementById('openai-key').value;
                
                if (openaiKey) {
                    // In a real app, you would securely store this key
                    ui.showNotification('API keys saved successfully!');
                } else {
                    alert('Please enter a valid API key');
                }
            });
            
            // Toggle password visibility
            document.querySelector('.toggle-password')?.addEventListener('click', function() {
                const openaiKeyInput = document.getElementById('openai-key');
                const icon = this.querySelector('i');
                
                if (openaiKeyInput.type === 'password') {
                    openaiKeyInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    openaiKeyInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
            
            // Modal backdrop click handler
            window.addEventListener('click', function(e) {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            });
        },
        
        /**
         * Shows loading state while fetching data
         */
        showLoadingState: function() {
            // Show loading indicators in various sections
            const sections = ['dashboard', 'messages', 'comments'];
            
            sections.forEach(section => {
                const container = document.getElementById(`${section}-section`);
                if (container) {
                    const loadingElements = container.querySelectorAll('.empty-state');
                    loadingElements.forEach(el => {
                        el.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading data...</p></div>';
                    });
                }
            });
            
            // Update last updated time
            const lastUpdatedTime = document.getElementById('last-updated-time');
            if (lastUpdatedTime) lastUpdatedTime.textContent = 'Updating...';
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
            
            // Enable message input
            document.getElementById('message-input').removeAttribute('disabled');
            document.getElementById('send-message').removeAttribute('disabled');
            
            // Update last updated time
            document.getElementById('last-updated-time').textContent = state.lastUpdated ? 
                state.lastUpdated.toLocaleTimeString() : new Date().toLocaleTimeString();
            
            // Show loading state for data
            this.showLoadingState();
            
            // Update profile display (placeholder for now)
            this.updateProfileDisplay();
        },
        
        /**
         * Updates profile display with user info
         */
        updateProfileDisplay: function() {
            // In a real app, we'd fetch actual profile data
            // This is a placeholder implementation
            
            setTimeout(() => {
                // Update profile data
                const accountName = document.getElementById('account-name');
                if (accountName) accountName.textContent = 'Your Business';
                
                const profileImg = document.getElementById('profile-img');
                if (profileImg) profileImg.src = 'https://via.placeholder.com/40';
                
                const instagramUsername = document.getElementById('instagram-username');
                if (instagramUsername) instagramUsername.textContent = 'yourbusiness';
                
                const connectedSince = document.getElementById('connected-since');
                if (connectedSince) connectedSince.textContent = new Date().toLocaleDateString();
            }, 1000);
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
            
            // Disable message input
            const messageInput = document.getElementById('message-input');
            if (messageInput) messageInput.setAttribute('disabled', 'disabled');
            
            const sendMessage = document.getElementById('send-message');
            if (sendMessage) sendMessage.setAttribute('disabled', 'disabled');
            
            // Reset data containers
            this.resetDataContainers();
        },
        
        /**
         * Resets all data containers to empty state
         */
        resetDataContainers: function() {
            // Reset conversations list
            const conversationsList = document.getElementById('conversations-list');
            if (conversationsList) {
                conversationsList.innerHTML = '<p class="empty-state">No conversations yet</p>';
            }
            
            // Reset messages view
            const messagesList = document.getElementById('messages-list');
            if (messagesList) {
                messagesList.innerHTML = '<div class="empty-conversation"><i class="fas fa-comments"></i><p>Select a conversation to view messages</p></div>';
            }
            
            // Reset comments table
            const commentsTableBody = document.getElementById('comments-table-body');
            if (commentsTableBody) {
                commentsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No comments found</td></tr>';
            }
            
            // Reset activity feed
            const activityFeed = document.getElementById('activity-feed');
            if (activityFeed) {
                activityFeed.innerHTML = '<p class="empty-state">No recent activity</p>';
            }
            
            // Reset stats
            const statElements = ['total-messages', 'auto-replies', 'total-comments', 'unique-users'];
            statElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = '0';
            });
        },
        
        /**
         * Shows login button
         */
        showLoginButton: function() {
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.style.display = 'block';
                console.log("Login button forced visible");
            }
        },
        
        /**
         * Updates last updated time
         * @param {boolean} usingSampleData - Whether sample data is being used
         */
        updateLastUpdatedTime: function(usingSampleData = false) {
            const lastUpdatedTime = document.getElementById('last-updated-time');
            if (lastUpdatedTime) {
                const timeString = state.lastUpdated ? 
                    state.lastUpdated.toLocaleTimeString() : 
                    new Date().toLocaleTimeString();
                    
                lastUpdatedTime.textContent = usingSampleData ? 
                    timeString + ' (sample data)' : 
                    timeString;
            }
        },
        
        /**
         * Populates conversations sidebar
         * @param {Array} conversations - Conversation objects
         */
        populateConversations: function(conversations) {
            const conversationsList = document.getElementById('conversations-list');
            if (!conversationsList) return;
            
            conversationsList.innerHTML = '';
            
            if (!conversations || conversations.length === 0) {
                conversationsList.innerHTML = '<p class="empty-state">No conversations yet</p>';
                return;
            }
            
            // Sort conversations by latest message time
            const sortedConversations = [...conversations].sort((a, b) => {
                return new Date(b.updated_time) - new Date(a.updated_time);
            });
            
            // Create conversation items
            sortedConversations.forEach(conv => {
                // Find the latest message
                const latestMsg = conv.messages.sort((a, b) => 
                    new Date(b.created_time) - new Date(a.created_time)
                )[0] || { message: 'No messages', created_time: conv.updated_time };
                
                // Count unread messages
                const unreadCount = conv.messages.filter(msg => 
                    !msg.read && msg.type === 'received'
                ).length;
                
                const conversationItem = document.createElement('div');
                conversationItem.className = 'conversation-item';
                conversationItem.setAttribute('data-user-id', conv.otherParticipant.id);
                conversationItem.setAttribute('data-conversation-id', conv.id);
                
                conversationItem.innerHTML = `
                    <img src="${conv.otherParticipant.profile_pic_url || 'https://via.placeholder.com/40'}" 
                         alt="${conv.otherParticipant.username}" 
                         class="conversation-avatar">
                    <div class="conversation-details">
                        <div class="conversation-name">${conv.otherParticipant.username}</div>
                        <div class="conversation-preview">${latestMsg.message}</div>
                    </div>
                    <div class="conversation-meta">
                        <div class="conversation-time">${this.formatTimestamp(latestMsg.created_time)}</div>
                        ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
                    </div>
                `;
                
                // Add click event to show conversation
                conversationItem.addEventListener('click', () => {
                    // Remove active class from all conversations
                    document.querySelectorAll('.conversation-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // Add active class to this conversation
                    conversationItem.classList.add('active');
                    
                    // Set active conversation ID
                    state.activeConversationId = conv.id;
                    
                    // Show messages for this conversation
                    this.showConversation(conv);
                });
                
                conversationsList.appendChild(conversationItem);
            });
        },
        
        /**
         * Shows messages for a specific conversation
         * @param {Object} conversation - Conversation object
         */
        showConversation: function(conversation) {
            const messagesList = document.getElementById('messages-list');
            const currentConversation = document.getElementById('current-conversation');
            const conversationStatus = document.getElementById('conversation-status');
            
            if (!messagesList || !currentConversation || !conversationStatus) return;
            
            // Update header
            currentConversation.textContent = conversation.otherParticipant.username;
            conversationStatus.textContent = 'Active now';
            
            // Clear messages list
            messagesList.innerHTML = '';
            
            // Sort messages by timestamp
            const sortedMessages = [...conversation.messages].sort((a, b) => 
                new Date(a.created_time) - new Date(b.created_time)
            );
            
            // Add messages to the list
            sortedMessages.forEach(msg => {
                const messageElement = document.createElement('div');
                messageElement.className = `message ${msg.type === 'received' ? 'received' : 'sent'}`;
                
                messageElement.innerHTML = `
                    <div class="message-content">${msg.message}</div>
                    <div class="message-time">${this.formatTimestamp(msg.created_time)}</div>
                `;
                
                messagesList.appendChild(messageElement);
            });
            
            // Scroll to bottom
            messagesList.scrollTop = messagesList.scrollHeight;
            
            // Mark messages as read
            conversation.messages.forEach(msg => {
                if (msg.type === 'received') {
                    msg.read = true;
                }
            });
            
            // Update conversation list to remove unread badge
            this.populateConversations(state.conversations);
        },
        
        /**
         * Adds a message to the current conversation
         * @param {Object} message - Message object
         */
        addMessageToConversation: function(message) {
            const messagesList = document.getElementById('messages-list');
            if (!messagesList) return;
            
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.type === 'received' ? 'received' : 'sent'}`;
            
            messageElement.innerHTML = `
                <div class="message-content">${message.message}</div>
                <div class="message-time">${this.formatTimestamp(message.created_time)}</div>
            `;
            
            messagesList.appendChild(messageElement);
            
            // Scroll to bottom
            messagesList.scrollTop = messagesList.scrollHeight;
            
            // Update conversation preview and timestamp
            const activeConversation = document.querySelector('.conversation-item.active');
            if (activeConversation) {
                const previewElement = activeConversation.querySelector('.conversation-preview');
                if (previewElement) {
                    previewElement.textContent = message.message;
                }
                
                const timeElement = activeConversation.querySelector('.conversation-time');
                if (timeElement) {
                    timeElement.textContent = this.formatTimestamp(message.created_time);
                }
            }
            
            // Add to activity feed if outgoing message
            if (message.type === 'sent') {
                this.addActivityItem({
                    type: 'message_sent',
                    username: document.getElementById('current-conversation').textContent,
                    content: message.message,
                    timestamp: new Date(message.created_time)
                });
            }
        },
        
        /**
         * Populates comments table
         * @param {Array} comments - Comment objects
         */
        populateComments: function(comments) {
            const commentsTableBody = document.getElementById('comments-table-body');
            if (!commentsTableBody) return;
            
            commentsTableBody.innerHTML = '';
            
            if (!comments || comments.length === 0) {
                commentsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No comments found</td></tr>';
                return;
            }
            
            comments.forEach(comment => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>
                        <div class="comment-user">
                            <img src="${comment.userImg || 'https://via.placeholder.com/30'}" alt="${comment.username}">
                            <span>${comment.username}</span>
                        </div>
                    </td>
                    <td class="comment-text">${comment.text}</td>
                    <td>${comment.postTitle}</td>
                    <td>${this.formatTimestamp(comment.timestamp)}</td>
                    <td>
                        <div class="comment-actions">
                            <button class="icon-btn" onclick="InstaAI.respondToComment('${comment.id}')">
                                <i class="fas fa-reply"></i>
                            </button>
                            <button class="icon-btn" onclick="InstaAI.deleteComment('${comment.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                commentsTableBody.appendChild(row);
            });
        },
        
        /**
         * Updates dashboard statistics
         */
        updateDashboardStats: function() {
            // Count unique users
            const uniqueUsers = new Set(state.conversations.map(c => c.otherParticipant.id)).size;
            
            // Count messages and auto-replies
            const totalMessages = state.messages.length;
            const autoReplies = state.messages.filter(msg => msg.type === 'sent' && msg.automated).length;
            
            // Count comments
            const totalComments = state.comments.length;
            
            // Update UI
            document.getElementById('total-messages').textContent = totalMessages;
            document.getElementById('auto-replies').textContent = autoReplies;
            document.getElementById('total-comments').textContent = totalComments;
            document.getElementById('unique-users').textContent = uniqueUsers;
        },
        
        /**
         * Updates activity feed
         */
        updateActivityFeed: function() {
            const activityFeed = document.getElementById('activity-feed');
            if (!activityFeed) return;
            
            activityFeed.innerHTML = '';
            
            // Create combined activity from messages and comments
            const activities = [];
            
            // Add recent messages to activities
            state.messages.forEach(msg => {
                // Find the conversation for this message
                const conversation = state.conversations.find(c => c.id === msg.conversationId);
                if (!conversation) return;
                
                if (msg.type === 'received') {
                    activities.push({
                        type: 'message_received',
                        username: conversation.otherParticipant.username,
                        content: msg.message,
                        timestamp: new Date(msg.created_time)
                    });
                } else if (msg.automated) {
                    activities.push({
                        type: 'auto_reply',
                        username: conversation.otherParticipant.username,
                        content: msg.message,
                        timestamp: new Date(msg.created_time)
                    });
                }
            });
            
            // Add comments to activities
            state.comments.forEach(comment => {
                activities.push({
                    type: 'comment',
                    username: comment.username,
                    content: comment.text,
                    postTitle: comment.postTitle,
                    timestamp: comment.timestamp
                });
            });
            
            // Sort by timestamp (most recent first)
            activities.sort((a, b) => b.timestamp - a.timestamp);
            
            // Limit to 10 most recent activities
            const recentActivities = activities.slice(0, 10);
            
            if (recentActivities.length === 0) {
                activityFeed.innerHTML = '<p class="empty-state">No recent activity</p>';
                return;
            }
            
            // Add activities to feed
            recentActivities.forEach(activity => {
                this.addActivityItem(activity, activityFeed);
            });
        },
        
        /**
         * Adds activity item to feed
         * @param {Object} activity - Activity object
         * @param {HTMLElement} feed - Feed element (optional)
         */
        addActivityItem: function(activity, feed = null) {
            const activityFeed = feed || document.getElementById('activity-feed');
            if (!activityFeed) return;
            
            const emptyState = activityFeed.querySelector('.empty-state');
            
            if (emptyState) {
                activityFeed.innerHTML = '';
            }
            
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            let activityIcon, activityText;
            
            switch (activity.type) {
                case 'message_received':
                    activityIcon = 'fa-envelope';
                    activityText = `${activity.username} sent you a message`;
                    break;
                case 'message_sent':
                    activityIcon = 'fa-paper-plane';
                    activityText = `You sent a message to ${activity.username}`;
                    break;
                case 'auto_reply':
                    activityIcon = 'fa-robot';
                    activityText = `Auto-replied to ${activity.username}`;
                    break;
                case 'comment':
                    activityIcon = 'fa-comment';
                    activityText = `${activity.username} commented on ${activity.postTitle}`;
                    break;
                default:
                    activityIcon = 'fa-bell';
                    activityText = 'New activity';
            }
            
            activityItem.innerHTML = `
                <div class="activity-header">
                    <div class="activity-user"><i class="fas ${activityIcon}"></i> ${activityText}</div>
                    <div class="activity-time">${this.formatTimestamp(activity.timestamp)}</div>
                </div>
                <div class="activity-content">"${this.truncateText(activity.content, 100)}"</div>
                <div class="activity-actions">
                    ${activity.type === 'message_received' ? '<a href="#" onclick="InstaAI.viewMessage(\'' + activity.username + '\')">View Message</a>' : ''}
                    ${activity.type === 'comment' ? '<a href="#" onclick="InstaAI.respondToComment(\'' + activity.username + '\')">Respond</a>' : ''}
                </div>
            `;
            
            // Add to the beginning of the feed
            activityFeed.insertBefore(activityItem, activityFeed.firstChild);
            
            // Limit feed to 10 items
            const items = activityFeed.querySelectorAll('.activity-item');
            if (items.length > 10) {
                activityFeed.removeChild(items[items.length - 1]);
            }
        },
        
        /**
         * Adds a new response template
         * @param {string} name - Template name
         * @param {string} trigger - Trigger words
         * @param {string} response - Response text
         */
        addNewTemplate: function(name, trigger, response) {
            const templatesContainer = document.querySelector('.templates-container');
            if (!templatesContainer) return;
            
            const addButton = document.getElementById('add-template');
            
            const templateId = `template-${Date.now()}`;
            
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
                <div class="template-header">
                    <h4>${name}</h4>
                    <div class="toggle-small">
                        <input type="checkbox" id="${templateId}" checked>
                        <label for="${templateId}"></label>
                    </div>
                </div>
                <div class="template-trigger">
                    <small>Triggers: ${trigger || 'None'}</small>
                </div>
                <textarea id="${templateId}-text" class="template-text">${response}</textarea>
            `;
            
            // Insert before the add button
            templatesContainer.insertBefore(templateItem, addButton);
        },
        
        /**
         * Shows a modal
         * @param {string} modalId - Modal element ID
         */
        showModal: function(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
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
            
            // Add to body
            document.body.appendChild(notification);
            
            // Show notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Remove after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        },
        
        /**
         * Adds debug button
         */
        addDebugButton: function() {
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
                
                <h3>Application State:</h3>
                <pre>accessToken: ${state.accessToken ? '✓ Present' : '✗ Not found'}</pre>
                <pre>userId: ${state.userId || 'Not found'}</pre>
                <pre>activeConversationId: ${state.activeConversationId || 'None'}</pre>
                <pre>conversationCount: ${state.conversations.length}</pre>
                <pre>messagesCount: ${state.messages.length}</pre>
                <pre>automationEnabled: ${state.automationEnabled}</pre>
                
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
        },
        
        /**
         * Formats a timestamp for display
         * @param {string|Date} timestamp - Timestamp to format
         * @returns {string} Formatted timestamp
         */
        formatTimestamp: function(timestamp) {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
            const now = new Date();
            const diff = (now - date) / 1000; // difference in seconds
            
            if (diff < 60) {
                return 'Just now';
            } else if (diff < 3600) {
                const minutes = Math.floor(diff / 60);
                return `${minutes}m ago`;
            } else if (diff < 86400) {
                const hours = Math.floor(diff / 3600);
                return `${hours}h ago`;
            } else if (diff < 604800) {
                const days = Math.floor(diff / 86400);
                return `${days}d ago`;
            } else {
                return date.toLocaleDateString();
            }
        },
        
        /**
         * Truncates text with ellipsis
         * @param {string} text - Text to truncate
         * @param {number} maxLength - Maximum length
         * @returns {string} Truncated text
         */
        truncateText: function(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
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
        },
        
        // Comment interaction methods
        respondToComment: function(commentId) {
            console.log(`Responding to comment ${commentId}`);
            // Switch to messages tab
            document.querySelector('.sidebar-nav li[data-tab="messages"]').click();
            ui.showNotification('Switched to messages to respond to comment', 'info');
        },
        
        deleteComment: function(commentId) {
            console.log(`Deleting comment ${commentId}`);
            // Find and remove the comment
            state.comments = state.comments.filter(c => c.id !== commentId);
            ui.populateComments(state.comments);
            ui.updateDashboardStats();
            ui.showNotification('Comment deleted successfully');
        },
        
        // Message interaction methods
        viewMessage: function(username) {
            console.log(`Viewing messages from ${username}`);
            // Switch to messages tab
            document.querySelector('.sidebar-nav li[data-tab="messages"]').click();
            
            // Find and select the conversation
            setTimeout(() => {
                const conversations = document.querySelectorAll('.conversation-item');
                for (const conv of conversations) {
                    if (conv.querySelector('.conversation-name').textContent === username) {
                        conv.click();
                        break;
                    }
                }
            }, 100);
        },
        
        // Data methods
        refreshData: function() {
            dataService.fetchAll();
        },
        
        // Testing methods
        testAutoReply: function() {
            document.getElementById('test-automation')?.click();
        }
    };
})();

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    InstaAI.init();
    
    // Handle loading state protection
    setTimeout(() => {
        const loadingElements = document.querySelectorAll('.loading');
        if (loadingElements.length > 0) {
            console.warn("Loading state protection triggered - clearing stuck loading indicators");
            
            loadingElements.forEach(el => {
                const parent = el.parentNode;
                if (parent && parent.classList.contains('empty-state')) {
                    parent.innerHTML = 'No data to display';
                }
            });
        }
    }, 15000);
});