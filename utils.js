// utils.js - Shared Utility Functions
const Utils = (function() {
    return {
        // Show notification
        showNotification: function(message, type = 'success') {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.backgroundColor = type === 'error' ? '#e74c3c' : '#2ecc71';
            notification.style.color = 'white';
            notification.style.zIndex = '1000';
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
        },
        
        // Update UI for logged in user
        updateUIForLoggedInUser: function() {
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.style.display = 'none';
            
            const accountStatus = document.getElementById('account-status');
            if (accountStatus) accountStatus.textContent = 'Online';
            
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) connectionStatus.textContent = 'Connected';
            
            const disconnectBtn = document.getElementById('disconnect-instagram');
            if (disconnectBtn) disconnectBtn.removeAttribute('disabled');
            
            // Enable app features
            this.showElement('.feature-container');
        },
        
        // Update UI for logged out user
        updateUIForLoggedOutUser: function() {
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.style.display = 'block';
            
            const accountStatus = document.getElementById('account-status');
            if (accountStatus) accountStatus.textContent = 'Offline';
            
            const connectionStatus = document.getElementById('connection-status');
            if (connectionStatus) connectionStatus.textContent = 'Not Connected';
            
            const instagramUsername = document.getElementById('instagram-username');
            if (instagramUsername) instagramUsername.textContent = 'N/A';
            
            const disconnectBtn = document.getElementById('disconnect-instagram');
            if (disconnectBtn) disconnectBtn.setAttribute('disabled', 'disabled');
            
            // Hide app features
            this.hideElement('.feature-container');
        },
        
        // Format timestamp
        formatTimestamp: function(timestamp) {
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
        },
        
        // Show loading spinner
        showLoading: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const loading = document.createElement('div');
            loading.className = 'loading-spinner';
            loading.innerHTML = '<div class="spinner"></div><p>Loading...</p>';
            
            loading.style.textAlign = 'center';
            loading.style.padding = '20px';
            
            const spinner = loading.querySelector('.spinner');
            spinner.style.border = '5px solid #f3f3f3';
            spinner.style.borderTop = '5px solid #3498db';
            spinner.style.borderRadius = '50%';
            spinner.style.width = '30px';
            spinner.style.height = '30px';
            spinner.style.animation = 'spin 1s linear infinite';
            spinner.style.margin = '0 auto 10px auto';
            
            // Add keyframes if not already added
            if (!document.getElementById('spinner-keyframes')) {
                const style = document.createElement('style');
                style.id = 'spinner-keyframes';
                style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }
            
            container.innerHTML = '';
            container.appendChild(loading);
        },
        
        // Hide loading spinner
        hideLoading: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const loading = container.querySelector('.loading-spinner');
            if (loading) {
                container.removeChild(loading);
            }
        },
        
        // Show element by selector
        showElement: function(selector) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'block';
            });
        },
        
        // Hide element by selector
        hideElement: function(selector) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
            });
        },
        
        // Create element with attributes and children
        createElement: function(tag, attributes = {}, children = []) {
            const element = document.createElement(tag);
            
            // Set attributes
            for (const key in attributes) {
                if (key === 'className') {
                    element.className = attributes[key];
                } else if (key === 'style') {
                    Object.assign(element.style, attributes[key]);
                } else {
                    element.setAttribute(key, attributes[key]);
                }
            }
            
            // Add children
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
            
            return element;
        }
    };
})();
