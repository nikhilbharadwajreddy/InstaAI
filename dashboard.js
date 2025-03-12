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
});

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
    // Add new endpoints for our new Lambda functions
    storeToken: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/store-token',
    sendMessage: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/send-message',
    getEvents: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-events'
};

// UI Initialization
function initializeUI() {
    // Set up tab navigation
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
    
    // Initialize automation toggle
    const automationToggle = document.getElementById('automation-toggle');
    automationToggle.addEventListener('change', function() {
        automationEnabled = this.checked;
        document.getElementById('automation-status').textContent = automationEnabled ? 'Active' : 'Inactive';
        
        // In a real app, you would update this setting in the backend
        if (automationEnabled) {
            showNotification('Automation enabled! The system will now respond to new messages automatically.');
        } else {
            showNotification('Automation disabled. You will need to respond to messages manually.');
        }
    });
    
    // Add template button functionality
    document.getElementById('add-template').addEventListener('click', function() {
        showModal('template-modal');
    });
    
    // Close modal functionality
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Template save functionality
    document.getElementById('save-template').addEventListener('click', function() {
        const templateName = document.getElementById('template-name').value;
        const templateTrigger = document.getElementById('template-trigger').value;
        const templateResponse = document.getElementById('template-response').value;
        
        if (templateName && templateResponse) {
            addNewTemplate(templateName, templateTrigger, templateResponse);
            document.getElementById('template-modal').style.display = 'none';
            
            // Clear the form
            document.getElementById('template-name').value = '';
            document.getElementById('template-trigger').value = '';
            document.getElementById('template-response').value = '';
            
            showNotification('New template saved successfully!');
        } else {
            alert('Please fill in all required fields');
        }
    });
    
    // Save automation settings
    document.getElementById('save-automation').addEventListener('click', function() {
        // In a real app, you would send these settings to your backend
        const settings = {
            responseDelay: document.getElementById('response-delay').value,
            aiModel: document.getElementById('ai-model-select').value,
            respondToMessages: document.getElementById('respond-messages').checked,
            respondToComments: document.getElementById('respond-comments').checked,
            aiTone: document.getElementById('ai-tone').value,
            aiPersonality: document.getElementById('ai-personality').value,
            aiInstructions: document.getElementById('ai-instructions').value,
            templates: getTemplates()
        };
        
        console.log('Saving settings:', settings);
        showNotification('Automation settings saved successfully!');
    });
    
    // Test automation response
    document.getElementById('test-automation').addEventListener('click', function() {
        showNotification('Testing the AI response system...');
        
        // Simulate an AI response
        setTimeout(() => {
            const testResponse = "Thank you for your message! This is a test of our automated response system. How can I help you today?";
            addMessageToConversation('ai', testResponse, new Date());
            showNotification('Test response generated successfully!');
        }, 1500);
    });
    
    // Save API keys
    document.getElementById('save-api-keys').addEventListener('click', function() {
        const openaiKey = document.getElementById('openai-key').value;
        
        if (openaiKey) {
            // In a real app, you would securely store this key
            showNotification('API keys saved successfully!');
        } else {
            alert('Please enter a valid API key');
        }
    });
    
    // Toggle password visibility
    document.querySelector('.toggle-password').addEventListener('click', function() {
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
    
    // Refresh data button
    document.getElementById('refreshData').addEventListener('click', function() {
        if (accessToken) {
            this.classList.add('fa-spin');
            fetchInstagramData();
            
            setTimeout(() => {
                this.classList.remove('fa-spin');
                document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();
                showNotification('Data refreshed successfully!');
            }, 1500);
        } else {
            showNotification('Please login with Instagram first', 'error');
        }
    });
    
    // Send message functionality
    document.getElementById('send-message').addEventListener('click', function() {
        const messageInput = document.getElementById('message-input');
        const messageText = messageInput.value.trim();
        
        if (messageText && accessToken) {
            // Get the currently selected conversation
            const activeConversation = document.querySelector('.conversation-item.active');
            if (activeConversation) {
                const recipientId = activeConversation.getAttribute('data-user-id');
                
                // In a real app, you would send this message via your API
                sendInstagramMessage(recipientId, messageText);
                
                // Add message to UI
                addMessageToConversation('user', messageText, new Date());
                
                // Clear input
                messageInput.value = '';
            } else {
                showNotification('Please select a conversation first', 'error');
            }
        }
    });
    
    // Login with Instagram button
    document.getElementById('loginBtn').addEventListener('click', function() {
        const oauthUrl = "https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=2388890974807228&redirect_uri=https://nikhilbharadwajreddy.github.io/InstaAI/insta_redirect.html&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights";
        window.location.href = oauthUrl;
    });
}

// Check if user is already logged in
function checkLoginStatus() {
    // Try session storage first (current session)
    let storedToken = sessionStorage.getItem('instagram_access_token');
    let storedUserId = sessionStorage.getItem('instagram_user_id');
    
    // If not in session storage, try local storage (persisted)
    if (!storedToken || !storedUserId) {
        storedToken = localStorage.getItem('instagram_access_token');
        storedUserId = localStorage.getItem('instagram_user_id');
        
        // If found in localStorage, also set in sessionStorage for this session
        if (storedToken && storedUserId) {
            sessionStorage.setItem('instagram_access_token', storedToken);
            sessionStorage.setItem('instagram_user_id', storedUserId);
        }
    }
    
    if (storedToken && storedUserId) {
        accessToken = storedToken;
        instagramUserId = storedUserId;
        updateUIForLoggedInUser();
        fetchInstagramData();
        return true;
    } else {
        // Make sure login button is visible if no token is found
        forceShowLoginButton();
        return false;
    }
}

// Force the login button to be visible if needed
function forceShowLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.display = 'block';
        console.log("Login button forced visible");
    }
}

