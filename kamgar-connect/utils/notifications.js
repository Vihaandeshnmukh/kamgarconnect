const fetch = require('node-fetch');

/**
 * Sends a push notification via Expo's push service.
 * @param {string} pushToken - The Expo push token of the recipient.
 * @param {string} title - Title of the notification.
 * @param {string} body - Body text of the notification.
 * @param {object} data - Optional data payload for the app.
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data
      })
    });
    console.log(`Push sent to ${pushToken}: ${title}`);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

module.exports = { sendPushNotification };
