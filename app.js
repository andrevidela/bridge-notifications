// Main Application Logic
const { messaging, db } = window.firebaseServices;

const messagingKey = 'BC5UcSx7UFFNgKH2-1or7fqdpxH_BjaAAUITQv63AgZl1m4M5quj7xoTs59NEMhqrKAB2egaBqMmR1ZD4xPDgL0'

// DOM Elements
const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    pushStatus: document.getElementById('pushStatus'),
    emailStatus: document.getElementById('emailStatus'),
    enablePushBtn: document.getElementById('enablePushBtn'),
    disablePushBtn: document.getElementById('disablePushBtn'),
    pushToken: document.getElementById('pushToken'),
    tokenText: document.getElementById('tokenText'),
    pushNotSupported: document.getElementById('pushNotSupported'),
    emailForm: document.getElementById('emailForm'),
    emailInput: document.getElementById('emailInput'),
    nameInput: document.getElementById('nameInput'),
    emailSuccess: document.getElementById('emailSuccess'),
    testPushBtn: document.getElementById('testPushBtn'),
    testEmailBtn: document.getElementById('testEmailBtn'),
    testResult: document.getElementById('testResult'),
    adminForm: document.getElementById('adminForm'),
    adminResult: document.getElementById('adminResult')
};

// State
let currentToken = null;
let currentEmail = null;

// Initialize app
async function initializeApp() {
    try {
        updateConnectionStatus('connected', 'Connected to Firebase');
        
        // Check push notification support
        if (!('Notification' in window) || !messaging) {
            elements.pushNotSupported.style.display = 'block';
            elements.enablePushBtn.style.display = 'none';
            return;
        }

        // Check if already subscribed
        await checkExistingSubscriptions();
        
        // Set up event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        updateConnectionStatus('error', 'Connection error');
    }
}

// Update connection status
function updateConnectionStatus(status, message) {
    const statusDot = elements.connectionStatus.querySelector('.status-dot');
    const statusText = elements.connectionStatus.querySelector('.status-text');
    
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = message;
}

// Check for existing subscriptions
async function checkExistingSubscriptions() {
    // Check push notification permission
    if (Notification.permission === 'granted') {
        try {
            const token = await messaging.getToken({
                vapidKey: messagingKey
            });
            if (token) {
                currentToken = token;
                updatePushStatus(true);
                elements.tokenText.textContent = token;
                elements.pushToken.style.display = 'block';
            }
        } catch (error) {
            console.error('Error getting token:', error);
        }
    }
    
    // Check email subscription from localStorage
    const savedEmail = localStorage.getItem('subscribedEmail');
    if (savedEmail) {
        currentEmail = savedEmail;
        updateEmailStatus(true);
        elements.emailInput.value = savedEmail;
        elements.testEmailBtn.disabled = false;
    }
}

// Update push notification status
function updatePushStatus(isActive) {
    elements.pushStatus.textContent = isActive ? 'Active' : 'Inactive';
    elements.pushStatus.className = isActive ? 'badge badge-active' : 'badge badge-inactive';
    elements.enablePushBtn.style.display = isActive ? 'none' : 'block';
    elements.disablePushBtn.style.display = isActive ? 'block' : 'none';
    elements.testPushBtn.disabled = !isActive;
}

// Update email status
function updateEmailStatus(isSubscribed) {
    elements.emailStatus.textContent = isSubscribed ? 'Subscribed' : 'Not Subscribed';
    elements.emailStatus.className = isSubscribed ? 'badge badge-active' : 'badge badge-inactive';
}

// Enable push notifications
async function enablePushNotifications() {
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            const token = await messaging.getToken({
                vapidKey: messagingKey
            });
            
            if (token) {
                currentToken = token;
                
                // Save token to Firestore
                await db.collection('push_tokens').doc(token).set({
                    token: token,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    enabled: true
                });
                
                updatePushStatus(true);
                elements.tokenText.textContent = token;
                elements.pushToken.style.display = 'block';
                
                showNotification('Success!', 'Push notifications enabled successfully');
            }
        } else {
            alert('Push notification permission denied. Please enable it in your browser settings.');
        }
    } catch (error) {
        console.error('Error enabling push notifications:', error);
        alert('Error enabling push notifications: ' + error.message);
    }
}

