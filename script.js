class SleepChecker {
    constructor() {
        this.bedtime = null;
        this.notifications = [];
        this.init();
    }

    init() {
        this.loadSavedBedtime();
        this.setupEventListeners();
        this.updateScheduleDisplay();
        this.checkNotificationSupport();
    }

    setupEventListeners() {
        const setBedtimeBtn = document.getElementById('setBedtime');
        const enableNotificationsBtn = document.getElementById('enableNotifications');
        const testNotificationBtn = document.getElementById('testNotification');
        const bedtimeInput = document.getElementById('bedtime');

        setBedtimeBtn.addEventListener('click', () => this.setBedtime());
        enableNotificationsBtn.addEventListener('click', () => this.enableNotifications());
        testNotificationBtn.addEventListener('click', () => this.sendTestNotification());
        bedtimeInput.addEventListener('change', () => this.updateScheduleDisplay());
    }

    setBedtime() {
        const bedtimeInput = document.getElementById('bedtime');
        const time = bedtimeInput.value;
        
        if (!time) {
            alert('就寝時間を選択してください');
            return;
        }

        this.bedtime = time;
        localStorage.setItem('bedtime', time);
        this.updateScheduleDisplay();
        this.scheduleNotifications();
        
        this.showStatus('就寝時間が設定されました！', 'success');
    }

    updateScheduleDisplay() {
        const bedtimeInput = document.getElementById('bedtime');
        const bedtime = bedtimeInput.value;
        
        if (!bedtime) return;

        const [hours, minutes] = bedtime.split(':').map(Number);
        
        // 1時間半前（お風呂）
        const bathTime = new Date();
        bathTime.setHours(hours, minutes - 90, 0, 0);
        if (bathTime.getDate() !== new Date().getDate()) {
            bathTime.setDate(bathTime.getDate() + 1);
        }
        
        // 30分前（就寝準備）
        const prepTime = new Date();
        prepTime.setHours(hours, minutes - 30, 0, 0);
        if (prepTime.getDate() !== new Date().getDate()) {
            prepTime.setDate(prepTime.getDate() + 1);
        }

        document.getElementById('bathTime').textContent = this.formatTime(bathTime);
        document.getElementById('prepTime').textContent = this.formatTime(prepTime);
        document.getElementById('sleepTime').textContent = bedtime;
    }

    formatTime(date) {
        return date.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    async enableNotifications() {
        if (!('Notification' in window)) {
            this.showStatus('このブラウザは通知をサポートしていません', 'error');
            return;
        }

        if (!('serviceWorker' in navigator)) {
            this.showStatus('このブラウザはサービスワーカーをサポートしていません', 'error');
            return;
        }

        if (Notification.permission === 'granted') {
            await this.setupPushNotifications();
            this.showStatus('通知は既に有効になっています', 'success');
            this.scheduleNotifications();
            return;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await this.setupPushNotifications();
                this.showStatus('通知が有効になりました！', 'success');
                this.scheduleNotifications();
            } else {
                this.showStatus('通知が拒否されました', 'error');
            }
        } else {
            this.showStatus('通知が拒否されています。ブラウザ設定で有効にしてください', 'error');
        }
    }

    scheduleNotifications() {
        if (!this.bedtime || Notification.permission !== 'granted') {
            return;
        }

        // Service Workerに通知スケジュールを委託
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SCHEDULE_NOTIFICATIONS',
                bedtime: this.bedtime
            });
            console.log(`通知スケジュールをService Workerに送信: ${this.bedtime}`);
        } else {
            // フォールバック: 従来の方式
            this.scheduleNotificationsFallback();
        }
    }

    scheduleNotificationsFallback() {
        // 既存の通知をクリア
        this.notifications.forEach(id => clearTimeout(id));
        this.notifications = [];

        const [hours, minutes] = this.bedtime.split(':').map(Number);
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

        if (bathDelay > 0) {
            const bathNotification = setTimeout(() => {
                this.showNotification('🛁 お風呂の時間です', 'リラックスしてお風呂に入りましょう');
            }, bathDelay);
            this.notifications.push(bathNotification);
        }

        if (prepDelay > 0) {
            const prepNotification = setTimeout(() => {
                this.showNotification('🧘 就寝準備の時間です', 'ヨガをしたり、スマホを離れて、明かりを暗くしましょう');
            }, prepDelay);
            this.notifications.push(prepNotification);
        }

        console.log(`フォールバック通知スケジュール設定完了:
        お風呂: ${bathTime.toLocaleString('ja-JP')}
        就寝準備: ${prepTime.toLocaleString('ja-JP')}`);
    }

    showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><text y="24" font-size="24">😴</text></svg>',
                requireInteraction: true
            });
        }
    }

    checkNotificationSupport() {
        const status = document.getElementById('notificationStatus');
        if (!('Notification' in window)) {
            status.textContent = 'このブラウザは通知をサポートしていません';
            status.className = 'status error';
        } else if (Notification.permission === 'granted') {
            status.textContent = '通知が有効です';
            status.className = 'status success';
        } else {
            status.textContent = '通知を有効にしてください';
            status.className = 'status';
        }
    }

    loadSavedBedtime() {
        const savedBedtime = localStorage.getItem('bedtime');
        if (savedBedtime) {
            document.getElementById('bedtime').value = savedBedtime;
            this.bedtime = savedBedtime;
        }
    }

    async setupPushNotifications() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // VAPID公開鍵（実際のプロジェクトでは環境変数から取得）
            const vapidPublicKey = 'BITMyDCK1xhL-vMlpnMc6yhrwwA7MkgLuKJnk_m032tfgVwjyoK9Sp_0FLGEglUVOGKNe1JDVTvv3lI8i6yjYZs';
            
            // 既存のsubscriptionをチェック
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // 新しいsubscriptionを作成
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
                });
            }
            
            // subscriptionをサーバーに送信
            await this.sendSubscriptionToServer(subscription);
            
            // localStorageにも保存
            localStorage.setItem('pushSubscription', JSON.stringify(subscription));
            
            // Service Workerにsubscriptionを送信
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'STORE_PUSH_SUBSCRIPTION',
                    subscription: subscription,
                    bedtime: this.bedtime
                });
            }
            
            console.log('Push subscription setup complete:', subscription.endpoint);
            
        } catch (error) {
            console.error('Push notification setup failed:', error);
            this.showStatus('Push通知の設定に失敗しました', 'error');
        }
    }

    async sendSubscriptionToServer(subscription) {
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    subscription: subscription,
                    bedtime: this.bedtime
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Subscription sent to server:', result);
            
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
            // サーバーに送信できない場合はローカルでフォールバック
            this.scheduleNotificationsFallback();
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async sendTestNotification() {
        const testMessage = document.getElementById('testMessage').value;
        
        try {
            const response = await fetch('/api/test-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: testMessage || 'これはテスト通知です'
                })
            });
            
            if (response.ok) {
                this.showStatus('テスト通知を送信しました', 'success');
            } else {
                const error = await response.json();
                this.showStatus(`テスト通知の送信に失敗: ${error.error}`, 'error');
            }
        } catch (error) {
            console.error('Test notification error:', error);
            this.showStatus('テスト通知の送信に失敗しました', 'error');
        }
    }

    showStatus(message, type) {
        const status = document.getElementById('notificationStatus');
        status.textContent = message;
        status.className = `status ${type}`;
        
        setTimeout(() => {
            this.checkNotificationSupport();
        }, 3000);
    }
}

// Service Workerを登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });

    // Service Workerからのメッセージを受信
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'STORE_SUBSCRIPTION_DATA') {
            // subscriptionデータをlocalStorageに保存
            localStorage.setItem('subscriptionData', JSON.stringify(event.data.data));
            console.log('Subscription data stored from Service Worker');
        }
    });
}

// アプリを初期化
document.addEventListener('DOMContentLoaded', () => {
    new SleepChecker();
});