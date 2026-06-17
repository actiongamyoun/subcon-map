// 주소 → 좌표 변환 헬퍼.
// 지도는 OpenStreetMap(Leaflet)을 사용하므로 카카오 지도 JS SDK는 더 이상 로드하지 않습니다.
// 좌표 변환은 서버의 /api/geocode (카카오 Local REST API 프록시)를 통해 처리합니다.
//   - 광고 차단 / 웹도메인 등록 / 카카오맵 활성화의 영향을 받지 않습니다.
//   - 로컬 `npm run dev`(서버리스 미구동) 환경에서는 null을 반환하므로, 모달에서 좌표를 직접 입력하면 됩니다.

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