// Check if we came from a successful login
function checkLoginSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get("login_success");
    
    if (loginSuccess === "true") {
        // Remove the parameter from URL to prevent issues on refresh
        const url = new URL(window.location);
        url.searchParams.delete("login_success");
        window.history.replaceState({}, document.title, url);
        
        // Show success notification
        showNotification('Successfully connected to Instagram!', 'success');
        
        // Make sure UI is updated
        checkLoginStatus();
    }
}

// Exchange OAuth code for access token
function exchangeCodeForToken(code) {
    fetch(API_ENDPOINTS.exchangeToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            accessToken = data.access_token;
            instagramUserId = data.user_id;
            
            // Store token in session
            sessionStorage.setItem('instagram_access_token', accessToken);
            sessionStorage.setItem('instagram_user_id', instagramUserId);
            
            // Store token in backend for future use
            storeTokenInBackend(accessToken, instagramUserId);
            
            // Update UI
            updateUIForLoggedInUser();
            
            // Fetch user data
            fetchInstagramData();
            
            showNotification('Successfully connected to Instagram!');
        } else {
            showNotification('Failed to connect to Instagram', 'error');
        }
    })
    .catch(error => {
        console.error("Error exchanging code for token:", error);
        showNotification('Error connecting to Instagram', 'error');
    });
}

// Store access token in backend
function storeTokenInBackend(token, userId) {
    fetch(API_ENDPOINTS.storeToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            access_token: token,
            user_id: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Token stored successfully:', data);
    })
    .catch(error => {
        console.error("Error storing token:", error);
    });
}

// Update UI elements for logged in user
function updateUIForLoggedInUser() {
    // Hide login button, show user info
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('account-status').textContent = 'Online';
    document.getElementById('connection-status').textContent = 'Connected';
    document.getElementById('disconnect-instagram').removeAttribute('disabled');
    
    // Enable message input
    document.getElementById('message-input').removeAttribute('disabled');
    document.getElementById('send-message').removeAttribute('disabled');
    
    // Update last updated time
    document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();
    
    // Show loading state for data
    showLoadingState();
    
    // Fetch user profile data and update profile display
    fetchUserProfile();
}

// Show loading state while fetching data
function showLoadingState() {
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
}