// Disable push notifications
async function disablePushNotifications() {
    try {
        if (currentToken) {
            // Update Firestore
            await db.collection('push_tokens').doc(currentToken).update({
                enabled: false,
                disabledAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            currentToken = null;
            updatePushStatus(false);
            elements.pushToken.style.display = 'none';
        }
    } catch (error) {
        console.error('Error disabling push notifications:', error);
        alert('Error disabling push notifications: ' + error.message);
    }
}

// Subscribe to email notifications
async function subscribeToEmail(event) {
    event.preventDefault();
    
    const email = elements.emailInput.value.trim();
    const name = elements.nameInput.value.trim();
    
    if (!email) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        // Save to Firestore
        await db.collection('email_subscribers').doc(email).set({
            email: email,
            name: name || null,
            subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
            enabled: true
        });
        
        // Save to localStorage
        localStorage.setItem('subscribedEmail', email);
        currentEmail = email;
        
        updateEmailStatus(true);
        elements.emailSuccess.style.display = 'block';
        elements.testEmailBtn.disabled = false;
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            elements.emailSuccess.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('Error subscribing to email:', error);
        alert('Error subscribing: ' + error.message);
    }
}

// Send test push notification
async function sendTestPush() {
    if (!currentToken) {
        alert('Please enable push notifications first');
        return;
    }
    
    try {
        elements.testResult.style.display = 'block';
        elements.testResult.textContent = '⏳ Sending test push notification...';
        
        // Call cloud function to send notification
        const response = await fetch('YOUR_CLOUD_FUNCTION_URL/sendTestNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: currentToken,
                type: 'push'
            })
        });
        
        if (response.ok) {
            elements.testResult.textContent = '✅ Test push notification sent!';
            elements.testResult.className = 'info-box';
        } else {
            throw new Error('Failed to send notification');
        }
    } catch (error) {
        console.error('Error sending test push:', error);
        elements.testResult.textContent = '❌ Error: ' + error.message;
        elements.testResult.className = 'info-box';
    }
}

// Send test email
async function sendTestEmail() {
    if (!currentEmail) {
        alert('Please subscribe to email notifications first');
        return;
    }
    
    try {
        elements.testResult.style.display = 'block';
        elements.testResult.textContent = '⏳ Sending test email...';
        
        // Trigger email by adding document to Firestore (if using Trigger Email extension)
        await db.collection('mail').add({
            to: currentEmail,
            message: {
                subject: 'Test Email from Your App',
                html: `
                    <h2>Test Email</h2>
                    <p>This is a test email to verify that email notifications are working correctly!</p>
                    <p>If you received this, everything is set up properly.</p>
                `
            }
        });
        
        elements.testResult.textContent = '✅ Test email sent! Check your inbox.';
        elements.testResult.className = 'info-box';
    } catch (error) {
        console.error('Error sending test email:', error);
        elements.testResult.textContent = '❌ Error: ' + error.message;
        elements.testResult.className = 'info-box';
    }
}

// Send notification to all users
async function sendToAllUsers(event) {
    event.preventDefault();
    
    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const sendPush = document.getElementById('sendPushToAll').checked;
    const sendEmail = document.getElementById('sendEmailToAll').checked;
    
    if (!title || !message) {
        alert('Please fill in both title and message');
        return;
    }
    
    if (!sendPush && !sendEmail) {
        alert('Please select at least one notification method');
        return;
    }
    
    try {
        elements.adminResult.style.display = 'block';
        elements.adminResult.textContent = '⏳ Sending notifications...';
        elements.adminResult.className = 'alert';
        
        // Call cloud function to send to all users
        const response = await fetch('YOUR_CLOUD_FUNCTION_URL/sendToAllUsers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                message,
                sendPush,
                sendEmail
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            elements.adminResult.textContent = `✅ Notifications sent! Push: ${result.pushCount || 0}, Email: ${result.emailCount || 0}`;
            elements.adminResult.className = 'alert alert-success';
            elements.adminForm.reset();
        } else {
            throw new Error(result.error || 'Failed to send notifications');
        }
    } catch (error) {
        console.error('Error sending notifications:', error);
        elements.adminResult.textContent = '❌ Error: ' + error.message;
        elements.adminResult.className = 'alert alert-error';
    }
}

// Show browser notification
function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/icon.png', // Add your icon
            badge: '/badge.png' // Add your badge
        });
    }
}

// Handle foreground messages
messaging.onMessage((payload) => {
    console.log('Message received:', payload);
    showNotification(
        payload.notification?.title || 'New Notification',
        payload.notification?.body || 'You have a new notification'
    );
});

// Set up event listeners
function setupEventListeners() {
    elements.enablePushBtn.addEventListener('click', enablePushNotifications);
    elements.disablePushBtn.addEventListener('click', disablePushNotifications);
    elements.emailForm.addEventListener('submit', subscribeToEmail);
    elements.testPushBtn.addEventListener('click', sendTestPush);
    elements.testEmailBtn.addEventListener('click', sendTestEmail);
    elements.adminForm.addEventListener('submit', sendToAllUsers);
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
