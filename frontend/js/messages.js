// Messages Module
const Messages = {
    messages: {},
    currentConversationId: null,

    // Load messages for a conversation
    async loadMessages(conversationId) {
        if (!Auth.isAuthenticated() || !conversationId) {
            return [];
        }

        try {
            Utils.showLoading();
            const userId = Auth.getUserId();
            const response = await Utils.apiRequest('getMessages', {
                method: 'GET'
            }, `?user_id=${userId}&conversation_id=${conversationId}`);

            const messages = response.messages || [];
            this.messages[conversationId] = messages;
            this.currentConversationId = conversationId;
            this.renderMessages(conversationId);
            return messages;
        } catch (error) {
            console.error('Error loading messages:', error);
            Utils.showToast('Failed to load messages', 'error');
            return [];
        } finally {
            Utils.hideLoading();
        }
    },

    // Render messages
    renderMessages(conversationId) {
        const panel = document.getElementById('messagesPanel');
        if (!panel) return;

        const messages = this.messages[conversationId] || [];
        const userId = Auth.getUserId();

        if (messages.length === 0) {
            panel.innerHTML = `
                <div class="empty-messages">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet</p>
                </div>
            `;
            return;
        }

        // Get conversation info
        const conversation = Conversations.getConversation(conversationId);
        const recipient = conversation?.participants?.data?.find(p => p.id !== userId);

        panel.innerHTML = `
            <div class="messages-header">
                <div>
                    <h3>${recipient?.username || 'Conversation'}</h3>
                </div>
            </div>
            <div class="messages-list" id="messagesList">
                ${messages.map(msg => {
                    const isSent = msg.from?.id === userId;
                    return `
                        <div class="message ${isSent ? 'sent' : 'received'}">
                            <div>${msg.message || ''}</div>
                            <div class="message-time">${Utils.formatTimestamp(msg.created_time)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="messages-input">
                <input type="text" id="messageInput" placeholder="Type a message..." />
                <button class="btn btn-primary" id="sendMessageBtn">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
            </div>
        `;

        // Scroll to bottom
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }

        // Setup send message handler
        const sendBtn = document.getElementById('sendMessageBtn');
        const input = document.getElementById('messageInput');
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage(conversationId, recipient?.id));
        }

        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(conversationId, recipient?.id);
                }
            });
        }
    },

    // Send message
    async sendMessage(conversationId, recipientId) {
        const input = document.getElementById('messageInput');
        if (!input || !recipientId) return;

        const messageText = input.value.trim();
        if (!messageText) return;

        try {
            Utils.showLoading();
            const userId = Auth.getUserId();
            
            await Utils.apiRequest('sendMessage', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    recipient_id: recipientId,
                    message: messageText
                })
            });

            input.value = '';
            Utils.showToast('Message sent successfully', 'success');
            
            // Reload messages
            await this.loadMessages(conversationId);
        } catch (error) {
            console.error('Error sending message:', error);
            Utils.showToast('Failed to send message', 'error');
        } finally {
            Utils.hideLoading();
        }
    }
};

