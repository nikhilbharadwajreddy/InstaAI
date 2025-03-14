// conversations.js - Instagram Conversations Module
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
        
        // Fetch conversations from API
        fetchConversations: function() {
            if (!Auth.isAuthenticated()) {
                console.error('User not authenticated');
                return Promise.reject('User not authenticated');
            }
            
            // Show loading
            Utils.showLoading('conversations-list');
            
            // Make API request
            return fetch(`${API.getConversations}?user_id=${Auth.getUserId()}`)
                .then(response => response.json())
                .then(data => {
                    // Hide loading
                    Utils.hideLoading('conversations-list');
                    
                    if (data.error) {
                        console.error('Error fetching conversations:', data.error);
                        Utils.showNotification('Error fetching conversations', 'error');
                        return [];
                    }
                    
                    // Extract conversations from response
                    if (data.data && Array.isArray(data.data)) {
                        conversations = data.data;
                        
                        // Display conversations
                        displayConversations(conversations);
                        
                        return conversations;
                    } else {
                        console.error('Invalid response format:', data);
                        return [];
                    }
                })
                .catch(error => {
                    Utils.hideLoading('conversations-list');
                    console.error('Error fetching conversations:', error);
                    Utils.showNotification('Error fetching conversations', 'error');
                    return [];
                });
        },
        
        // Initialize conversations
        init: function() {
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
    // Check if auth module is loaded
    if (typeof Auth !== 'undefined') {
        // Wait for auth to be initialized
        const checkAuth = setInterval(function() {
            if (Auth.isAuthenticated()) {
                clearInterval(checkAuth);
                Conversations.init();
            }
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(function() {
            clearInterval(checkAuth);
        }, 10000);
    }
});