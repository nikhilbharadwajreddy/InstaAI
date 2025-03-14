// messages.js - Instagram Messages Module
const Messages = (function() {
    // API endpoints
    const API = {
        getMessages: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-messages',
        sendMessage: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/send-message'
    };
    
    // Private state
    let messages = {};  // Indexed by conversation ID
    
    // Private methods
    function displayMessages(conversationId) {
        const container = document.getElementById('messages-list');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Check if we have messages for this conversation
        if (!messages[conversationId] || messages[conversationId].length === 0) {
            container.innerHTML = '<div class="empty-conversation"><i class="fas fa-comments"></i><p>No messages yet</p></div>';
            return;
        }
        
        // Get messages for this conversation
        const conversationMessages = messages[conversationId];
        
        // Sort by timestamp
        const sortedMessages = [...conversationMessages].sort((a, b) => {
            return new Date(a.created_time) - new Date(b.created_time);
        });
        
        // Create message elements
        sortedMessages.forEach(message => {
            // Determine if message is sent or received
            const isReceived = message.from?.id !== Auth.getUserId();
            
            // Create message element
            const messageElement = Utils.createElement('div', {
                className: `message ${isReceived ? 'received' : 'sent'}`
            });
            
            // Create message content
            const contentElement = Utils.createElement('div', {
                className: 'message-content'
            }, [message.message || '']);
            
            // Create message timestamp
            const timeElement = Utils.createElement('div', {
                className: 'message-time'
            }, [Utils.formatTimestamp(message.created_time)]);
            
            // Add content and timestamp to message
            messageElement.appendChild(contentElement);
            messageElement.appendChild(timeElement);
            
            // Add to container
            container.appendChild(messageElement);
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    // Public methods
    return {
        // Load messages for a conversation
        loadMessages: function(conversationId) {
            if (!Auth.isAuthenticated()) {
                console.error('User not authenticated');
                return Promise.reject('User not authenticated');
            }
            
            if (!conversationId) {
                console.error('No conversation ID provided');
                return Promise.reject('No conversation ID provided');
            }
            
            // Show loading
            Utils.showLoading('messages-list');
            
            // Make API request
            return fetch(`${API.getMessages}?conversation_id=${conversationId}&user_id=${Auth.getUserId()}`)
                .then(response => response.json())
                .then(data => {
                    // Hide loading
                    Utils.hideLoading('messages-list');
                    
                    if (data.error) {
                        console.error('Error fetching messages:', data.error);
                        Utils.showNotification('Error fetching messages', 'error');
                        return [];
                    }
                    
                    // Extract messages from response
                    if (data.messages && data.messages.data) {
                        // Store messages for this conversation
                        messages[conversationId] = data.messages.data;
                        
                        // Display messages
                        displayMessages(conversationId);
                        
                        return data.messages.data;
                    } else {
                        console.error('Invalid response format:', data);
                        return [];
                    }
                })
                .catch(error => {
                    Utils.hideLoading('messages-list');
                    console.error('Error fetching messages:', error);
                    Utils.showNotification('Error fetching messages', 'error');
                    return [];
                });
        },
        
        // Send a message
        sendMessage: function(recipientId, messageText) {
            if (!Auth.isAuthenticated()) {
                console.error('User not authenticated');
                return Promise.reject('User not authenticated');
            }
            
            if (!recipientId) {
                console.error('No recipient ID provided');
                return Promise.reject('No recipient ID provided');
            }
            
            if (!messageText) {
                console.error('No message text provided');
                return Promise.reject('No message text provided');
            }
            
            // Show sending notification
            Utils.showNotification('Sending message...', 'info');
            
            // Make API request
            return fetch(API.sendMessage, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: Auth.getUserId(),
                    recipient_id: recipientId,
                    message: messageText
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error sending message:', data.error);
                    Utils.showNotification('Error sending message', 'error');
                    throw new Error(data.error);
                }
                
                // Show success notification
                Utils.showNotification('Message sent successfully');
                
                // Get active conversation
                const conversationId = Conversations.getActiveConversationId();
                if (conversationId) {
                    // Create a local message object
                    const newMessage = {
                        id: `local_${Date.now()}`,
                        from: { id: Auth.getUserId() },
                        message: messageText,
                        created_time: new Date().toISOString()
                    };
                    
                    // Add to messages
                    if (!messages[conversationId]) {
                        messages[conversationId] = [];
                    }
                    messages[conversationId].push(newMessage);
                    
                    // Display messages
                    displayMessages(conversationId);
                    
                    // Clear input
                    const messageInput = document.getElementById('message-input');
                    if (messageInput) {
                        messageInput.value = '';
                    }
                }
                
                return data;
            })
            .catch(error => {
                console.error('Error sending message:', error);
                Utils.showNotification('Error sending message', 'error');
                throw error;
            });
        },
        
        // Initialize messages
        init: function() {
            // Set up send message button
            const sendButton = document.getElementById('send-message');
            if (sendButton) {
                sendButton.addEventListener('click', () => {
                    const messageInput = document.getElementById('message-input');
                    if (!messageInput) return;
                    
                    const messageText = messageInput.value.trim();
                    if (!messageText) return;
                    
                    // Get active conversation to find recipient
                    const conversationId = Conversations.getActiveConversationId();
                    if (!conversationId) {
                        Utils.showNotification('Please select a conversation first', 'error');
                        return;
                    }
                    
                    // Get conversation to find recipient ID
                    const conversation = Conversations.getConversation(conversationId);
                    if (!conversation) return;
                    
                    // Find other participant
                    const otherParticipant = conversation.participants?.data?.find(p => 
                        p.id !== Auth.getUserId()
                    );
                    
                    if (!otherParticipant) {
                        Utils.showNotification('Cannot find recipient', 'error');
                        return;
                    }
                    
                    // Send message
                    this.sendMessage(otherParticipant.id, messageText);
                });
            }
            
            // Handle enter key in message input
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const sendButton = document.getElementById('send-message');
                        if (sendButton) {
                            sendButton.click();
                        }
                    }
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
                Messages.init();
            }
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(function() {
            clearInterval(checkAuth);
        }, 10000);
    }
});