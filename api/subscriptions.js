// グローバル変数でデータを保存（実際の本番環境ではデータベースを使用）
let subscriptions = [];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({
    count: subscriptions.length,
    subscriptions: subscriptions.map(s => ({
      endpoint: s.subscription.endpoint,
      bedtime: s.bedtime,
      timestamp: s.timestamp
    }))
  });
}