// Fetch user profile information from Instagram
function fetchUserProfile() {
    const instagramUserId = sessionStorage.getItem('instagram_user_id');
    
    // In a real implementation, you would call your API
    // For demo, we'll use setTimeout to simulate API call
    setTimeout(() => {
        // Update profile data (in real app, this would be from API)
        const accountName = document.getElementById('account-name');
        if (accountName) accountName.textContent = 'Your Business';
        
        const profileImg = document.getElementById('profile-img');
        if (profileImg) profileImg.src = 'https://via.placeholder.com/40';
        
        const instagramUsername = document.getElementById('instagram-username');
        if (instagramUsername) instagramUsername.textContent = 'yourbusiness';
        
        const connectedSince = document.getElementById('connected-since');
        if (connectedSince) connectedSince.textContent = new Date().toLocaleDateString();
    }, 1500);
}

// Log out the user and reset the UI
function logoutUser() {
    // Clear tokens
    sessionStorage.removeItem('instagram_access_token');
    sessionStorage.removeItem('instagram_user_id');
    localStorage.removeItem('instagram_access_token');
    localStorage.removeItem('instagram_user_id');
    
    // Reset UI
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.style.display = 'block';
    
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
    
    const disconnectBtn = document.getElementById('disconnect-instagram');
    if (disconnectBtn) disconnectBtn.setAttribute('disabled', 'disabled');
    
    // Disable message input
    const messageInput = document.getElementById('message-input');
    if (messageInput) messageInput.setAttribute('disabled', 'disabled');
    
    const sendMessage = document.getElementById('send-message');
    if (sendMessage) sendMessage.setAttribute('disabled', 'disabled');
    
    // Reset data containers
    resetDataContainers();
    
    // Show notification
    showNotification('Successfully logged out');
}

// Reset all data containers to empty state
function resetDataContainers() {
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
}

// Fetch Instagram data (messages, comments, etc.)
function fetchInstagramData() {
    // In a real app, you would call your backend APIs to fetch this data
    // For demonstration, we'll populate with sample data
    
    // Simulate API call delay
    setTimeout(() => {
        // Populate sample messages
        messages = getSampleMessages();
        populateConversations(messages);
        
        // Populate sample comments
        comments = getSampleComments();
        populateComments(comments);
        
        // Update dashboard stats
        updateDashboardStats();
        
        // Update activity feed
        updateActivityFeed();
    }, 1000);
}

