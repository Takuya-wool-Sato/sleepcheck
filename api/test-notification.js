const webpush = require('web-push');
const sharedData = require('./shared-data');

// VAPID設定
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BITMyDCK1xhL-vMlpnMc6yhrwwA7MkgLuKJnk_m032tfgVwjyoK9Sp_0FLGEglUVOGKNe1JDVTvv3lI8i6yjYZs',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'wmhXfHGMJNFX0uc1NynvMgQTlQzixXJg3ueogSgF2sU'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Push通知を送信
async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // subscriptionが無効な場合は削除
    if (error.statusCode === 410) {
      sharedData.removeSubscription(subscription.endpoint);
      console.log('Invalid subscription removed');
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  
  const subscriptions = sharedData.getSubscriptions();
  
  if (subscriptions.length === 0) {
    return res.status(400).json({ error: 'No subscriptions found' });
  }
  
  const testPayload = {
    title: 'テスト通知',
    body: message || 'これはテスト通知です',
    tag: 'test-notification'
  };
  
  try {
    await Promise.all(
      subscriptions.map(s => sendPushNotification(s.subscription, testPayload))
    );
    res.json({ message: 'Test notifications sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notifications' });
  }
}