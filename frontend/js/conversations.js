// Conversations Module
const Conversations = {
    conversations: [],
    activeConversationId: null,

    // Load conversations
    async loadConversations() {
        if (!Auth.isAuthenticated()) {
            Utils.showToast('Please connect your Instagram account', 'error');
            return [];
        }

        try {
            Utils.showLoading();
            const userId = Auth.getUserId();
            const response = await Utils.apiRequest('getConversations', {
                method: 'GET'
            }, `?user_id=${userId}`);

            this.conversations = response.data || [];
            this.renderConversations();
            return this.conversations;
        } catch (error) {
            console.error('Error loading conversations:', error);
            Utils.showToast('Failed to load conversations', 'error');
            return [];
        } finally {
            Utils.hideLoading();
        }
    },

    // Render conversations list
    renderConversations() {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = '<div class="empty-state">No conversations found</div>';
            return;
        }

        container.innerHTML = this.conversations.map(conv => {
            const isActive = conv.id === this.activeConversationId;
            return `
                <div class="conversation-item ${isActive ? 'active' : ''}" 
                     data-conversation-id="${conv.id}">
                    <div class="conversation-header">
                        <div class="conversation-name">
                            ${conv.participants?.data?.[0]?.username || 'Unknown User'}
                        </div>
                        <div class="conversation-time">
                            ${Utils.formatTimestamp(conv.updated_time)}
                        </div>
                    </div>
                    <div class="conversation-preview">
                        ${conv.last_message || 'No messages'}
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.conversationId;
                this.selectConversation(conversationId);
            });
        });
    },

    // Select conversation
    selectConversation(conversationId) {
        this.activeConversationId = conversationId;
        this.renderConversations();
        
        // Load messages for this conversation
        if (typeof Messages !== 'undefined') {
            Messages.loadMessages(conversationId);
        }
    },

    // Get active conversation ID
    getActiveConversationId() {
        return this.activeConversationId;
    },

    // Get conversation by ID
    getConversation(conversationId) {
        return this.conversations.find(c => c.id === conversationId);
    }
};

