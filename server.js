const express = require('express');
const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(express.json());
app.use(express.static('.'));

// VAPID設定（実際のプロジェクトでは環境変数を使用）
const vapidKeys = {
  publicKey: 'BMqSvZeRGN-MKOQNWyBK3W3TmAC8gWnJhGfL9z0hGXfV2G7_3WyH8r_7zYN1Z9Q1mBG5X0C4_X0o7Y1Z9Q1nBG5Y1Z',
  privateKey: 'your-private-key-here'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// データストレージ（実際のプロジェクトではデータベースを使用）
let subscriptions = [];
let scheduledNotifications = [];

// Push subscription を登録
app.post('/api/subscribe', (req, res) => {
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
});

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

// テスト用のPush通知送信エンドポイント
app.post('/api/test-notification', async (req, res) => {
  const { message } = req.body;
  
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
});

// 登録されたsubscriptionの一覧を取得
app.get('/api/subscriptions', (req, res) => {
  res.json({
    count: subscriptions.length,
    subscriptions: subscriptions.map(s => ({
      endpoint: s.subscription.endpoint,
      bedtime: s.bedtime,
      timestamp: s.timestamp
    }))
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Push notification server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to access the app`);
});