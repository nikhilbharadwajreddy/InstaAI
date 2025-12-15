// Main Application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize app
    initApp();

    function initApp() {
        // Check authentication
        if (!Auth.isAuthenticated()) {
            showConnectScreen();
            return;
        }

        showAuthenticatedScreen();
        setupEventListeners();
        loadInitialData();
    }

    function showConnectScreen() {
        document.getElementById('connectBtn').style.display = 'block';
        document.getElementById('disconnectBtn').style.display = 'none';
        
        // Hide authenticated content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
    }

    function showAuthenticatedScreen() {
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('disconnectBtn').style.display = 'block';
        
        // Show dashboard
        showTab('dashboard');
    }

    function setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                showTab(tab);
            });
        });

        // Connect button
        document.getElementById('connectBtn').addEventListener('click', () => {
            window.location.href = 'auth.html';
        });

        // Disconnect button
        document.getElementById('disconnectBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to disconnect your Instagram account?')) {
                Auth.logout();
            }
        });

        // Refresh buttons
        document.getElementById('refreshConversations')?.addEventListener('click', () => {
            Conversations.loadConversations();
        });

        document.getElementById('refreshEvents')?.addEventListener('click', () => {
            const timeRange = document.getElementById('eventsTimeRange')?.value || 30;
            Events.loadEvents(timeRange);
        });

        // Events time range change
        document.getElementById('eventsTimeRange')?.addEventListener('change', (e) => {
            Events.loadEvents(e.target.value);
        });
    }

    function showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected tab
        const tabElement = document.getElementById(`${tabName}Tab`);
        if (tabElement) {
            tabElement.classList.add('active');
        }

        // Activate nav link
        const navLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }

        // Load data for the tab
        switch(tabName) {
            case 'conversations':
                Conversations.loadConversations();
                break;
            case 'events':
                Events.loadEvents();
                Events.startPolling();
                break;
            case 'dashboard':
                loadDashboardData();
                break;
        }
    }

    async function loadInitialData() {
        await loadDashboardData();
    }

    async function loadDashboardData() {
        // Load account status
        updateAccountStatus();

        // Load recent conversations
        const conversations = await Conversations.loadConversations();
        updateRecentConversations(conversations.slice(0, 5));

        // Load recent events
        const events = await Events.loadEvents(30);
        updateRecentEvents(events.slice(0, 5));
    }

    function updateAccountStatus() {
        const container = document.getElementById('accountStatus');
        if (!container) return;

        if (Auth.isAuthenticated()) {
            container.innerHTML = `
                <div class="status-success">
                    <i class="fas fa-check-circle"></i>
                    <p><strong>Connected</strong></p>
                    <p>Username: ${Auth.getUsername()}</p>
                    <p>User ID: ${Auth.getUserId()}</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="status-message">
                    <p>Please connect your Instagram account</p>
                </div>
            `;
        }
    }

    function updateRecentConversations(conversations) {
        const container = document.getElementById('recentConversations');
        if (!container) return;

        if (conversations.length === 0) {
            container.innerHTML = '<p class="empty-state">No conversations</p>';
            return;
        }

        container.innerHTML = conversations.map(conv => `
            <div style="padding: 10px; border-bottom: 1px solid var(--border);">
                <div style="font-weight: 600; margin-bottom: 5px;">
                    ${conv.participants?.data?.[0]?.username || 'Unknown'}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    ${Utils.formatTimestamp(conv.updated_time)}
                </div>
            </div>
        `).join('');
    }

    function updateRecentEvents(events) {
        const container = document.getElementById('recentEvents');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '<p class="empty-state">No events</p>';
            return;
        }

        container.innerHTML = events.map(event => `
            <div style="padding: 10px; border-bottom: 1px solid var(--border);">
                <div style="font-weight: 600; margin-bottom: 5px;">
                    ${Events.getEventTitle(event)}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    ${Utils.formatDate(event.timestamp || event.time)}
                </div>
            </div>
        `).join('');
    }
});

