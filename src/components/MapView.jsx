import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocode } from '../lib/kakao.js'
import { getDirections } from '../lib/api.js'
import { pathMetrics, pointAt } from '../lib/geo.js'
import { DEFAULT_YARD } from '../lib/constants.js'

const TRAVEL_MS = 3400
const FOLLOW_ZOOM = 13

function compassBearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const f1 = toRad(a.lat), f2 = toRad(b.lat), dl = toRad(b.lng - a.lng)
  const y = Math.sin(dl) * Math.cos(f2)
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)
  return (Math.atan2(y, x) * 180) / Math.PI
}
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function MapView({ yard, partner, onRouted }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const originMarkerRef = useRef(null)
  const destMarkerRef = useRef(null)
  const carRef = useRef(null)
  const faintRef = useRef(null)
  const liveRef = useRef(null)
  const rafRef = useRef(null)
  const runIdRef = useRef(0)

  const [ready, setReady] = useState(false)
  const [hintGone, setHintGone] = useState(false)
  const [readout, setReadout] = useState(null)
  const [errMsg, setErrMsg] = useState('')

  const origin = resolveOrigin(yard)

  // 지도 초기화 (OpenStreetMap)
  useEffect(() => {
    const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true })
      .setView([origin.lat, origin.lng], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    mapRef.current = map
    originMarkerRef.current = makePin(map, origin, 'origin', yard?.name || '조선소')
    setReady(true)
    const t = setTimeout(() => map.invalidateSize(), 200)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(rafRef.current)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 조선소(출발지) 변경 시 origin 핀 갱신
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (originMarkerRef.current) originMarkerRef.current.remove()
    originMarkerRef.current = makePin(map, origin, 'origin', yard?.name || '조선소')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yard?.name, origin.lat, origin.lng, ready])

  // 협력사 선택 → 경로
  useEffect(() => {
    if (!ready || !partner) return
    runRoute(partner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner?.id, ready])

  async function runRoute(p) {
    const map = mapRef.current
    if (!map) return
    const runId = ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    setErrMsg('')
    setReadout(null)
    setHintGone(true)

    // 목적지 좌표 (없으면 주소 지오코딩)
    let dest = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : await geocode(p.addr)
    if (runId !== runIdRef.current) return
    if (!dest) {
      setErrMsg(`‘${p.name}’의 위치를 찾지 못했습니다. 협력사 관리에서 주소나 좌표를 확인해 주세요.`)
      return
    }

    if (destMarkerRef.current) destMarkerRef.current.remove()
    destMarkerRef.current = makePin(map, dest, 'dest', p.name)

    // 길찾기 (실제 도로 or 폴백)
    const dir = await getDirections(origin, dest)
    if (runId !== runIdRef.current) return
    const path = dir.path && dir.path.length > 1 ? dir.path : [[origin.lat, origin.lng], [dest.lat, dest.lng]]
    const latlngs = path.map(([la, ln]) => [la, ln])

    if (faintRef.current) faintRef.current.remove()
    if (liveRef.current) liveRef.current.remove()
    faintRef.current = L.polyline(latlngs, { color: '#FF6A3D', weight: 5, opacity: 0.25 }).addTo(map)
    liveRef.current = L.polyline([latlngs[0]], { color: '#FF6A3D', weight: 5, opacity: 0.95 }).addTo(map)

    if (!carRef.current) {
      carRef.current = L.marker(latlngs[0], { icon: carIcon(), zIndexOffset: 1000, interactive: false }).addTo(map)
    } else {
      carRef.current.setLatLng(latlngs[0])
      carRef.current.addTo(map)
    }

    const metrics = pathMetrics(path)
    map.setView(latlngs[0], FOLLOW_ZOOM, { animate: false })

    let t0 = null
    const km = (dir.distance / 1000).toFixed(1)
    const etaMin = Math.max(1, Math.round(dir.duration / 60))

    function frame(ts) {
      if (runId !== runIdRef.current) return
      if (!t0) t0 = ts
      const t = easeIO(Math.min(1, (ts - t0) / TRAVEL_MS))
      const at = pointAt(path, metrics, t)
      const pos = [at.lat, at.lng]

      // 라이브 폴리라인: 지나온 구간 + 현재 보간점
      const sub = latlngs.slice(0, at.idx)
      sub.push(pos)
      liveRef.current.setLatLngs(sub)

      // 차량 위치/회전
      carRef.current.setLatLng(pos)
      const el = carRef.current.getElement()
      if (el) {
        const inner = el.querySelector('.car-marker')
        if (inner) inner.style.transform = `rotate(${compassBearing(at.from, at.to)}deg)`
      }

      // 지도 팔로우
      map.setView(pos, FOLLOW_ZOOM, { animate: false })

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        liveRef.current.setLatLngs(latlngs)
        map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] })
        setReadout({ km, eta: etaMin + '분', sim: !dir.real })
        if (onRouted) onRouted(p.id, { km, sim: !dir.real })
      }
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  function replay() {
    if (partner) runRoute(partner)
  }

  return (
    <div className="mapwrap">
      <div className="kmap" ref={boxRef} />

      {ready && !hintGone && !errMsg && (
        <div className="map-overlay-hint">
          <div className="card-hint">
            <span className="material-symbols-outlined">touch_app</span>
            <div className="h">협력사를 선택하세요</div>
            <div className="p">왼쪽 목록에서 협력사를 누르면 조선소에서의 경로가 표시됩니다.</div>
          </div>
        </div>
      )}

      {errMsg && (
        <div className="map-overlay-hint">
          <div className="card-hint">
            <span className="material-symbols-outlined" style={{ color: 'var(--route)' }}>wrong_location</span>
            <div className="h">위치를 찾지 못했어요</div>
            <div className="p">{errMsg}</div>
          </div>
        </div>
      )}

      {readout && (
        <div className="dist-readout show">
          <div className="lab"><span className="material-symbols-outlined">straighten</span>도착 거리</div>
          <div className="val">{readout.km}<span className="u">km</span></div>
          <div className="eta"><span className="material-symbols-outlined">local_shipping</span>예상 소요 {readout.eta}</div>
          {readout.sim && <div className="badge-sim">시뮬레이션 경로 (길찾기 키 미설정)</div>}
        </div>
      )}

      <div className="map-tools">
        <button className="map-btn" onClick={replay} disabled={!partner || !ready}>
          <span className="material-symbols-outlined">replay</span>경로 다시 보기
        </button>
      </div>
    </div>
  )
}

/* ── 헬퍼 ── */
function resolveOrigin(yard) {
  if (yard && yard.lat && yard.lng) return { lat: Number(yard.lat), lng: Number(yard.lng) }
  return { lat: DEFAULT_YARD.lat, lng: DEFAULT_YARD.lng }
}

function makePin(map, pos, kind, label) {
  const icon = kind === 'origin' ? 'anchor' : 'apartment'
  const html =
    `<div class="pin ${kind}"><div class="dot"><span class="material-symbols-outlined">${icon}</span></div>` +
    `<div class="tag">${escapeHtml(label)}</div></div>`
  return L.marker([pos.lat, pos.lng], {
    icon: L.divIcon({ html, className: 'pin-divicon', iconSize: [0, 0], iconAnchor: [0, 0] }),
    interactive: false,
    keyboard: false,
  }).addTo(map)
}

function carIcon() {
  return L.divIcon({
    html: '<div class="car-marker"><div class="disc"><span class="material-symbols-outlined">navigation</span></div></div>',
    className: 'car-divicon',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
