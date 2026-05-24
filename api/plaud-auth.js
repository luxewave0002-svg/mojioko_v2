// PLAUD ログインプロキシ
// CORS問題を回避してサーバー側からPLAUD認証を行う

export default async function handler(req, res) {
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
    'https://api-apne1.plaud.ai', // Japan (AP Northeast)
    'https://api.plaud.ai',        // US
    'https://api-euc1.plaud.ai',   // EU
  ];

  for (const base of BASES) {
    try {
      const authRes = await fetch(`${base}/auth/access-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!authRes.ok) continue;

      const data = await authRes.json();
      const token = data.access_token || data.data?.access_token;
      if (!token) continue;

      // ワークスペーストークンとドメインを取得
      let apiBase = base;
      let finalToken = token;

      try {
        const wsRes = await fetch(`${base}/user/workspace/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          const ws = wsData.data?.list?.[0] || wsData.data?.[0];
          if (ws?.domain) apiBase = ws.domain;
          if (ws?.workspaceToken) finalToken = ws.workspaceToken;
        }
      } catch (_) {
        // workspaceトークン取得失敗時はuserトークンで続行
      }

      return res.status(200).json({ token: finalToken, apiBase });
    } catch (_) {
      continue;
    }
  }

  return res.status(401).json({ error: 'AUTH_FAILED' });
}