// Populate conversations sidebar
function populateConversations(messagesData) {
    const conversationsList = document.getElementById('conversations-list');
    conversationsList.innerHTML = '';
    
    if (messagesData.length === 0) {
        conversationsList.innerHTML = '<p class="empty-state">No conversations yet</p>';
        return;
    }
    
    // Group messages by user
    const conversations = {};
    messagesData.forEach(msg => {
        if (!conversations[msg.userId]) {
            conversations[msg.userId] = {
                userId: msg.userId,
                username: msg.username,
                profileImg: msg.profileImg,
                messages: []
            };
        }
        conversations[msg.userId].messages.push(msg);
    });
    
    // Sort conversations by latest message time
    const sortedConversations = Object.values(conversations).sort((a, b) => {
        const latestMsgA = a.messages.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp))[0];
        const latestMsgB = b.messages.sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp))[0];
        return new Date(latestMsgB.timestamp) - new Date(latestMsgA.timestamp);
    });
    
    // Create conversation items
    sortedConversations.forEach(conv => {
        const latestMsg = conv.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        const unreadCount = conv.messages.filter(msg => !msg.read && msg.type === 'received').length;
        
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.setAttribute('data-user-id', conv.userId);
        
        conversationItem.innerHTML = `
            <img src="${conv.profileImg || 'https://via.placeholder.com/40'}" alt="${conv.username}" class="conversation-avatar">
            <div class="conversation-details">
                <div class="conversation-name">${conv.username}</div>
                <div class="conversation-preview">${latestMsg.message}</div>
            </div>
            <div class="conversation-meta">
                <div class="conversation-time">${formatTimestamp(latestMsg.timestamp)}</div>
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
            
            // Show messages for this conversation
            showConversation(conv);
        });
        
        conversationsList.appendChild(conversationItem);
    });
}

// Show messages for a specific conversation
function showConversation(conversation) {
    const messagesList = document.getElementById('messages-list');
    const currentConversation = document.getElementById('current-conversation');
    const conversationStatus = document.getElementById('conversation-status');
    
    // Update header
    currentConversation.textContent = conversation.username;
    conversationStatus.textContent = 'Active now';
    
    // Clear messages list
    messagesList.innerHTML = '';
    
    // Sort messages by timestamp
    const sortedMessages = conversation.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Add messages to the list
    sortedMessages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${msg.type === 'received' ? 'received' : 'sent'}`;
        
        messageElement.innerHTML = `
            <div class="message-content">${msg.message}</div>
            <div class="message-time">${formatTimestamp(msg.timestamp)}</div>
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
    populateConversations(messages);
}

// Add a new message to the current conversation
function addMessageToConversation(sender, text, timestamp) {
    const messagesList = document.getElementById('messages-list');
    const activeConversation = document.querySelector('.conversation-item.active');
    
    if (messagesList && activeConversation) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender === 'user' ? 'sent' : 'received'}`;
        
        messageElement.innerHTML = `
            <div class="message-content">${text}</div>
            <div class="message-time">${formatTimestamp(timestamp)}</div>
        `;
        
        messagesList.appendChild(messageElement);
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
        
        // Add to messages array
        const userId = activeConversation.getAttribute('data-user-id');
        const newMessage = {
            id: `msg_${Date.now()}`,
            userId: userId,
            username: document.getElementById('current-conversation').textContent,
            type: sender === 'user' ? 'sent' : 'received',
            message: text,
            timestamp: timestamp,
            read: true
        };
        
        messages.push(newMessage);
        
        // Update conversation preview
        const previewElement = activeConversation.querySelector('.conversation-preview');
        if (previewElement) {
            previewElement.textContent = text;
        }
        
        // Update timestamp
        const timeElement = activeConversation.querySelector('.conversation-time');
        if (timeElement) {
            timeElement.textContent = formatTimestamp(timestamp);
        }
        
        // Update dashboard stats
        updateDashboardStats();
        
        // Add to activity feed
        if (sender === 'user') {
            addActivityItem({
                type: 'message_sent',
                username: document.getElementById('current-conversation').textContent,
                content: text,
                timestamp: timestamp
            });
        }
    }
}

// Populate comments table
function populateComments(commentsData) {
    const commentsTableBody = document.getElementById('comments-table-body');
    commentsTableBody.innerHTML = '';
    
    if (commentsData.length === 0) {
        commentsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No comments found</td></tr>';
        return;
    }
    
    commentsData.forEach(comment => {
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
            <td>${formatTimestamp(comment.timestamp)}</td>
            <td>
                <div class="comment-actions">
                    <button class="icon-btn" onclick="respondToComment('${comment.id}')"><i class="fas fa-reply"></i></button>
                    <button class="icon-btn" onclick="deleteComment('${comment.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        
        commentsTableBody.appendChild(row);
    });
}

// Update dashboard statistics
function updateDashboardStats() {
    // Count unique users
    const uniqueUsers = [...new Set(messages.map(msg => msg.userId))].length;
    
    // Count messages and auto-replies
    const totalMessages = messages.length;
    const autoReplies = messages.filter(msg => msg.type === 'sent' && msg.automated).length;
    
    // Count comments
    const totalComments = comments.length;
    
    // Update UI
    document.getElementById('total-messages').textContent = totalMessages;
    document.getElementById('auto-replies').textContent = autoReplies;
    document.getElementById('total-comments').textContent = totalComments;
    document.getElementById('unique-users').textContent = uniqueUsers;
}

