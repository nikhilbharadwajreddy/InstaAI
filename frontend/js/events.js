// Events Module
const Events = {
    events: [],
    pollingInterval: null,

    // Load events
    async loadEvents(lastMinutes = 30) {
        if (!Auth.isAuthenticated()) {
            return [];
        }

        try {
            Utils.showLoading();
            const userId = Auth.getUserId();
            const response = await Utils.apiRequest('getEvents', {
                method: 'GET'
            }, `?user_id=${userId}&last_minutes=${lastMinutes}`);

            this.events = response.events || [];
            this.renderEvents();
            return this.events;
        } catch (error) {
            console.error('Error loading events:', error);
            Utils.showToast('Failed to load events', 'error');
            return [];
        } finally {
            Utils.hideLoading();
        }
    },

    // Render events
    renderEvents() {
        const container = document.getElementById('eventsList');
        if (!container) return;

        if (this.events.length === 0) {
            container.innerHTML = '<div class="empty-state">No events found</div>';
            return;
        }

        container.innerHTML = this.events.map(event => {
            const eventType = this.getEventType(event);
            const icon = this.getEventIcon(eventType);
            
            return `
                <div class="event-item">
                    <div class="event-icon ${eventType}">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="event-content">
                        <div class="event-title">${this.getEventTitle(event)}</div>
                        <div class="event-time">${Utils.formatDate(event.timestamp || event.time)}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Get event type
    getEventType(event) {
        if (event.field === 'messages' || event.messaging) return 'message';
        if (event.field === 'comments') return 'comment';
        return 'default';
    },

    // Get event icon
    getEventIcon(type) {
        const icons = {
            message: 'envelope',
            comment: 'comment',
            default: 'bell'
        };
        return icons[type] || 'bell';
    },

    // Get event title
    getEventTitle(event) {
        if (event.field === 'messages') {
            return 'New message received';
        }
        if (event.field === 'comments') {
            return 'New comment';
        }
        return event.field || 'Event occurred';
    },

    // Start polling
    startPolling(intervalMs = 30000) {
        this.stopPolling();
        this.pollingInterval = setInterval(() => {
            const timeRange = document.getElementById('eventsTimeRange')?.value || 30;
            this.loadEvents(timeRange);
        }, intervalMs);
    },

    // Stop polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
};

