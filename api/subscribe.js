const webpush = require('web-push');

// グローバル変数でデータを保存（実際の本番環境ではデータベースを使用）
let subscriptions = [];
let scheduledNotifications = [];

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

// 通知をスケジュール
function scheduleNotifications(subscription, bedtime) {
  const [hours, minutes] = bedtime.split(':').map(Number);
  const now = new Date();
  
  // お風呂の通知（1時間半前）
  const bathTime = new Date();
  bathTime.setHours(hours, minutes - 90, 0, 0);
  if (bathTime <= now) {
    bathTime.setDate(bathTime.getDate() + 1);
  }
  
  // 就寝準備の通知（30分前）
  const prepTime = new Date();
  prepTime.setHours(hours, minutes - 30, 0, 0);
  if (prepTime <= now) {
    prepTime.setDate(prepTime.getDate() + 1);
  }

  const bathDelay = bathTime.getTime() - now.getTime();
  const prepDelay = prepTime.getTime() - now.getTime();

  // 既存のタイマーをクリア
  clearScheduledNotifications(subscription.endpoint);

  // 新しい通知をスケジュール
  if (bathDelay > 0) {
    const timeoutId = setTimeout(() => {
      sendPushNotification(subscription, {
        title: '🛁 お風呂の時間です',
        body: 'リラックスしてお風呂に入りましょう',
        tag: 'bath-notification'
      });
    }, bathDelay);
    
    scheduledNotifications.push({
      endpoint: subscription.endpoint,
      timeoutId,
      type: 'bath'
    });
  }

  if (prepDelay > 0) {
    const timeoutId = setTimeout(() => {
      sendPushNotification(subscription, {
        title: '🧘 就寝準備の時間です',
        body: 'ヨガをしたり、スマホを離れて、明かりを暗くしましょう',
        tag: 'prep-notification'
      });
    }, prepDelay);
    
    scheduledNotifications.push({
      endpoint: subscription.endpoint,
      timeoutId,
      type: 'prep'
    });
  }

  console.log(`Notifications scheduled for ${subscription.endpoint}:`);
  console.log(`お風呂: ${bathTime.toLocaleString('ja-JP')} (${bathDelay}ms後)`);
  console.log(`就寝準備: ${prepTime.toLocaleString('ja-JP')} (${prepDelay}ms後)`);
}

// スケジュールされた通知をクリア
function clearScheduledNotifications(endpoint) {
  scheduledNotifications
    .filter(n => n.endpoint === endpoint)
    .forEach(n => clearTimeout(n.timeoutId));
  
  scheduledNotifications = scheduledNotifications.filter(n => n.endpoint !== endpoint);
}

// Push通知を送信
async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // subscriptionが無効な場合は削除
    if (error.statusCode === 410) {
      subscriptions = subscriptions.filter(s => s.subscription.endpoint !== subscription.endpoint);
      console.log('Invalid subscription removed');
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, bedtime } = req.body;
  
  // 既存のsubscriptionを削除
  subscriptions = subscriptions.filter(s => s.subscription.endpoint !== subscription.endpoint);
  
  // 新しいsubscriptionを追加
  subscriptions.push({
    subscription,
    bedtime,
    timestamp: Date.now()
  });
  
  console.log('New subscription registered:', subscription.endpoint);
  console.log('Bedtime:', bedtime);
  
  // 通知をスケジュール
  scheduleNotifications(subscription, bedtime);
  
  res.status(201).json({ message: 'Subscription registered successfully' });
}