// Update activity feed
function updateActivityFeed() {
    const activityFeed = document.getElementById('activity-feed');
    activityFeed.innerHTML = '';
    
    // Create combined activity from messages and comments
    const activities = [];
    
    // Add recent messages to activities
    messages.forEach(msg => {
        if (msg.type === 'received') {
            activities.push({
                type: 'message_received',
                username: msg.username,
                content: msg.message,
                timestamp: msg.timestamp
            });
        } else if (msg.automated) {
            activities.push({
                type: 'auto_reply',
                username: msg.username,
                content: msg.message,
                timestamp: msg.timestamp
            });
        }
    });
    
    // Add comments to activities
    comments.forEach(comment => {
        activities.push({
            type: 'comment',
            username: comment.username,
            content: comment.text,
            postTitle: comment.postTitle,
            timestamp: comment.timestamp
        });
    });
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to 10 most recent activities
    const recentActivities = activities.slice(0, 10);
    
    if (recentActivities.length === 0) {
        activityFeed.innerHTML = '<p class="empty-state">No recent activity</p>';
        return;
    }
    
    // Add activities to feed
    recentActivities.forEach(activity => {
        addActivityItem(activity, activityFeed);
    });
}

// Add activity item to feed
function addActivityItem(activity, feed = null) {
    const activityFeed = feed || document.getElementById('activity-feed');
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
            <div class="activity-time">${formatTimestamp(activity.timestamp)}</div>
        </div>
        <div class="activity-content">"${truncateText(activity.content, 100)}"</div>
        <div class="activity-actions">
            ${activity.type === 'message_received' ? '<a href="#" onclick="viewMessage(\'' + activity.username + '\')">View Message</a>' : ''}
            ${activity.type === 'comment' ? '<a href="#" onclick="respondToComment(\'' + activity.username + '\')">Respond</a>' : ''}
        </div>
    `;
    
    // Add to the beginning of the feed
    activityFeed.insertBefore(activityItem, activityFeed.firstChild);
    
    // Limit feed to 10 items
    const items = activityFeed.querySelectorAll('.activity-item');
    if (items.length > 10) {
        activityFeed.removeChild(items[items.length - 1]);
    }
}

// Send a message to Instagram
function sendInstagramMessage(recipientId, messageText) {
    // In a real app, you'd call your API to send the message
    console.log(`Sending message to ${recipientId}: ${messageText}`);
    
    // Simulate successful API call
    showNotification('Message sent successfully!');
    
    // For demo purposes, simulate a response after a delay
    if (automationEnabled) {
        setTimeout(() => {
            const aiResponse = "Thanks for your message! This is an automated response from our AI system. How can I help you further?";
            addMessageToConversation('ai', aiResponse, new Date());
        }, 3000);
    }
}

// Add a new template to the UI
function addNewTemplate(name, trigger, response) {
    const templatesContainer = document.querySelector('.templates-container');
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
}

// Get all templates from the UI
function getTemplates() {
    const templates = [];
    const templateItems = document.querySelectorAll('.template-item');
    
    templateItems.forEach(item => {
        const name = item.querySelector('h4').textContent;
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
}

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Helper function to format timestamps
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
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
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Setup global event listeners
function setupEventListeners() {
    // Handle message input enter key
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('send-message').click();
        }
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Disconnect Instagram account
    document.getElementById('disconnect-instagram').addEventListener('click', function() {
        if (confirm('Are you sure you want to disconnect your Instagram account?')) {
            logoutUser();
        }
    });
}

// Sample data generation functions
function getSampleMessages() {
    const users = [
        { id: 'user1', username: 'johndoe', profileImg: 'https://via.placeholder.com/40/3498db/ffffff?text=JD' },
        { id: 'user2', username: 'janedoe', profileImg: 'https://via.placeholder.com/40/e74c3c/ffffff?text=JD' },
        { id: 'user3', username: 'robertsmith', profileImg: 'https://via.placeholder.com/40/2ecc71/ffffff?text=RS' },
    ];
    
    const sampleMessages = [];
    
    // User 1 conversation
    sampleMessages.push(
        { id: 'msg1', userId: 'user1', username: 'johndoe', profileImg: users[0].profileImg, type: 'received', message: 'Hey there! I\'m interested in your products. Do you ship internationally?', timestamp: new Date(Date.now() - 3600000), read: true },
        { id: 'msg2', userId: 'user1', username: 'johndoe', profileImg: users[0].profileImg, type: 'sent', message: 'Hi John! Yes, we do ship internationally. Shipping costs depend on your location. Where are you based?', timestamp: new Date(Date.now() - 3500000), read: true },
        { id: 'msg3', userId: 'user1', username: 'johndoe', profileImg: users[0].profileImg, type: 'received', message: 'I\'m in Canada. How much would shipping be for 2-3 items?', timestamp: new Date(Date.now() - 3400000), read: true },
        { id: 'msg4', userId: 'user1', username: 'johndoe', profileImg: users[0].profileImg, type: 'sent', message: 'For Canada, shipping is around $15-20 for 2-3 items. We offer free shipping for orders over $100.', timestamp: new Date(Date.now() - 3300000), read: true, automated: true }
    );
    
    // User 2 conversation
    sampleMessages.push(
        { id: 'msg5', userId: 'user2', username: 'janedoe', profileImg: users[1].profileImg, type: 'received', message: 'I saw your latest post. When will the new collection be available?', timestamp: new Date(Date.now() - 7200000), read: false },
        { id: 'msg6', userId: 'user2', username: 'janedoe', profileImg: users[1].profileImg, type: 'sent', message: 'Hi Jane! Our new collection will be launching next Friday. Would you like me to send you a preview?', timestamp: new Date(Date.now() - 7100000), read: true, automated: true }
    );
    
    // User 3 conversation
    sampleMessages.push(
        { id: 'msg7', userId: 'user3', username: 'robertsmith', profileImg: users[2].profileImg, type: 'received', message: 'Do you have the blue version of the jacket shown in your latest post?', timestamp: new Date(Date.now() - 86400000), read: true },
        { id: 'msg8', userId: 'user3', username: 'robertsmith', profileImg: users[2].profileImg, type: 'sent', message: 'Hi Robert! Yes, we do have the blue version in stock in sizes S, M, and L. The price is $79.99. Would you like me to reserve one for you?', timestamp: new Date(Date.now() - 85000000), read: true },
        { id: 'msg9', userId: 'user3', username: 'robertsmith', profileImg: users[2].profileImg, type: 'received', message: 'That would be great! I need it in size M.', timestamp: new Date(Date.now() - 84000000), read: true },
        { id: 'msg10', userId: 'user3', username: 'robertsmith', profileImg: users[2].profileImg, type: 'sent', message: 'Perfect! I\'ve reserved a blue jacket in size M for you. You can purchase it on our website or in-store. The reservation will be valid for 48 hours. Would you like me to send you the direct link to purchase?', timestamp: new Date(Date.now() - 83000000), read: true, automated: true }
    );
    
    return sampleMessages;
}

function getSampleComments() {
    return [
        { id: 'comment1', username: 'fashionlover', userImg: 'https://via.placeholder.com/30/f39c12/ffffff?text=FL', text: 'Love this style! Will you be restocking the small size?', postTitle: 'Summer Collection 2023', timestamp: new Date(Date.now() - 5400000) },
        { id: 'comment2', username: 'stylehunter', userImg: 'https://via.placeholder.com/30/9b59b6/ffffff?text=SH', text: 'These colors are perfect for fall! 😍', postTitle: 'Fall Fashion Preview', timestamp: new Date(Date.now() - 86400000) },
        { id: 'comment3', username: 'trendspotter', userImg: 'https://via.placeholder.com/30/1abc9c/ffffff?text=TS', text: 'Can you do a tutorial on how to style this?', postTitle: 'Accessory Guide', timestamp: new Date(Date.now() - 172800000) },
        { id: 'comment4', username: 'fashionista', userImg: 'https://via.placeholder.com/30/e74c3c/ffffff?text=F', text: 'Just ordered the black one! Can\'t wait for it to arrive!', postTitle: 'New Arrivals', timestamp: new Date(Date.now() - 259200000) },
    ];
}

// Add notification styles to the document
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: white;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        border-radius: 5px;
        padding: 15px;
        transform: translateX(120%);
        transition: transform 0.3s ease;
        z-index: 1000;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
    }
    
    .notification.success i {
        color: #2ecc71;
    }
    
    .notification.error i {
        color: #e74c3c;
    }
    
    .notification i {
        margin-right: 10px;
        font-size: 18px;
    }

    .loading .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        width: 25px;
        height: 25px;
        animation: spin 1s linear infinite;
        margin: 10px auto;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(notificationStyles);


// Debug function to check authentication status
// Add a small debug button in the bottom right corner
function addDebugButton() {
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
    
    debugButton.addEventListener('click', checkAuthDebug);
    
    document.body.appendChild(debugButton);
}

/**
 * Check authentication status and display debug information
 */
function checkAuthDebug() {
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
    const sessionToken = sessionStorage.getItem('instagram_access_token');
    const sessionUserId = sessionStorage.getItem('instagram_user_id');
    const localToken = localStorage.getItem('instagram_access_token');
    const localUserId = localStorage.getItem('instagram_user_id');
    
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
        
        <div style="margin-top: 20px;">
            <button id="clear-auth-data" style="padding: 8px 16px; background-color: #e74c3c; color: white; border: none; border-radius: 4px; margin-right: 10px; cursor: pointer;">Clear Auth Data</button>
            <button id="force-login-button" style="padding: 8px 16px; background-color: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">Fix Login Button</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('close-debug').addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    
    document.getElementById('clear-auth-data').addEventListener('click', function() {
        sessionStorage.removeItem('instagram_access_token');
        sessionStorage.removeItem('instagram_user_id');
        localStorage.removeItem('instagram_access_token');
        localStorage.removeItem('instagram_user_id');
        
        alert('Authentication data cleared. Page will reload.');
        window.location.reload();
    });
    
    document.getElementById('force-login-button').addEventListener('click', function() {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.style.display = 'block';
            alert('Login button is now visible.');
            document.body.removeChild(overlay);
        }
    });
}

/**
 * Mask token for security
 */
function maskToken(token) {
    if (!token) return 'undefined';
    if (token.length <= 8) return token;
    
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
}

// Force the login button to be visible on window load
window.addEventListener('load', forceShowLoginButton);



// Replace the existing fetchInstagramData function with this updated version
function fetchInstagramData() {
    showLoadingState();
    
    // Check if we have an access token
    if (!accessToken || !instagramUserId) {
        showNotification('Please login with Instagram first', 'error');
        return;
    }
    
    // Use the real Instagram API instead of sample data
    fetchInstagramMessages();
    fetchInstagramComments();
    
    // Update dashboard stats and UI
    setTimeout(() => {
        updateDashboardStats();
        updateActivityFeed();
        document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();
    }, 1000);
}

// New function to fetch real messages from Instagram
function fetchInstagramMessages() {
    // Call the getMessages Lambda function
    fetch(`${API_ENDPOINTS.getMessages}?user_id=${instagramUserId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error fetching messages:', data.error);
            showNotification('Error loading messages', 'error');
            return;
        }
        
        // Process messages from Instagram API
        console.log('Messages data:', data);
        
        // Transform the data into our message format
        const instaMessages = [];
        
        if (data.data && data.data.length > 0) {
            data.data.forEach(conversation => {
                if (conversation.messages && conversation.messages.data) {
                    const conversationId = conversation.id;
                    const participants = conversation.participants;
                    
                    // Find the other participant (not the user)
                    let participant = null;
                    if (participants && participants.data && participants.data.length > 0) {
                        participant = participants.data.find(p => p.id !== instagramUserId);
                    }
                    
                    if (participant) {
                        // Process each message in the conversation
                        conversation.messages.data.forEach(msg => {
                            instaMessages.push({
                                id: msg.id,
                                userId: participant.id,
                                username: participant.username || 'Instagram User',
                                profileImg: participant.profile_pic_url || 'https://via.placeholder.com/40',
                                type: msg.from.id === instagramUserId ? 'sent' : 'received',
                                message: msg.message,
                                timestamp: new Date(msg.created_time),
                                read: true, // Assume read for simplicity
                                automated: false
                            });
                        });
                    }
                }
            });
        }
        
        // If we successfully got messages, update the UI
        if (instaMessages.length > 0) {
            messages = instaMessages;
            populateConversations(messages);
        } else {
            // If no messages, fall back to sample data for demonstration
            console.log('No real messages found, using sample data');
            messages = getSampleMessages();
            populateConversations(messages);
        }
    })
    .catch(error => {
        console.error('Error fetching Instagram messages:', error);
        showNotification('Unable to load messages, using sample data', 'error');
        
        // Fall back to sample data
        messages = getSampleMessages();
        populateConversations(messages);
    });
}

