// optimized-conversations.js - Better Performance for Instagram Conversations
const Conversations = (function() {
    // API endpoints
    const API = {
        getConversations: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-conversations'
    };
    
    // Private state
    let conversations = [];
    let activeConversationId = null;
    let isLoading = false;
    let lastLoadTime = null;
    
    // Cached DOM elements
    let cachedContainer = null;
    let cachedHeader = null;
    let cachedStatus = null;
    
    // Optimization: Get DOM element once and cache it
    function getElement(id) {
        return document.getElementById(id);
    }
    
    // Optimization: Virtual rendering for conversations
    function displayConversations(conversationsList) {
        if (!cachedContainer) {
            cachedContainer = getElement('conversations-list');
        }
        
        if (!cachedContainer) return;
        
        // Clear container
        cachedContainer.innerHTML = '';
        
        if (!conversationsList || conversationsList.length === 0) {
            cachedContainer.innerHTML = '<p class="empty-state">No conversations found</p>';
            return;
        }
        
        // Only render visible conversations initially (virtual rendering)
        // Calculate how many conversations can fit in the container
        const containerHeight = cachedContainer.clientHeight;
        const itemHeight = 70; // Approximate height of each conversation item in pixels
        const visibleItemCount = Math.ceil(containerHeight / itemHeight) + 2; // Add buffer
        
        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Create the container for virtually rendered items
        const virtualContainer = document.createElement('div');
        virtualContainer.style.position = 'relative';
        virtualContainer.style.minHeight = `${conversationsList.length * itemHeight}px`;
        
        // Render only the visible items initially
        for (let i = 0; i < Math.min(visibleItemCount, conversationsList.length); i++) {
            const conversation = conversationsList[i];
            const conversationItem = createConversationItem(conversation, i * itemHeight);
            virtualContainer.appendChild(conversationItem);
        }
        
        fragment.appendChild(virtualContainer);
        cachedContainer.appendChild(fragment);
        
        // Setup scroll listener for lazy loading more items
        cachedContainer.onscroll = throttle(function() {
            handleConversationScroll(conversationsList, virtualContainer, itemHeight);
        }, 100);
    }
    
    // Throttle function to limit scroll event firing
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Handle scroll events to load more conversations
    function handleConversationScroll(conversationsList, container, itemHeight) {
        const listElement = cachedContainer;
        const scrollTop = listElement.scrollTop;
        const clientHeight = listElement.clientHeight;
        
        // Calculate which items should be visible
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.ceil((scrollTop + clientHeight) / itemHeight);
        
        // Buffer size (render extra items above and below)
        const buffer = 2;
        const renderStartIndex = Math.max(0, startIndex - buffer);
        const renderEndIndex = Math.min(conversationsList.length, endIndex + buffer);
        
        // Check which items are already rendered
        const renderedItems = container.querySelectorAll('.conversation-item');
        const renderedIndexes = Array.from(renderedItems).map(item => 
            parseInt(item.getAttribute('data-index'), 10)
        );
        
        // Render new items that should be visible but aren't yet
        for (let i = renderStartIndex; i < renderEndIndex; i++) {
            if (!renderedIndexes.includes(i)) {
                const conversation = conversationsList[i];
                const conversationItem = createConversationItem(conversation, i * itemHeight);
                container.appendChild(conversationItem);
            }
        }
        
        // Optionally, remove items that are far out of view to save memory
        for (let i = 0; i < renderedItems.length; i++) {
            const item = renderedItems[i];
            const index = parseInt(item.getAttribute('data-index'), 10);
            if (index < renderStartIndex - buffer * 2 || index > renderEndIndex + buffer * 2) {
                item.remove();
            }
        }
    }
    
    // Create a conversation item element
    function createConversationItem(conversation, topPosition) {
        // Create conversation item
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        conversationItem.setAttribute('data-conversation-id', conversation.id);
        conversationItem.setAttribute('data-index', conversation._index || 0);
        
        // For virtual scrolling, position absolutely
        if (topPosition !== undefined) {
            conversationItem.style.position = 'absolute';
            conversationItem.style.top = `${topPosition}px`;
            conversationItem.style.width = '100%';
        }
        
        // Find other participant
        const otherParticipant = conversation.participants?.data?.find(p => 
            p.id !== TokenManager.getUserId()
        ) || { username: 'Instagram User', profile_pic_url: 'https://via.placeholder.com/40' };
        
        // Format timestamp
        const timestamp = conversation.updated_time ? 
            Utils.formatTimestamp(conversation.updated_time) : '';
        
        // Create HTML efficiently with template literals
        conversationItem.innerHTML = `
            <img src="${otherParticipant.profile_pic_url || 'https://via.placeholder.com/40'}" 
                 alt="${otherParticipant.username}" 
                 class="conversation-avatar">
            <div class="conversation-details">
                <div class="conversation-name">${otherParticipant.username}</div>
                <div class="conversation-preview">View conversation</div>
            </div>
            <div class="conversation-meta">
                <div class="conversation-time">${timestamp}</div>
            </div>
        `;
        
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
            if (typeof Messages !== 'undefined' && Messages.loadMessages) {
                Messages.loadMessages(conversationId);
            }
        });
        
        return conversationItem;
    }
    
    // Set active conversation
    function setActiveConversation(conversationId) {
        activeConversationId = conversationId;
        
        // Find conversation
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        // Find other participant
        const otherParticipant = conversation.participants?.data?.find(p => 
            p.id !== TokenManager.getUserId()
        ) || { username: 'Instagram User' };
        
        // Update header (with cached element references)
        if (!cachedHeader) {
            cachedHeader = getElement('current-conversation');
        }
        if (cachedHeader) {
            cachedHeader.textContent = otherParticipant.username;
        }
        
        if (!cachedStatus) {
            cachedStatus = getElement('conversation-status');
        }
        if (cachedStatus) {
            cachedStatus.textContent = 'Active';
        }
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
        
        // Fetch conversations from API with performance improvements
        fetchConversations: function(force = false) {
            // Skip if already loading
            if (isLoading) return Promise.resolve(conversations);
            
            // Check if we need to reload or can use cached data
            const now = Date.now();
            if (!force && lastLoadTime && (now - lastLoadTime < 30000) && conversations.length > 0) {
                return Promise.resolve(conversations);
            }
            
            // Check if authenticated
            if (!TokenManager.isAuthenticated()) {
                console.error('User not authenticated');
                return Promise.reject('User not authenticated');
            }
            
            // Set loading state
            isLoading = true;
            Utils.showLoading('conversations-list');
            
            // Make API request
            return fetch(`${API.getConversations}?user_id=${TokenManager.getUserId()}`)
                .then(response => {
                    // Check for session timeout
                    if (response.status === 401) {
                        TokenManager.logout();
                        location.reload();
                        throw new Error('Session expired. Please log in again.');
                    }
                    return response.json();
                })
                .then(data => {
                    // Clear loading state
                    isLoading = false;
                    lastLoadTime = Date.now();
                    Utils.hideLoading('conversations-list');
                    
                    if (data.error) {
                        console.error('Error fetching conversations:', data.error);
                        Utils.showNotification('Error fetching conversations', 'error');
                        return [];
                    }
                    
                    // Extract conversations from response
                    if (data.data && Array.isArray(data.data)) {
                        // Add index for virtual scrolling
                        conversations = data.data.map((conv, index) => {
                            conv._index = index;  // Add index for virtual scrolling
                            return conv;
                        });
                        
                        // Display conversations with virtual rendering
                        displayConversations(conversations);
                        
                        return conversations;
                    } else {
                        console.error('Invalid response format:', data);
                        return [];
                    }
                })
                .catch(error => {
                    // Clear loading state
                    isLoading = false;
                    Utils.hideLoading('conversations-list');
                    
                    console.error('Error fetching conversations:', error);
                    Utils.showNotification('Error fetching conversations', 'error');
                    return [];
                });
        },
        
        // Initialize conversations
        init: function() {
            // Cache DOM elements
            cachedContainer = getElement('conversations-list');
            cachedHeader = getElement('current-conversation');
            cachedStatus = getElement('conversation-status');
            
            // Only fetch if authenticated
            if (TokenManager.isAuthenticated()) {
                this.fetchConversations();
                
                // Set up periodic refresh in the background (every 30 seconds)
                setInterval(() => {
                    if (!document.hidden) { // Only refresh when tab is visible
                        this.fetchConversations(true);
                    }
                }, 30000);
            }
            
            // Refresh button
            const refreshBtn = getElement('refresh-conversations');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.fetchConversations(true); // Force refresh
                });
            }
        }
    };
})();

// Initialize when TokenManager is available
document.addEventListener('DOMContentLoaded', function() {
    // Check if TokenManager is loaded
    if (typeof TokenManager !== 'undefined') {
        // Wait for TokenManager to be initialized
        const checkAuth = setInterval(function() {
            if (TokenManager.isAuthenticated()) {
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