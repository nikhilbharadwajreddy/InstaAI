// conversations.js - Instagram Conversations Module (Debug Version)
const Conversations = (function() {
    // API endpoints
    const API = {
        getConversations: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-conversations'
    };
    
    // Private state
    let conversations = [];
    let activeConversationId = null;
    
    // Private methods
    function displayConversations(conversationsList) {
        const container = document.getElementById('conversations-list');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        if (!conversationsList || conversationsList.length === 0) {
            container.innerHTML = '<p class="empty-state">No conversations found</p>';
            return;
        }
        
        // Create conversation items
        conversationsList.forEach(conversation => {
            const conversationItem = Utils.createElement('div', {
                className: 'conversation-item',
                'data-conversation-id': conversation.id
            });
            
            // Find other participant
            const otherParticipant = conversation.participants?.data?.find(p => 
                p.id !== Auth.getUserId()
            ) || { username: 'Instagram User', profile_pic_url: 'https://via.placeholder.com/40' };
            
            // Format timestamp
            const timestamp = conversation.updated_time ? 
                Utils.formatTimestamp(conversation.updated_time) : '';
            
            // Create avatar
            const avatar = Utils.createElement('img', {
                src: otherParticipant.profile_pic_url || 'https://via.placeholder.com/40',
                alt: otherParticipant.username,
                className: 'conversation-avatar'
            });
            
            // Create details
            const details = Utils.createElement('div', { className: 'conversation-details' }, [
                Utils.createElement('div', { className: 'conversation-name' }, [otherParticipant.username]),
                Utils.createElement('div', { className: 'conversation-preview' }, ['View conversation'])
            ]);
            
            // Create meta info
            const meta = Utils.createElement('div', { className: 'conversation-meta' }, [
                Utils.createElement('div', { className: 'conversation-time' }, [timestamp])
            ]);
            
            // Add all elements to conversation item
            conversationItem.appendChild(avatar);
            conversationItem.appendChild(details);
            conversationItem.appendChild(meta);
            
            // Add click event
            conversationItem.addEventListener('click', function() {
                // Set active class
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                });
                this.classList.add('active');
                
                // Set active conversation
                const conversationId = this.getAttribute('data-conversation-id');
                setActiveConversation(conversationId);
                
                // Load messages for this conversation
                if (typeof Messages !== 'undefined') {
                    Messages.loadMessages(conversationId);
                }
            });
            
            // Add to container
            container.appendChild(conversationItem);
        });
    }
    
    function setActiveConversation(conversationId) {
        activeConversationId = conversationId;
        
        // Find conversation
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        // Find other participant
        const otherParticipant = conversation.participants?.data?.find(p => 
            p.id !== Auth.getUserId()
        ) || { username: 'Instagram User' };
        
        // Update header
        const header = document.getElementById('current-conversation');
        if (header) header.textContent = otherParticipant.username;
        
        const status = document.getElementById('conversation-status');
        if (status) status.textContent = 'Active';
    }
    
    // Public methods
    return {
        // Get active conversation ID
        getActiveConversationId: function() {
            return activeConversationId;
        },
        
        // Get all conversations
        getAllConversations: function() {
            return conversations;
        },
        
        // Get conversation by ID
        getConversation: function(conversationId) {
            return conversations.find(c => c.id === conversationId);
        },
        
        // Set active conversation
        setActiveConversation: function(conversationId) {
            setActiveConversation(conversationId);
        },
        
        // Log debug info
        logDebugInfo: function(title, data) {
            console.group(`📢 DEBUG: ${title}`);
            console.log(data);
            console.groupEnd();
            
            // Display debug on page if debug container exists
            const debugContainer = document.getElementById('debug-container');
            if (debugContainer) {
                const debugEntry = document.createElement('div');
                debugEntry.className = 'debug-entry';
                
                const debugTitle = document.createElement('h4');
                debugTitle.textContent = title;
                
                const debugContent = document.createElement('pre');
                debugContent.textContent = typeof data === 'object' ? 
                    JSON.stringify(data, null, 2) : String(data);
                
                debugEntry.appendChild(debugTitle);
                debugEntry.appendChild(debugContent);
                
                debugContainer.appendChild(debugEntry);
                debugContainer.scrollTop = debugContainer.scrollHeight;
            }
        },
        
        // Fetch conversations from API (with additional error details)
        fetchConversations: function() {
            // Check authentication
            if (!Auth.isAuthenticated()) {
                console.error('User not authenticated');
                return Promise.reject('User not authenticated');
            }
            
            const userId = Auth.getUserId();
            
            // Check if we have a valid user ID
            if (!userId) {
                this.logDebugInfo('Missing User ID', 'Auth.getUserId() returned empty value');
                Utils.showNotification('Missing User ID', 'error');
                return Promise.reject('Missing User ID');
            }
            
            this.logDebugInfo('Fetching Conversations', {
                userId: userId,
                endpoint: API.getConversations,
                url: `${API.getConversations}?user_id=${userId}`,
                token: Auth.getAccessToken() ? 'Present (hidden)' : 'Missing'
            });
            
            // Show loading state
            Utils.showLoading('conversations-list');
            
            // Make the API request with more verbose error handling
            return fetch(`${API.getConversations}?user_id=${userId}`)
                .then(response => {
                    // Log response status
                    this.logDebugInfo('API Response Status', {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok
                    });
                    
                    // Parse the JSON response
                    return response.json().then(data => {
                        return { status: response.status, data: data };
                    });
                })
                .then(({ status, data }) => {
                    // Hide loading indicator
                    Utils.hideLoading('conversations-list');
                    
                    // Log the full response for debugging
                    this.logDebugInfo('API Response Data', data);
                    
                    // Handle error in response
                    if (data.error) {
                        const errorMsg = data.error.message || data.error;
                        this.logDebugInfo('API Error', {
                            error: errorMsg,
                            status: status,
                            code: data.error_code || 'unknown'
                        });
                        
                        // Show error message
                        Utils.showNotification(`Error: ${errorMsg}`, 'error');
                        return [];
                    }
                    
                    // Extract conversations from response
                    if (data.data && Array.isArray(data.data)) {
                        conversations = data.data;
                        
                        // Log success
                        this.logDebugInfo('Conversations Loaded', {
                            count: conversations.length
                        });
                        
                        // Display conversations
                        displayConversations(conversations);
                        return conversations;
                    } else {
                        this.logDebugInfo('Invalid Response Format', data);
                        Utils.showNotification('Invalid API response format', 'error');
                        return [];
                    }
                })
                .catch(error => {
                    // Hide loading state
                    Utils.hideLoading('conversations-list');
                    
                    // Log detailed error
                    this.logDebugInfo('Fetch Error', {
                        message: error.message,
                        stack: error.stack
                    });
                    
                    // Show error notification
                    Utils.showNotification('Network error: ' + error.message, 'error');
                    
                    // Return empty array
                    return [];
                });
        },
        
        // Initialize conversations
        init: function() {
            this.logDebugInfo('Initializing Conversations Module', {
                authenticated: Auth.isAuthenticated(),
                userId: Auth.getUserId() || 'Not available'
            });
            
            // Only fetch if authenticated
            if (Auth.isAuthenticated()) {
                this.fetchConversations();
            }
            
            // Refresh button
            const refreshBtn = document.getElementById('refresh-conversations');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.fetchConversations();
                });
            }
        }
    };
})();