// Update the sendInstagramMessage function to use the real API
function sendInstagramMessage(recipientId, messageText) {
    if (!accessToken || !instagramUserId) {
        showNotification('Please login with Instagram first', 'error');
        return;
    }
    
    // Show a sending indicator
    showNotification('Sending message...', 'info');
    
    // Call the sendMessage Lambda function
    fetch(API_ENDPOINTS.sendMessage, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: instagramUserId,
            recipient_id: recipientId,
            message: messageText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error sending message:', data.error);
            showNotification('Error sending message', 'error');
            return;
        }
        
        console.log('Message sent successfully:', data);
        showNotification('Message sent successfully!');
        
        // Add the message to the UI
        addMessageToConversation('user', messageText, new Date());
    })
    .catch(error => {
        console.error('Error sending Instagram message:', error);
        showNotification('Failed to send message', 'error');
    });
}

// Improve the storeTokenInBackend function
function storeTokenInBackend(token, userId) {
    fetch(API_ENDPOINTS.storeToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            access_token: token,
            user_id: userId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error("Error storing token:", data.error);
            return;
        }
        console.log('Token stored successfully:', data);
    })
    .catch(error => {
        console.error("Error storing token:", error);
    });
}

// Additional function to handle sending messages on Enter key press
function handleMessageInputKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const sendButton = document.getElementById('send-message');
        if (sendButton && !sendButton.disabled) {
            sendButton.click();
        }
    }
}

