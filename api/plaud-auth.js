// PLAUD ログインプロキシ - CORS回避のためサーバー側で認証

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'EMAIL_AND_PASSWORD_REQUIRED' });
  }

  const BASES = [
    'https://api-apne1.plaud.ai',
    'https://api.plaud.ai',
    'https://api-euc1.plaud.ai',
  ];

  for (const base of BASES) {
    try {
      const authRes = await fetch(`${base}/auth/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Origin': 'https://app.plaud.ai',
          'Referer': 'https://app.plaud.ai/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ja,en;q=0.9',
        },
        body: new URLSearchParams({ username: email, password }).toString(),
      });

      if (!authRes.ok) continue;

      const data = await authRes.json();
      const token = data.access_token || (data.data && data.data.access_token);
      if (!token) continue;

      let apiBase = base;
      let finalToken = token;

      try {
        const wsRes = await fetch(`${base}/user/workspace/list`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          const ws = (wsData.data && wsData.data.list && wsData.data.list[0]) || (wsData.data && wsData.data[0]);
          if (ws && ws.domain) apiBase = ws.domain;
          if (ws && ws.workspaceToken) finalToken = ws.workspaceToken;
        }
      } catch (_) {}

      return res.status(200).json({ token: finalToken, apiBase });
    } catch (_) {
      continue;
    }
  }

  return res.status(401).json({ error: 'AUTH_FAILED' });
};
