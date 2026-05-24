// PLAUD API汎用プロキシ
// ブラウザからのCORSを回避してPLAUD APIを中継する

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Plaud-Base');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.query.path;
  const auth = req.headers['authorization'];
  const base = req.headers['x-plaud-base'] || 'https://api-apne1.plaud.ai';

  if (!path || !auth) {
    return res.status(400).json({ error: 'MISSING_PATH_OR_AUTH' });
  }

  // セキュリティ: plaud.aiドメインのみ許可
  if (!base.match(/^https:\/\/[a-z0-9-]+\.plaud\.ai$/)) {
    return res.status(403).json({ error: 'INVALID_BASE_URL' });
  }

  try {
    const plaudRes = await fetch(`${base}${path}`, {
      method: req.method,
      headers: { Authorization: auth },
    });

    const data = await plaudRes.json();
    return res.status(plaudRes.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'PROXY_ERROR', detail: e.message });
  }
}
