/**
 * Firebase Cloud Functions for Sending Notifications
 * 
 * Deploy these functions to Firebase:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Run: firebase init functions
 * 3. Copy this code to functions/index.js
 * 4. Run: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Send a test notification to a specific user
 * HTTP Endpoint: POST /sendTestNotification
 */
exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { token, type } = req.body;

        if (type === 'push' && token) {
            // Send push notification
            const message = {
                notification: {
                    title: '🧪 Test Notification',
                    body: 'This is a test push notification. Everything is working!',
                },
                data: {
                    timestamp: Date.now().toString(),
                    type: 'test'
                },
                token: token
            };

            await admin.messaging().send(message);
            res.status(200).json({ success: true, message: 'Push notification sent' });
        } else {
            res.status(400).json({ error: 'Invalid request' });
        }
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Send notification to all subscribed users
 * HTTP Endpoint: POST /sendToAllUsers
 */
exports.sendToAllUsers = functions.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const { title, message, sendPush, sendEmail } = req.body;

        let pushCount = 0;
        let emailCount = 0;

        // Send push notifications
        if (sendPush) {
            const tokensSnapshot = await db.collection('push_tokens')
                .where('enabled', '==', true)
                .get();

            const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

            if (tokens.length > 0) {
                // Send in batches of 500 (FCM limit)
                const batchSize = 500;
                for (let i = 0; i < tokens.length; i += batchSize) {
                    const batch = tokens.slice(i, i + batchSize);
                    
                    const multicastMessage = {
                        notification: {
                            title: title,
                            body: message,
                        },
                        tokens: batch
                    };

                    const response = await admin.messaging().sendMulticast(multicastMessage);
                    pushCount += response.successCount;

                    // Remove invalid tokens
                    if (response.failureCount > 0) {
                        const failedTokens = [];
                        response.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                failedTokens.push(batch[idx]);
                            }
                        });

                        // Delete failed tokens from database
                        const deletePromises = failedTokens.map(token => 
                            db.collection('push_tokens').doc(token).delete()
                        );
                        await Promise.all(deletePromises);
                    }
                }
            }
        }

        // Send email notifications
        if (sendEmail) {
            const emailsSnapshot = await db.collection('email_subscribers')
                .where('enabled', '==', true)
                .get();

            const emailPromises = emailsSnapshot.docs.map(doc => {
                const emailData = doc.data();
                return db.collection('mail').add({
                    to: emailData.email,
                    message: {
                        subject: title,
                        html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                                    .message { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
                                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>${title}</h1>
                                    </div>
                                    <div class="content">
                                        <div class="message">
                                            <p>${message}</p>
                                        </div>
                                        <div class="footer">
                                            <p>You're receiving this email because you subscribed to notifications.</p>
                                            <p><a href="YOUR_WEBSITE_URL">Manage your preferences</a></p>
                                        </div>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    }
                });
            });

            await Promise.all(emailPromises);
            emailCount = emailsSnapshot.size;
        }

        res.status(200).json({
            success: true,
            pushCount,
            emailCount
        });

    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Scheduled function to send daily digest (example)
 * Runs every day at 9 AM
 */
exports.sendDailyDigest = functions.pubsub.schedule('0 9 * * *')
    .timeZone('America/New_York')
    .onRun(async (context) => {
        try {
            // Get all active email subscribers
            const emailsSnapshot = await db.collection('email_subscribers')
                .where('enabled', '==', true)
                .get();

            const emailPromises = emailsSnapshot.docs.map(doc => {
                const emailData = doc.data();
                return db.collection('mail').add({
                    to: emailData.email,
                    message: {
                        subject: '📬 Your Daily Digest',
                        html: `
                            <h2>Good morning${emailData.name ? ', ' + emailData.name : ''}!</h2>
                            <p>Here's your daily digest of updates...</p>
                            <!-- Add your digest content here -->
                        `
                    }
                });
            });

            await Promise.all(emailPromises);
            console.log(`Daily digest sent to ${emailsSnapshot.size} subscribers`);

        } catch (error) {
            console.error('Error sending daily digest:', error);
        }
    });

/**
 * Cleanup function to remove old disabled subscriptions
 * Runs once a week
 */
exports.cleanupOldSubscriptions = functions.pubsub.schedule('0 0 * * 0')
    .onRun(async (context) => {
        try {
            const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            );

            // Delete old disabled push tokens
            const oldTokensSnapshot = await db.collection('push_tokens')
                .where('enabled', '==', false)
                .where('disabledAt', '<', thirtyDaysAgo)
                .get();

            const deletePromises = oldTokensSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);

            console.log(`Cleaned up ${deletePromises.length} old subscriptions`);

        } catch (error) {
            console.error('Error cleaning up subscriptions:', error);
        }
    });
