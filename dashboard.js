// Instagram Dashboard with Lambda API features
document.addEventListener('DOMContentLoaded', function() {
    // Lambda API endpoints from your functions
    const LAMBDA_APIS = {
        exchangeToken: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/exchange-token',
        storeToken: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/store-token',
        getConversations: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/get-conversations',
        getMessages: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/get-messages',
        sendMessage: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/send-message',
        getEvents: 'https://mdpc9wjdgc.execute-api.us-east-1.amazonaws.com/prod/get-events'
    };

    // State management
    let state = {
        accessToken: null,
        userId: null,
        isConnected: false,
        conversations: [],
        currentConversationId: null,
        currentRecipientId: null,
        events: [],
        pollingIntervalId: null
    };

    // Initialize
    initializeApp();

    function initializeApp() {
        checkLoginStatus();
        setupEventListeners();
        checkLoginSuccess();
        setupDebugPanel();
    }
    
    // Check stored tokens
    function checkLoginStatus() {
        debugLog('Checking login status');
        
        let token = localStorage.getItem('instagram_access_token');
        let userId = localStorage.getItem('instagram_user_id');
        
        if (token && userId) {
            debugLog('Found stored token for user: ' + userId);
            state.accessToken = token;
            state.userId = userId;
            state.isConnected = true;
            
            updateUIForLoggedInUser();
            verifyToken(token);
            return true;
        } else {
            debugLog('No token found');
            document.getElementById('loginBtn').style.display = 'block';
            return false;
        }
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Authentication
        document.getElementById('loginBtn').addEventListener('click', loginWithInstagram);
        document.getElementById('disconnect-instagram').addEventListener('click', function() {
            if (confirm('Disconnect Instagram account?')) {
                logoutUser();
            }
        });
        
        // Tabs
        document.getElementById('conversations-tab').addEventListener('click', function() {
            setActiveTab('conversations');
        });
        
        document.getElementById('events-tab').addEventListener('click', function() {
            setActiveTab('events');
        });
        
        // Refresh buttons
        document.getElementById('refresh-conversations').addEventListener('click', function() {
            fetchConversations();
        });
        
        document.getElementById('refresh-events').addEventListener('click', function() {
            fetchEvents();
        });
        
        // Send message
        document.getElementById('send-message').addEventListener('click', function() {
            sendMessage();
        });
        
        // Enter key for message input
        document.getElementById('message-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Debug panel toggle
        document.getElementById('toggle-debug').addEventListener('click', function() {
            const debugContent = document.getElementById('debug-content');
            const toggleBtn = document.getElementById('toggle-debug');
            
            if (debugContent.style.display === 'none') {
                debugContent.style.display = 'block';
                toggleBtn.textContent = 'Hide';
            } else {
                debugContent.style.display = 'none';
                toggleBtn.textContent = 'Show';
            }
        });
    }
    
    // Login with Instagram - Using exact OAuth URL from your Lambda
    function loginWithInstagram() {
        showNotification('Connecting to Instagram...', 'info');
        
        const oauthUrl = "https://www.instagram.com/oauth/authorize" + 
            "?enable_fb_login=0" +
            "&force_authentication=1" +
            "&client_id=2388890974807228" +
            "&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html" +
            "&response_type=code" +
            "&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";
            
        window.location.href = oauthUrl;
    }
    
    // Verify token using Instagram Graph API
    function verifyToken(token) {
        debugLog('Verifying token validity');
        
        fetch(`https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${token}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    debugLog('Token invalid: ' + JSON.stringify(data.error), 'error');
                    logoutUser();
                    showNotification('Session expired. Please login again.', 'error');
                } else {
                    debugLog('Token valid: ' + JSON.stringify(data), 'success');
                    
                    // Update UI with username from response
                    document.getElementById('instagram-username').textContent = data.username || 'Instagram User';
                    
                    // Also store token in backend via Lambda
                    storeTokenInBackend(token, data.user_id);
                    
                    // Fetch conversations and events
                    fetchConversations();
                    fetchEvents();
                    
                    // Start polling for events
                    startEventPolling();
                }
            })
            .catch(error => {
                debugLog('Validation error: ' + error.message, 'error');
            });
    }
    
    // Store token in backend using Lambda function
    function storeTokenInBackend(token, userId) {
        debugLog('Storing token in backend');
        
        fetch(LAMBDA_APIS.storeToken, {
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
            debugLog('Token stored in backend: ' + JSON.stringify(data), 'success');
        })
        .catch(error => {
            debugLog('Error storing token in backend: ' + error.message, 'error');
        });
    }
    
    // Fetch conversations using Lambda API
    function fetchConversations() {
        if (!state.isConnected || !state.userId) {
            showNotification('Please connect to Instagram first', 'error');
            return;
        }
        
        debugLog('Fetching conversations');
        document.getElementById('conversations-list').innerHTML = '<div class="loading">Loading conversations...</div>';
        
        fetch(`${LAMBDA_APIS.getConversations}?user_id=${state.userId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error.message || 'Error fetching conversations');
                }
                
                debugLog('Conversations fetched: ' + JSON.stringify(data).substring(0, 200) + '...', 'success');
                
                if (!data.data || data.data.length === 0) {
                    document.getElementById('conversations-list').innerHTML = '<div class="empty-state">No conversations found</div>';
                    return;
                }
                
                // Store conversations in state
                state.conversations = data.data;
                
                // Display conversations
                displayConversations(data.data);
            })
            .catch(error => {
                debugLog('Error fetching conversations: ' + error.message, 'error');
                document.getElementById('conversations-list').innerHTML = 
                    '<div class="empty-state">Error loading conversations: ' + error.message + '</div>';
                showNotification('Error loading conversations', 'error');
            });
    }
    
    // Display conversations in the UI
    function displayConversations(conversations) {
        const conversationsList = document.getElementById('conversations-list');
        conversationsList.innerHTML = '';
        
        conversations.forEach(conversation => {
            // Find the other user (not ourselves)
            let otherUser = { id: 'unknown', username: 'Unknown User' };
            if (conversation.participants && conversation.participants.data) {
                otherUser = conversation.participants.data.find(p => p.id !== state.userId) || otherUser;
            }
            
            const conversationElement = document.createElement('div');
            conversationElement.className = 'conversation-item';
            conversationElement.dataset.conversationId = conversation.id;
            conversationElement.dataset.userId = otherUser.id;
            
            conversationElement.innerHTML = `
                <div class="conversation-name">${otherUser.username || 'Instagram User'}</div>
                <div class="conversation-preview">Updated: ${formatTime(conversation.updated_time)}</div>
            `;
            
            // Add click event to load messages
            conversationElement.addEventListener('click', function() {
                // Remove active class from all conversations
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active class to this conversation
                this.classList.add('active');
                
                // Update state
                state.currentConversationId = this.dataset.conversationId;
                state.currentRecipientId = this.dataset.userId;
                
                // Fetch messages
                fetchMessages(this.dataset.conversationId);
                
                // Update header
                document.getElementById('selected-conversation').textContent = 
                    this.querySelector('.conversation-name').textContent;
                
                // Enable message input
                document.getElementById('message-input').removeAttribute('disabled');
                document.getElementById('send-message').removeAttribute('disabled');
            });
            
            conversationsList.appendChild(conversationElement);
        });
    }
    
    // Fetch messages for a conversation using Lambda API
    function fetchMessages(conversationId) {
        debugLog('Fetching messages for conversation: ' + conversationId);
        document.getElementById('messages-list').innerHTML = '<div class="loading">Loading messages...</div>';
        
        fetch(`${LAMBDA_APIS.getMessages}?conversation_id=${conversationId}&user_id=${state.userId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error.message || 'Error fetching messages');
                }
                
                debugLog('Messages fetched: ' + JSON.stringify(data).substring(0, 200) + '...', 'success');
                
                if (!data.messages || !data.messages.data || data.messages.data.length === 0) {
                    document.getElementById('messages-list').innerHTML = '<div class="empty-state">No messages found</div>';
                    return;
                }
                
                // Display messages
                displayMessages(data.messages.data);
            })
            .catch(error => {
                debugLog('Error fetching messages: ' + error.message, 'error');
                document.getElementById('messages-list').innerHTML = 
                    '<div class="empty-state">Error loading messages: ' + error.message + '</div>';
                showNotification('Error loading messages', 'error');
            });
    }
    
    // Display messages in the UI
    function displayMessages(messages) {
        const messagesList = document.getElementById('messages-list');
        messagesList.innerHTML = '';
        
        // Sort messages by created_time
        messages.sort((a, b) => new Date(a.created_time) - new Date(b.created_time));
        
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            
            // Determine if message was sent by us or received
            const isFromUs = message.from && message.from.id === state.userId;
            
            messageElement.className = `message ${isFromUs ? 'sent' : 'received'}`;
            
            // Message content and time
            messageElement.innerHTML = `
                <div class="message-content">${message.message || 'Media message'}</div>
                <div class="message-time">${formatTime(message.created_time)}</div>
            `;
            
            messagesList.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    }
    
    // Send message using Lambda API
    function sendMessage() {
        const messageInput = document.getElementById('message-input');
        const messageText = messageInput.value.trim();
        
        if (!messageText || !state.currentRecipientId) {
            return;
        }
        
        debugLog('Sending message to recipient: ' + state.currentRecipientId);
        
        // Disable input while sending
        messageInput.setAttribute('disabled', 'disabled');
        document.getElementById('send-message').setAttribute('disabled', 'disabled');
        
        fetch(LAMBDA_APIS.sendMessage, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.userId,
                recipient_id: state.currentRecipientId,
                message: messageText
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error.message || 'Error sending message');
            }
            
            debugLog('Message sent successfully: ' + JSON.stringify(data), 'success');
            
            // Clear input
            messageInput.value = '';
            
            // Re-enable input
            messageInput.removeAttribute('disabled');
            document.getElementById('send-message').removeAttribute('disabled');
            
            // Focus back on input
            messageInput.focus();
            
            // Refresh messages
            fetchMessages(state.currentConversationId);
            
            showNotification('Message sent', 'success');
        })
        .catch(error => {
            debugLog('Error sending message: ' + error.message, 'error');
            
            // Re-enable input
            messageInput.removeAttribute('disabled');
            document.getElementById('send-message').removeAttribute('disabled');
            
            showNotification('Error sending message: ' + error.message, 'error');
        });
    }
    
    // Fetch events using Lambda API
    function fetchEvents() {
        if (!state.isConnected || !state.userId) {
            return;
        }
        
        debugLog('Fetching events');
        document.getElementById('events-list').innerHTML = '<div class="loading">Loading events...</div>';
        
        fetch(`${LAMBDA_APIS.getEvents}?user_id=${state.userId}&last_minutes=30`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error.message || 'Error fetching events');
                }
                
                debugLog('Events fetched: ' + JSON.stringify(data).substring(0, 200) + '...', 'success');
                
                // Store events in state
                state.events = data.events || [];
                
                // Display events
                displayEvents(state.events);
            })
            .catch(error => {
                debugLog('Error fetching events: ' + error.message, 'error');
                document.getElementById('events-list').innerHTML = 
                    '<div class="empty-state">Error loading events: ' + error.message + '</div>';
            });
    }
    
    // Display events in the UI
    function displayEvents(events) {
        const eventsList = document.getElementById('events-list');
        
        if (!events || events.length === 0) {
            eventsList.innerHTML = '<div class="empty-state">No recent events</div>';
            return;
        }
        
        eventsList.innerHTML = '';
        
        events.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item';
            
            // Try to determine event type
            let eventType = 'Unknown Event';
            let eventDetails = 'No details available';
            
            // Check for messaging events
            if (event.messaging) {
                eventType = 'Message Event';
                eventDetails = JSON.stringify(event.messaging);
            } 
            // Check for changes events
            else if (event.changes) {
                eventType = 'Page Change';
                eventDetails = JSON.stringify(event.changes);
            }
            
            eventElement.innerHTML = `
                <div class="event-header">
                    <div class="event-type">${eventType}</div>
                    <div class="event-time">${formatTime(event.timestamp || new Date())}</div>
                </div>
                <div class="event-details">${eventDetails}</div>
            `;
            
            eventsList.appendChild(eventElement);
        });
    }
    
    // Start polling for events
    function startEventPolling() {
        // Clear existing interval if any
        if (state.pollingIntervalId) {
            clearInterval(state.pollingIntervalId);
        }
        
        // Set up new polling interval
        state.pollingIntervalId = setInterval(() => {
            // Only poll if we're connected and on the events tab
            if (state.isConnected && document.getElementById('events-content').style.display !== 'none') {
                fetchEvents();
            }
            
            // Also check for new messages if in a conversation
            if (state.isConnected && state.currentConversationId) {
                fetchMessages(state.currentConversationId);
            }
        }, 30000); // Poll every 30 seconds
    }
    
    // Set active tab
    function setActiveTab(tabName) {
        // Update tab buttons
        document.getElementById('conversations-tab').classList.remove('active');
        document.getElementById('events-tab').classList.remove('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Update tab content
        document.getElementById('conversations-content').style.display = 'none';
        document.getElementById('events-content').style.display = 'none';
        document.getElementById(`${tabName}-content`).style.display = 'block';
        
        // Refresh data for the selected tab
        if (tabName === 'conversations') {
            fetchConversations();
        } else if (tabName === 'events') {
            fetchEvents();
        }
    }
    
    // Update UI after login
    function updateUIForLoggedInUser() {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('account-status').textContent = 'Online';
        document.getElementById('connection-status').textContent = 'Connected';
        document.getElementById('disconnect-instagram').removeAttribute('disabled');
        
        // Show features section
        document.getElementById('features-section').style.display = 'block';
    }
    
    // Logout user
    function logoutUser() {
        // Clear state
        state = {
            accessToken: null,
            userId: null,
            isConnected: false,
            conversations: [],
            currentConversationId: null,
            currentRecipientId: null,
            events: [],
            pollingIntervalId: null
        };
        
        // Clear tokens
        localStorage.removeItem('instagram_access_token');
        localStorage.removeItem('instagram_user_id');
        
        // Clear polling interval
        if (state.pollingIntervalId) {
            clearInterval(state.pollingIntervalId);
            state.pollingIntervalId = null;
        }
        
        // Update UI
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('account-status').textContent = 'Offline';
        document.getElementById('connection-status').textContent = 'Not Connected';
        document.getElementById('instagram-username').textContent = 'N/A';
        document.getElementById('disconnect-instagram').setAttribute('disabled', 'disabled');
        
        // Hide features section
        document.getElementById('features-section').style.display = 'none';
        
        debugLog('User logged out');
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
            
            debugLog('Login success detected in URL');
            showNotification('Connected to Instagram!', 'success');
        }
    }
    
    // Debug panel
    function setupDebugPanel() {
        const debugPanel = document.getElementById('debug-panel');
        const debugContent = document.getElementById('debug-content');
        
        // Initially collapsed
        debugContent.style.display = 'none';
        document.getElementById('toggle-debug').textContent = 'Show';
    }
    
    // Log to debug panel
    function debugLog(message, type = 'info') {
        const debugContent = document.getElementById('debug-content');
        
        const logEntry = document.createElement('div');
        logEntry.className = `debug-log debug-${type}`;
        
        // Add timestamp and message
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        // Add to top of debug panel
        debugContent.insertBefore(logEntry, debugContent.firstChild);
        
        // Also log to console
        console.log(`[${timestamp}] ${message}`);
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Format timestamp
    function formatTime(timestamp) {
        if (!timestamp) return 'Unknown time';
        
        const date = new Date(timestamp);
        
        // If invalid date, return original
        if (isNaN(date)) return timestamp;
        
        // If today, show only time
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Otherwise show date and time
        return date.toLocaleString([], { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
});