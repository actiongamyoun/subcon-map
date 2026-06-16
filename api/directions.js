// Vercel 서버리스 함수 — 카카오 모빌리티 자동차 길찾기 프록시
// 요청:  GET /api/directions?origin=lng,lat&destination=lng,lat
// 응답:  { path:[[lat,lng]...], distance(m), duration(s) }
//
// REST 키는 서버에만 존재(KAKAO_REST_KEY). 클라이언트로 노출되지 않습니다.
export default async function handler(req, res) {
  const { origin, destination } = req.query || {}
  if (!origin || !destination) {
    res.status(400).json({ error: 'origin/destination 파라미터가 필요합니다 (lng,lat 형식)' })
    return
  }
  const key = process.env.KAKAO_REST_KEY
  if (!key) {
    res.status(500).json({ error: 'KAKAO_REST_KEY 미설정' })
    return
  }

  try {
    const url =
      'https://apis-navi.kakaomobility.com/v1/directions' +
      `?origin=${encodeURIComponent(origin)}` +
      `&destination=${encodeURIComponent(destination)}` +
      '&priority=RECOMMEND&car_fuel=GASOLINE&alternatives=false'

    const r = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
    const data = await r.json()
    const route = data && data.routes && data.routes[0]

    if (!route || route.result_code !== 0) {
      res.status(200).json({
        error: (route && route.result_msg) || 'no route',
        result_code: route && route.result_code,
      })
      return
    }

    // sections[].roads[].vertexes 는 [x,y,x,y,...] (x=lng, y=lat) 평면 배열
    const path = []
    for (const sec of route.sections || []) {
      for (const road of sec.roads || []) {
        const v = road.vertexes || []
        for (let i = 0; i < v.length; i += 2) {
          path.push([v[i + 1], v[i]]) // [lat, lng]
        }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate')
    res.status(200).json({
      path,
      distance: route.summary.distance,
      duration: route.summary.duration,
    })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
