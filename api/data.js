// Vercel 서버리스 함수 — Google Apps Script 웹앱(구글시트) 프록시
// 프론트는 same-origin 으로만 호출하므로 CORS 문제가 없고,
// 서버↔GAS 는 server-to-server 라 GAS 의 CORS 제약도 적용되지 않습니다.
//
//   GET  /api/data                  → { ok, yard, partners, projects }
//   POST /api/data  { action, payload }  → { ok, ... }
//
// GAS_URL 미설정 시 503 을 반환하고, 클라이언트는 샘플 데이터로 폴백합니다.
export default async function handler(req, res) {
  const GAS = process.env.GAS_URL
  if (!GAS || GAS.includes('XXXXXXXX')) {
    res.status(503).json({ ok: false, error: 'GAS_URL 미설정' })
    return
  }

  try {
    if (req.method === 'GET') {
      const r = await fetch(GAS + '?action=list')
      const data = await r.json()
      res.status(200).json(data)
      return
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      const r = await fetch(GAS, {
        method: 'POST',
        // text/plain 으로 보내 GAS 측 프리플라이트를 회피 (서버↔서버라 큰 의미는 없지만 안전)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      res.status(200).json(data)
      return
    }

    res.status(405).json({ ok: false, error: 'method not allowed' })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
}
