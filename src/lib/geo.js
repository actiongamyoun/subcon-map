// 지리 계산 유틸 + 길찾기 폴백용 경로 합성

const R = 6371000 // 지구 반지름(m)
const toRad = (d) => (d * Math.PI) / 180
const toDeg = (r) => (r * 180) / Math.PI

// 두 좌표 간 거리(m) — Haversine
export function haversine(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// 진행 방위(도, 0=동쪽 기준의 화면 회전용). 화면 좌표계 기준으로 atan2(dLat역, dLng)
export function screenBearing(p1, p2) {
  // 위도는 위로 갈수록 +, 화면 y는 아래로 +. 차량 아이콘은 +x(오른쪽)를 정면으로 그림.
  const dx = p2.lng - p1.lng
  const dy = p1.lat - p2.lat // 화면 y 보정
  return toDeg(Math.atan2(dy, dx))
}

// 경로 폴백: 출발-도착 사이를 약간 휜 곡선으로 보간한 [lat,lng] 배열
// (실제 도로 경로 API가 없을 때 차량 애니메이션용)
export function synthPath(origin, dest, n = 48) {
  const ox = origin.lng, oy = origin.lat
  const dx = dest.lng, dy = dest.lat
  // 수직 방향으로 약간 휜 제어점
  const mx = (ox + dx) / 2
  const my = (oy + dy) / 2
  const nx = -(dy - oy)
  const ny = (dx - ox)
  const len = Math.hypot(nx, ny) || 1
  const bow = Math.hypot(dx - ox, dy - oy) * 0.12
  const cx = mx + (nx / len) * bow
  const cy = my + (ny / len) * bow
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    const x = u * u * ox + 2 * u * t * cx + t * t * dx
    const y = u * u * oy + 2 * u * t * cy + t * t * dy
    pts.push([y, x]) // [lat, lng]
  }
  return pts
}

// 경로(점 배열)의 누적 길이와 세그먼트 길이
export function pathMetrics(path) {
  const seg = []
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const d = haversine(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])
    seg.push(d)
    total += d
  }
  return { seg, total }
}

// 진행률 t(0~1)에 해당하는 경로상의 점 + 직전/직후 점(방위 계산용)
export function pointAt(path, metrics, t) {
  const target = metrics.total * Math.max(0, Math.min(1, t))
  let acc = 0
  for (let i = 1; i < path.length; i++) {
    const s = metrics.seg[i - 1]
    if (acc + s >= target || i === path.length - 1) {
      const f = s === 0 ? 0 : (target - acc) / s
      const a = path[i - 1], b = path[i]
      const lat = a[0] + (b[0] - a[0]) * f
      const lng = a[1] + (b[1] - a[1]) * f
      return { lat, lng, from: { lat: a[0], lng: a[1] }, to: { lat: b[0], lng: b[1] }, idx: i }
    }
    acc += s
  }
  const last = path[path.length - 1]
  return { lat: last[0], lng: last[1], from: { lat: last[0], lng: last[1] }, to: { lat: last[0], lng: last[1] }, idx: path.length - 1 }
}
