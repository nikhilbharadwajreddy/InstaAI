/**
 * ui-updates.js - UI state management module
 */

 import { getFormattedConnectionDate } from '../auth/token-storage.js';
 import { showNotification } from './notifications.js';
 
 /**
  * Initialize UI components
  */
 function initializeUI() {
     console.log('Initializing UI components...');
     
     // Initial state for UI elements
     document.getElementById('last-updated-time').textContent = 'Never';
     
     // Reset stats to zero
     document.getElementById('total-messages').textContent = '0';
     document.getElementById('auto-replies').textContent = '0';
     document.getElementById('total-comments').textContent = '0';
     document.getElementById('unique-users').textContent = '0';
     
     // Set default username and status
     document.getElementById('account-name').textContent = 'Not Connected';
     document.getElementById('account-status').textContent = 'Offline';
     document.getElementById('connection-status').textContent = 'Not Connected';
     
     console.log('UI initialized');
 }
 
 /**
  * Set up tab navigation
  */
 function setupTabNavigation() {
     console.log('Setting up tab navigation...');
     
     const tabItems = document.querySelectorAll('.sidebar-nav li');
     
     tabItems.forEach(item => {
         item.addEventListener('click', () => {
             // Remove active class from all tabs
             tabItems.forEach(tab => tab.classList.remove('active'));
             
             // Add active class to clicked tab
             item.classList.add('active');
             
             // Hide all content sections
             const sections = document.querySelectorAll('.content-section');
             sections.forEach(section => section.classList.remove('active'));
             
             // Show the corresponding section
             const tabId = item.getAttribute('data-tab');
             document.getElementById(`${tabId}-section`).classList.add('active');
         });
     });
 }
 
 /**
  * Update UI for logged in user
  * @param {Object} authData - Authentication data
  */
 function updateUIForLoggedInUser(authData) {
     console.log('Updating UI for logged in user...');
     
     // Hide login button
     const loginBtn = document.getElementById('loginBtn');
     if (loginBtn) loginBtn.style.display = 'none';
     
     // Update account status with clear connected indicators
     document.getElementById('account-status').textContent = 'Connected';
     document.getElementById('account-status').classList.add('status-connected');
     
     // Update connection status in settings
     document.getElementById('connection-status').textContent = 'Connected';
     document.getElementById('connection-status').classList.add('status-connected');
     
     // Show connection date
     const connectedSince = document.getElementById('connected-since');
     if (connectedSince) connectedSince.textContent = getFormattedConnectionDate();
     
     // Enable disconnect button
     const disconnectBtn = document.getElementById('disconnect-instagram');
     if (disconnectBtn) disconnectBtn.removeAttribute('disabled');
     
     // Enable message input and send button
     document.getElementById('message-input').removeAttribute('disabled');
     document.getElementById('send-message').removeAttribute('disabled');
     
     // Update last updated time
     document.getElementById('last-updated-time').textContent = new Date().toLocaleTimeString();
     
     // Show loading state
     showLoadingState();
     
     // Fetch and display user profile info
     fetchAndDisplayProfile(authData.userId);
 }
 
 /**
  * Reset UI for logged out user
  */
 function resetUIForLoggedOut() {
     console.log('Resetting UI for logged out user...');
     
     // Show login button
     const loginBtn = document.getElementById('loginBtn');
     if (loginBtn) loginBtn.style.display = 'block';
     
     // Reset account status
     document.getElementById('account-status').textContent = 'Offline';
     document.getElementById('account-status').classList.remove('status-connected');
     document.getElementById('account-name').textContent = 'Not Connected';
     
     // Reset connection status in settings
     document.getElementById('connection-status').textContent = 'Not Connected';
     document.getElementById('connection-status').classList.remove('status-connected');
     document.getElementById('instagram-username').textContent = 'N/A';
     document.getElementById('connected-since').textContent = 'N/A';
     
     // Disable disconnect button
     const disconnectBtn = document.getElementById('disconnect-instagram');
     if (disconnectBtn) disconnectBtn.setAttribute('disabled', 'disabled');
     
     // Disable message input and send button
     document.getElementById('message-input').setAttribute('disabled', 'disabled');
     document.getElementById('send-message').setAttribute('disabled', 'disabled');
     
     // Reset profile image
     document.getElementById('profile-img').src = 'https://via.placeholder.com/40';
     
     // Reset data containers
     resetDataContainers();
 }
 
 /**
  * Show loading state while fetching data
  */
 function showLoadingState() {
     console.log('Showing loading state...');
     
     // Show loading indicators in various sections
     const sections = ['dashboard', 'messages', 'comments'];
     
     sections.forEach(section => {
         const container = document.getElementById(`${section}-section`);
         if (container) {
             const loadingElements = container.querySelectorAll('.empty-state');
             loadingElements.forEach(el => {
                 el.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading data...</p></div>';
             });
         }
     });
     
     // Update last updated time
     const lastUpdatedTime = document.getElementById('last-updated-time');
     if (lastUpdatedTime) lastUpdatedTime.textContent = 'Updating...';
 }
 
 /**
  * Fetch and display user profile information
  * @param {string} userId - Instagram user ID
  */
 function fetchAndDisplayProfile(userId) {
     console.log('Fetching profile information...');
     
     // In a real implementation, you would fetch from Instagram API
     // For demo purposes, using setTimeout to simulate API call
     setTimeout(() => {
         // Update profile data
         document.getElementById('account-name').textContent = 'Your Business';
         document.getElementById('profile-img').src = 'https://via.placeholder.com/40';
         document.getElementById('instagram-username').textContent = 'yourbusiness';
         
         showNotification('Profile information loaded');
     }, 1000);
 }
 
 /**
  * Reset all data containers
  */
 function resetDataContainers() {
     console.log('Resetting data containers...');
     
     // Reset conversations list
     const conversationsList = document.getElementById('conversations-list');
     if (conversationsList) {
         conversationsList.innerHTML = '<p class="empty-state">No conversations yet</p>';
     }
     
     // Reset messages view
     const messagesList = document.getElementById('messages-list');
     if (messagesList) {
         messagesList.innerHTML = '<div class="empty-conversation"><i class="fas fa-comments"></i><p>Select a conversation to view messages</p></div>';
     }
     
     // Reset comments table
     const commentsTableBody = document.getElementById('comments-table-body');
     if (commentsTableBody) {
         commentsTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No comments found</td></tr>';
     }
     
     // Reset activity feed
     const activityFeed = document.getElementById('activity-feed');
     if (activityFeed) {
         activityFeed.innerHTML = '<p class="empty-state">No recent activity</p>';
     }
     
     // Reset stats
     const statElements = ['total-messages', 'auto-replies', 'total-comments', 'unique-users'];
     statElements.forEach(id => {
         const element = document.getElementById(id);
         if (element) element.textContent = '0';
     });
 }
 
 /**
  * Update dashboard with fetched data
  * @param {Object} data - Dashboard data
  */
 function updateDashboardWithData(data) {
     console.log('Updating dashboard with data...');
     
     // Update stats
     if (data.stats) {
         document.getElementById('total-messages').textContent = data.stats.totalMessages || '0';
         document.getElementById('auto-replies').textContent = data.stats.autoReplies || '0';
         document.getElementById('total-comments').textContent = data.stats.totalComments || '0';
         document.getElementById('unique-users').textContent = data.stats.uniqueUsers || '0';
     }
     
     // Update conversations if available
     if (data.conversations && data.conversations.length > 0) {
         populateConversations(data.conversations);
     }
     
     // Update comments if available
     if (data.comments && data.comments.length > 0) {
         populateComments(data.comments);
     }
     
     // Update activity feed
     if (data.activities && data.activities.length > 0) {
         populateActivityFeed(data.activities);
     }
 }
 
 /**
  * Populate conversations list
  * @param {Array} conversations - Conversation data
  */
 function populateConversations(conversations) {
     const conversationsList = document.getElementById('conversations-list');
     conversationsList.innerHTML = '';
     
     conversations.forEach(conversation => {
         const conversationItem = document.createElement('div');
         conversationItem.className = 'conversation-item';
         conversationItem.setAttribute('data-user-id', conversation.userId);
         
         conversationItem.innerHTML = `
             <img src="${conversation.profileImg || 'https://via.placeholder.com/40'}" alt="${conversation.username}" class="conversation-avatar">
             <div class="conversation-details">
                 <div class="conversation-name">${conversation.username}</div>
                 <div class="conversation-preview">${conversation.lastMessage}</div>
             </div>
             <div class="conversation-meta">
                 <div class="conversation-time">${formatTime(conversation.timestamp)}</div>
                 ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
             </div>
         `;
         
         // Add click event
         conversationItem.addEventListener('click', () => {
             document.querySelectorAll('.conversation-item').forEach(item => {
                 item.classList.remove('active');
             });
             
             conversationItem.classList.add('active');
             
             // Show this conversation
             // (Would call another function to load and display messages)
         });
         
         conversationsList.appendChild(conversationItem);
     });
 }
 
 /**
  * Populate comments table
  * @param {Array} comments - Comment data
  */
 function populateComments(comments) {
     const commentsTableBody = document.getElementById('comments-table-body');
     commentsTableBody.innerHTML = '';
     
     comments.forEach(comment => {
         const row = document.createElement('tr');
         
         row.innerHTML = `
             <td>
                 <div class="comment-user">
                     <img src="${comment.userImg || 'https://via.placeholder.com/30'}" alt="${comment.username}">
                     <span>${comment.username}</span>
                 </div>
             </td>
             <td class="comment-text">${comment.text}</td>
             <td>${comment.postTitle}</td>
             <td>${formatTime(comment.timestamp)}</td>
             <td>
                 <div class="comment-actions">
                     <button class="icon-btn"><i class="fas fa-reply"></i></button>
                     <button class="icon-btn"><i class="fas fa-trash"></i></button>
                 </div>
             </td>
         `;
         
         commentsTableBody.appendChild(row);
     });
 }
 
 /**
  * Populate activity feed
  * @param {Array} activities - Activity data
  */
 function populateActivityFeed(activities) {
     const activityFeed = document.getElementById('activity-feed');
     activityFeed.innerHTML = '';
     
     activities.forEach(activity => {
         const activityItem = document.createElement('div');
         activityItem.className = 'activity-item';
         
         let icon, text;
         
         switch (activity.type) {
             case 'message':
                 icon = 'fa-envelope';
                 text = `${activity.username} sent a message`;
                 break;
             case 'comment':
                 icon = 'fa-comment';
                 text = `${activity.username} commented on your post`;
                 break;
             case 'reply':
                 icon = 'fa-reply';
                 text = `You replied to ${activity.username}`;
                 break;
             default:
                 icon = 'fa-bell';
                 text = 'New activity';
         }
         
         activityItem.innerHTML = `
             <div class="activity-header">
                 <div class="activity-user"><i class="fas ${icon}"></i> ${text}</div>
                 <div class="activity-time">${formatTime(activity.timestamp)}</div>
             </div>
             <div class="activity-content">"${truncateText(activity.content, 100)}"</div>
             <div class="activity-actions">
                 ${activity.type === 'message' ? '<a href="#">View Message</a>' : ''}
                 ${activity.type === 'comment' ? '<a href="#">Reply</a>' : ''}
             </div>
         `;
         
         activityFeed.appendChild(activityItem);
     });
 }
 
 /**
  * Format timestamp for display
  * @param {string|Date} timestamp - Timestamp to format
  * @returns {string} Formatted time string
  */
 function formatTime(timestamp) {
     const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
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
 }
 
 /**
  * Truncate text with ellipsis
  * @param {string} text - Text to truncate
  * @param {number} maxLength - Maximum length
  * @returns {string} Truncated text
  */
 function truncateText(text, maxLength) {
     if (text.length <= maxLength) return text;
     return text.substring(0, maxLength) + '...';
 }
 
 // Export functions for use in other modules
 export {
     initializeUI,
     setupTabNavigation,
     updateUIForLoggedInUser,
     resetUIForLoggedOut,
     showLoadingState,
     updateDashboardWithData
 };