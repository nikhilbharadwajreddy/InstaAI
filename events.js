// events.js - Instagram Events and Webhooks Module
const Events = (function() {
    // API endpoints
    const API = {
        getEvents: 'https://76pohrq9ej.execute-api.us-east-1.amazonaws.com/prod/get-events'
    };
    
    // Private state
    let events = [];
    let pollingInterval = null;
    const POLLING_INTERVAL_MS = 30000; // 30 seconds
    
    // Private methods
    function displayEvents() {
        const container = document.getElementById('events-list');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        if (!events || events.length === 0) {
            container.innerHTML = '<p class="empty-state">No recent events</p>';
            return;
        }
        
        // Sort by timestamp (newest first)
        const sortedEvents = [...events].sort((a, b) => {
            // Get timestamp from event - events might have different structures
            const getTimestamp = event => {
                if (event.timestamp) return event.timestamp;
                if (event.time) return event.time;
                if (event.created_time) return new Date(event.created_time).getTime();
                return Date.now(); // Default to current time if no timestamp found
            };
            
            return getTimestamp(b) - getTimestamp(a);
        });
        
        // Create event elements (limited to most recent 10)
        sortedEvents.slice(0, 10).forEach(event => {
            // Try to get an event type
            let eventType = 'Unknown';
            let eventIcon = 'bell';
            let eventContent = 'New event received';
            
            // Parse event data - different events have different structures
            if (event.messaging) {
                eventType = 'Message';
                eventIcon = 'envelope';
                eventContent = 'New message received';
            } else if (event.changes) {
                eventType = 'Change';
                eventIcon = 'sync';
                
                // Try to get more details from changes
                const change = event.changes[0];
                if (change && change.field) {
                    eventType = change.field;
                    if (change.field === 'comments') {
                        eventIcon = 'comment';
                        eventContent = 'New comment received';
                    } else if (change.field === 'mentions') {
                        eventIcon = 'at';
                        eventContent = 'New mention received';
                    }
                }
            }
            
            // Create timestamp
            const timestamp = event.timestamp || event.time || (event.created_time ? new Date(event.created_time).getTime() : Date.now());
            const formattedTime = Utils.formatTimestamp(timestamp);
            
            // Create event element
            const eventElement = Utils.createElement('div', {
                className: 'event-item'
            });
            
            // Create event header
            const headerElement = Utils.createElement('div', {
                className: 'event-header'
            }, [
                Utils.createElement('div', { className: 'event-type' }, [
                    Utils.createElement('i', { className: `fas fa-${eventIcon}` }),
                    document.createTextNode(` ${eventType} Event`)
                ]),
                Utils.createElement('div', { className: 'event-time' }, [formattedTime])
            ]);
            
            // Create event content
            const contentElement = Utils.createElement('div', {
                className: 'event-content'
            }, [eventContent]);
            
            // Add header and content to event
            eventElement.appendChild(headerElement);
            eventElement.appendChild(contentElement);
            
            // Add event to container
            container.appendChild(eventElement);
        });
    }
    
    // Public methods
    return {
        // Get recent events
        getEvents: function() {
            return events;
        },
        
        // Fetch events from API
        fetchEvents: function(minutes = 5) {
            if (!Auth.isAuthenticated()) {
                console.error('User not authenticated');
                return Promise.reject('User not authenticated');
            }
            
            // Make API request
            return fetch(`${API.getEvents}?user_id=${Auth.getUserId()}&last_minutes=${minutes}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        console.error('Error fetching events:', data.error);
                        return [];
                    }
                    
                    // Extract events from response
                    if (data.events && Array.isArray(data.events)) {
                        // Store events
                        events = data.events;
                        
                        // Check if we have new events
                        if (events.length > 0) {
                            // Display events
                            displayEvents();
                            
                            // Refresh conversations and messages if available
                            if (typeof Conversations !== 'undefined' && Conversations.fetchConversations) {
                                Conversations.fetchConversations();
                            }
                            
                            // Show notification if we have new events
                            Utils.showNotification(`${events.length} new events received`);
                        }
                        
                        return events;
                    } else {
                        console.error('Invalid response format:', data);
                        return [];
                    }
                })
                .catch(error => {
                    console.error('Error fetching events:', error);
                    return [];
                });
        },
        
        // Start polling for events
        startPolling: function() {
            // Stop existing polling if any
            this.stopPolling();
            
            // Start new polling
            pollingInterval = setInterval(() => {
                this.fetchEvents();
            }, POLLING_INTERVAL_MS);
            
            console.log('Event polling started');
        },
        
        // Stop polling for events
        stopPolling: function() {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                console.log('Event polling stopped');
            }
        },
        
        // Initialize events
        init: function() {
            // Fetch events
            this.fetchEvents();
            
            // Start polling
            this.startPolling();
            
            // Refresh button
            const refreshBtn = document.getElementById('refresh-events');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.fetchEvents();
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
                Events.init();
            }
        }, 1000);
        
        // Timeout after 10 seconds
        setTimeout(function() {
            clearInterval(checkAuth);
        }, 10000);
    }
});