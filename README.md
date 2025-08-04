# 睡眠チェック PWA

AndroidのPWAでアプリを閉じていても通知が届く睡眠管理アプリです。

## 機能

- 就寝時間の設定
- お風呂の時間の通知（就寝1時間半前）
- 就寝準備の通知（就寝30分前）
- アプリが閉じられていても通知を受信
- オフライン対応

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. VAPID鍵の生成

```bash
npm run generate-vapid
```

生成された鍵を以下のファイルに設定してください：
- `server.js`の`vapidKeys`
- `script.js`の`vapidPublicKey`

### 3. サーバーの起動

```bash
npm start
```

または開発用：

```bash
npm run dev
```

### 4. アプリへのアクセス

ブラウザで `http://localhost:3000` にアクセスしてください。

## AndroidでのPush通知設定

### Chrome（推奨）
1. ブラウザでアプリにアクセス
2. 「通知を有効にする」ボタンをクリック
3. 通知許可のダイアログで「許可」を選択
4. 就寝時間を設定

### PWAとしてインストール
1. Chromeでアプリにアクセス
2. メニューから「ホーム画面に追加」を選択
3. インストール後、ホーム画面からアプリを起動

## 重要な注意点

### Android端末での動作条件
- Chrome 42以降が必要
- Wi-Fi接続またはモバイルデータが必要
- バッテリー最適化の設定でChromeを除外することを推奨
- 端末の「おやすみモード」の設定を確認

### Push通知が届かない場合の対処法

1. **通知許可の確認**
   - Chrome設定 > サイトの設定 > 通知
   - アプリのドメインが許可されているか確認

2. **バッテリー最適化の無効化**
   - 設定 > バッテリー > バッテリー最適化
   - Chromeを最適化対象から除外

3. **データセーバーの確認**
   - Chrome設定 > データセーバー
   - 無効にするか、アプリのドメインを除外

4. **おやすみモードの設定**
   - 設定 > おやすみモード
   - アプリの通知を許可

## API エンドポイント

- `POST /api/subscribe` - Push subscription登録
- `POST /api/test-notification` - テスト通知送信
- `GET /api/subscriptions` - 登録済みsubscription一覧

## ファイル構成

```
sleepcheck/
├── index.html          # メインページ
├── checklist.html      # 就寝準備チェックリスト
├── bath-time.html      # お風呂ページ
├── script.js           # メインのJavaScript
├── sw.js              # Service Worker
├── style.css          # スタイルシート
├── manifest.json      # PWAマニフェスト
├── server.js          # Push通知サーバー
├── package.json       # Node.js依存関係
└── README.md          # このファイル
```

## トラブルシューティング

### 通知が届かない
1. ブラウザのデベロッパーツールでコンソールエラーを確認
2. Service Workerが正常に登録されているか確認
3. Push subscriptionが正常に作成されているか確認

### Service Workerの更新
キャッシュが古い場合は、ブラウザで強制リロード（Ctrl+Shift+R）を実行してください。

### サーバーエラー
- Node.jsが正常にインストールされているか確認
- ポート3000が使用可能か確認
- VAPID鍵が正しく設定されているか確認