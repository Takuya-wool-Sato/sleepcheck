const CACHE_NAME = 'sleep-checker-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/checklist.html',
  '/bath-time.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// 通知タグ
const NOTIFICATION_TAGS = {
  BATH: 'bath-notification',
  PREP: 'prep-notification'
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Push通知受信
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const { title, body, tag } = data;
    
    const options = {
      body: body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" fill="%234f46e5"/><text x="96" y="120" font-size="96" text-anchor="middle" fill="white">😴</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" fill="%234f46e5"/><text x="96" y="120" font-size="96" text-anchor="middle" fill="white">😴</text></svg>',
      tag: tag,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'アプリを開く'
        },
        {
          action: 'dismiss',
          title: '閉じる'
        }
      ],
      data: {
        url: tag === NOTIFICATION_TAGS.BATH ? '/bath-time.html' : '/checklist.html'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// メッセージ受信（メインスレッドからの通知スケジュール）
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const { bedtime } = event.data;
    scheduleNotifications(bedtime);
  } else if (event.data && event.data.type === 'STORE_PUSH_SUBSCRIPTION') {
    const { subscription, bedtime } = event.data;
    storePushSubscription(subscription, bedtime);
  }
});

// 通知をスケジュール
function scheduleNotifications(bedtime) {
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

  // 既存の通知をクリア
  self.registration.getNotifications().then(notifications => {
    notifications.forEach(notification => notification.close());
  });

  // 新しい通知をスケジュール
  if (bathDelay > 0) {
    setTimeout(() => {
      showNotification(
        '🛁 お風呂の時間です',
        'リラックスしてお風呂に入りましょう',
        NOTIFICATION_TAGS.BATH
      );
    }, bathDelay);
  }

  if (prepDelay > 0) {
    setTimeout(() => {
      showNotification(
        '🧘 就寝準備の時間です',
        'ヨガをしたり、スマホを離れて、明かりを暗くしましょう',
        NOTIFICATION_TAGS.PREP
      );
    }, prepDelay);
  }

  console.log(`Service Worker: 通知スケジュール設定完了
  お風呂: ${bathTime.toLocaleString('ja-JP')} (${bathDelay}ms後)
  就寝準備: ${prepTime.toLocaleString('ja-JP')} (${prepDelay}ms後)`);
}

// 通知を表示
function showNotification(title, body, tag) {
  const options = {
    body: body,
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    tag: tag,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'アプリを開く'
      },
      {
        action: 'dismiss',
        title: '閉じる'
      }
    ],
    data: {
      url: '/'
    }
  };

  self.registration.showNotification(title, options);
}

// Push subscriptionを保存
function storePushSubscription(subscription, bedtime) {
  // IndexedDBに保存（簡易版はlocalStorageを使用）
  const subscriptionData = {
    subscription: subscription,
    bedtime: bedtime,
    timestamp: Date.now()
  };
  
  // Service Worker内ではlocalStorageが使えないので、postMessageでメインスレッドに送信
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'STORE_SUBSCRIPTION_DATA',
        data: subscriptionData
      });
    });
  });
  
  console.log('Push subscription stored:', subscription.endpoint);
}

// 通知クリック処理
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  let targetUrl = '/';
  
  // お風呂の通知の場合はお風呂ページを開く
  if (event.notification.tag === NOTIFICATION_TAGS.BATH) {
    targetUrl = '/bath-time.html';
  }
  // 就寝準備の通知の場合はチェックリストページを開く
  else if (event.notification.tag === NOTIFICATION_TAGS.PREP) {
    targetUrl = '/checklist.html';
  }

  // アプリを開く
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // 既にアプリが開いている場合はそれにフォーカス
      for (let client of clientList) {
        if (client.url.includes(targetUrl.replace('/', '')) && 'focus' in client) {
          return client.focus();
        }
      }
      // 新しいウィンドウを開く
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});