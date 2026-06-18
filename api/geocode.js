// Vercel 서버리스 함수 — 카카오 Local 검색 (장소/주소) 프록시
// 카카오맵 검색창과 동일한 엔진(키워드 검색 + 주소 검색)을 사용합니다.
// REST 키만 있으면 작동 — 카카오맵 활성화/도메인 등록 불필요(서버↔카카오 호출).
//
//   GET /api/geocode?query=검색어
//   → { results: [{ name, addr, lat, lng }, ...], lat, lng }   (lat/lng = 첫 결과, 폴백용)
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
  const results = []
  const seen = new Set()
  const push = (name, addr, x, y) => {
    const lat = parseFloat(y), lng = parseFloat(x)
    if (isNaN(lat) || isNaN(lng)) return
    const k = lat.toFixed(5) + ',' + lng.toFixed(5)
    if (seen.has(k)) return
    seen.add(k)
    results.push({ name: name || addr, addr: addr || name, lat, lng })
  }

  try {
    // 1) 키워드(장소) 검색 — 상호명/지명 ("현대중공업 울산" 등)
    let r = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?size=10&query=${enc}`, { headers })
    let data = await r.json()
    for (const d of (data.documents || [])) {
      push(d.place_name, d.road_address_name || d.address_name || '', d.x, d.y)
    }

    // 2) 주소 검색 — 순수 주소 (도로명/지번)
    r = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?size=10&query=${enc}`, { headers })
    data = await r.json()
    for (const d of (data.documents || [])) {
      const road = d.road_address && d.road_address.address_name
      const addr = road || d.address_name || ''
      push(addr, addr, d.x, d.y)
    }

    const first = results[0]
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
    res.status(200).json({
      results: results.slice(0, 8),
      lat: first ? first.lat : undefined,
      lng: first ? first.lng : undefined,
    })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