// Initialize when document is ready and user is authenticated
document.addEventListener('DOMContentLoaded', function() {
    // Add a debug container if it doesn't exist
    if (!document.getElementById('debug-container')) {
        const debugContainer = document.createElement('div');
        debugContainer.id = 'debug-container';
        debugContainer.style.position = 'fixed';
        debugContainer.style.bottom = '10px';
        debugContainer.style.right = '10px';
        debugContainer.style.width = '400px';
        debugContainer.style.height = '300px';
        debugContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
        debugContainer.style.color = 'white';
        debugContainer.style.padding = '10px';
        debugContainer.style.overflow = 'auto';
        debugContainer.style.zIndex = '9999';
        debugContainer.style.fontSize = '12px';
        debugContainer.style.fontFamily = 'monospace';
        debugContainer.style.borderRadius = '5px';
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close Debug';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '5px';
        closeBtn.style.right = '5px';
        closeBtn.style.padding = '2px 5px';
        closeBtn.style.backgroundColor = '#f39c12';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '3px';
        closeBtn.style.cursor = 'pointer';
        
        closeBtn.addEventListener('click', function() {
            debugContainer.style.display = 'none';
        });
        
        debugContainer.appendChild(closeBtn);
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Debug Console';
        title.style.marginBottom = '10px';
        title.style.borderBottom = '1px solid #aaa';
        title.style.paddingBottom = '5px';
        
        debugContainer.appendChild(title);
        
        // Add to body
        document.body.appendChild(debugContainer);
    }
    
    // Check if auth module is loaded
    if (typeof Auth !== 'undefined') {
        Conversations.logDebugInfo('Auth Module Check', 'Auth module is available');
        
        // Wait for auth to be initialized
        const checkAuth = setInterval(function() {
            if (Auth.isAuthenticated()) {
                Conversations.logDebugInfo('Auth State', 'User is authenticated');
                clearInterval(checkAuth);
                Conversations.init();
            } else {
                Conversations.logDebugInfo('Auth State', 'User is not authenticated yet');
            }
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(function() {
            clearInterval(checkAuth);
            Conversations.logDebugInfo('Auth Timeout', 'Timed out waiting for authentication');
        }, 10000);
    } else {
        console.error('Auth module is not available');
    }
});