// Vercel 서버리스 함수 — 주소→좌표 변환 (카카오 Local REST API 프록시)
// 지도는 OpenStreetMap(Leaflet)을 쓰므로, 좌표 변환만 서버에서 카카오 REST로 처리합니다.
// 서버↔카카오 호출이라 광고 차단·도메인 등록·카카오맵 활성화의 영향을 받지 않습니다.
//
//   GET /api/geocode?query=주소문자열  →  { lat, lng }  또는  { error }
export default async function handler(req, res) {
  const query = req.query && req.query.query
  if (!query) {
    res.status(400).json({ error: 'query 파라미터가 필요합니다' })
    return
  }
  const key = process.env.KAKAO_REST_KEY
  if (!key) {
    res.status(500).json({ error: 'KAKAO_REST_KEY 미설정' })
    return
  }

  const headers = { Authorization: `KakaoAK ${key}` }
  const enc = encodeURIComponent(query)

  try {
    // 1) 주소 검색 (도로명/지번)
    let r = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${enc}`, { headers })
    let data = await r.json()
    let doc = data && data.documents && data.documents[0]
    if (doc) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
      res.status(200).json({ lat: parseFloat(doc.y), lng: parseFloat(doc.x), source: 'address' })
      return
    }

    // 2) 키워드(장소) 검색 폴백
    r = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${enc}`, { headers })
    data = await r.json()
    doc = data && data.documents && data.documents[0]
    if (doc) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
      res.status(200).json({ lat: parseFloat(doc.y), lng: parseFloat(doc.x), source: 'keyword' })
      return
    }

    res.status(200).json({ error: 'not found' })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