// Add this function to setup event listeners
function setupMessageInputListeners() {
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', handleMessageInputKeypress);
    }
}

// Extend the checkLoginStatus function to verify token validity
function checkLoginStatus() {
    // Try session storage first (current session)
    let storedToken = sessionStorage.getItem('instagram_access_token');
    let storedUserId = sessionStorage.getItem('instagram_user_id');
    
    // If not in session storage, try local storage (persisted)
    if (!storedToken || !storedUserId) {
        storedToken = localStorage.getItem('instagram_access_token');
        storedUserId = localStorage.getItem('instagram_user_id');
        
        // If found in localStorage, also set in sessionStorage for this session
        if (storedToken && storedUserId) {
            sessionStorage.setItem('instagram_access_token', storedToken);
            sessionStorage.setItem('instagram_user_id', storedUserId);
        }
    }
    
    if (storedToken && storedUserId) {
        accessToken = storedToken;
        instagramUserId = storedUserId;
        
        // Verify the token is still valid by making a test API call
        verifyTokenValidity(storedToken, storedUserId);
        
        return true;
    } else {
        // Make sure login button is visible if no token is found
        forceShowLoginButton();
        return false;
    }
}

// New function to verify token validity
function verifyTokenValidity(token, userId) {
    // Make a simple API call to verify token validity
    fetch(`https://graph.facebook.com/v18.0/${userId}?fields=id,username&access_token=${token}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Token validation failed:', data.error);
                // Token is invalid, clear it and show login
                logoutUser();
                showNotification('Your session has expired. Please login again.', 'error');
            } else {
                // Token is valid, update UI
                updateUIForLoggedInUser();
                fetchInstagramData();
            }
        })
        .catch(error => {
            console.error('Error validating token:', error);
            // On error, assume token is invalid
            logoutUser();
            showNotification('Connection error. Please login again.', 'error');
        });
}

// Enhancement to show different types of notifications
function showNotification(message, type = 'success') {
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
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}