// Vercel Functions間でデータを共有するためのモジュール
// 実際の本番環境ではデータベースを使用すること

// グローバルオブジェクトにデータを保存
if (!global.subscriptions) {
  global.subscriptions = [];
}

if (!global.scheduledNotifications) {
  global.scheduledNotifications = [];
}

module.exports = {
  getSubscriptions: () => global.subscriptions,
  setSubscriptions: (subs) => { global.subscriptions = subs; },
  addSubscription: (sub) => { global.subscriptions.push(sub); },
  removeSubscription: (endpoint) => {
    global.subscriptions = global.subscriptions.filter(s => s.subscription.endpoint !== endpoint);
  },
  
  getScheduledNotifications: () => global.scheduledNotifications,
  setScheduledNotifications: (notifications) => { global.scheduledNotifications = notifications; },
  addScheduledNotification: (notification) => { global.scheduledNotifications.push(notification); },
  clearScheduledNotifications: (endpoint) => {
    global.scheduledNotifications
      .filter(n => n.endpoint === endpoint)
      .forEach(n => clearTimeout(n.timeoutId));
    global.scheduledNotifications = global.scheduledNotifications.filter(n => n.endpoint !== endpoint);
  }
};