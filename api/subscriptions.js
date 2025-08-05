const sharedData = require('./shared-data');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const subscriptions = sharedData.getSubscriptions();

  res.json({
    count: subscriptions.length,
    subscriptions: subscriptions.map(s => ({
      endpoint: s.subscription.endpoint,
      bedtime: s.bedtime,
      timestamp: s.timestamp
    }))
  });
}