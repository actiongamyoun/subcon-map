// 위치 검색 / 주소→좌표 변환 헬퍼.
// 지도는 OpenStreetMap(Leaflet)을 사용하므로 카카오 지도 JS SDK는 로드하지 않습니다.
// 검색은 서버의 /api/geocode (카카오 Local 키워드+주소 검색 프록시)를 통해 처리합니다.
//   - 카카오맵 검색창과 동일한 엔진. REST 키만 있으면 작동(도메인 등록/비즈 심사 불필요).
//   - 로컬 `npm run dev`(서버리스 미구동) 환경에서는 빈 결과를 반환합니다.

// 업체명/주소로 장소 후보 목록을 검색 → [{ name, addr, lat, lng }, ...]
export async function searchPlaces(query) {
  if (!query || !query.trim()) return []
  try {
    const r = await fetch('/api/geocode?query=' + encodeURIComponent(query.trim()))
    if (!r.ok) return []
    const data = await r.json()
    return Array.isArray(data.results) ? data.results : []
  } catch {
    return []
  }
}

// 단일 좌표 변환(경로용 폴백) — 협력사에 좌표가 없을 때 주소로 첫 결과를 사용
export async function geocode(address) {
  if (!address) return null
  try {
    const r = await fetch('/api/geocode?query=' + encodeURIComponent(address))
    if (!r.ok) return null
    const data = await r.json()
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number' && !isNaN(data.lat)) {
      return { lat: data.lat, lng: data.lng }
    }
    return null
  } catch {
    return null
  }
}
