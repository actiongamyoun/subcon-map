import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocode } from '../lib/kakao.js'
import { getDirections } from '../lib/api.js'
import { pathMetrics, pointAt } from '../lib/geo.js'
import { DEFAULT_YARD } from '../lib/constants.js'
import { useLang } from '../lib/lang.jsx'

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
  const { t, L: Lz, lang } = useLang()
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
  const yardLabel = Lz(yard, 'name') || t('yard.fallback')

  // 지도 초기화 (OpenStreetMap)
  useEffect(() => {
    const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true })
      .setView([origin.lat, origin.lng], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    mapRef.current = map
    originMarkerRef.current = makePin(map, origin, 'origin', yardLabel)
    setReady(true)
    const tm = setTimeout(() => map.invalidateSize(), 200)
    return () => {
      clearTimeout(tm)
      cancelAnimationFrame(rafRef.current)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 조선소(출발지) 변경 또는 언어 변경 시 origin 핀 갱신
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (originMarkerRef.current) originMarkerRef.current.remove()
    originMarkerRef.current = makePin(map, origin, 'origin', yardLabel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yardLabel, origin.lat, origin.lng, ready])

  // 언어 변경 시 목적지 핀 라벨 갱신 (재애니메이션 없이)
  useEffect(() => {
    if (!ready || !partner || !destMarkerRef.current || !mapRef.current) return
    const pos = destMarkerRef.current.getLatLng()
    destMarkerRef.current.remove()
    destMarkerRef.current = makePin(mapRef.current, { lat: pos.lat, lng: pos.lng }, 'dest', Lz(partner, 'name'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

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

    let dest = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : await geocode(p.addr)
    if (runId !== runIdRef.current) return
    if (!dest) {
      setErrMsg(t('map.notFoundBody', { name: Lz(p, 'name') }))
      return
    }

    if (destMarkerRef.current) destMarkerRef.current.remove()
    destMarkerRef.current = makePin(map, dest, 'dest', Lz(p, 'name'))

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
      const tt = easeIO(Math.min(1, (ts - t0) / TRAVEL_MS))
      const at = pointAt(path, metrics, tt)
      const pos = [at.lat, at.lng]

      const sub = latlngs.slice(0, at.idx)
      sub.push(pos)
      liveRef.current.setLatLngs(sub)

      carRef.current.setLatLng(pos)
      const el = carRef.current.getElement()
      if (el) {
        const inner = el.querySelector('.car-marker')
        if (inner) inner.style.transform = `rotate(${compassBearing(at.from, at.to)}deg)`
      }

      map.setView(pos, FOLLOW_ZOOM, { animate: false })

      if (tt < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        liveRef.current.setLatLngs(latlngs)
        map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] })
        setReadout({ km, etaMin, sim: !dir.real })
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
            <div className="h">{t('map.selectTitle')}</div>
            <div className="p">{t('map.selectHint')}</div>
          </div>
        </div>
      )}

      {errMsg && (
        <div className="map-overlay-hint">
          <div className="card-hint">
            <span className="material-symbols-outlined" style={{ color: 'var(--route)' }}>wrong_location</span>
            <div className="h">{t('map.notFoundTitle')}</div>
            <div className="p">{errMsg}</div>
          </div>
        </div>
      )}

      {readout && (
        <div className="dist-readout show">
          <div className="lab"><span className="material-symbols-outlined">straighten</span>{t('map.distance')}</div>
          <div className="val">{readout.km}<span className="u">km</span></div>
          <div className="eta"><span className="material-symbols-outlined">local_shipping</span>{t('map.eta')} {readout.etaMin}{t('unit.min')}</div>
          {readout.sim && <div className="badge-sim">{t('map.simRoute')}</div>}
        </div>
      )}

      <div className="map-tools">
        <button className="map-btn" onClick={replay} disabled={!partner || !ready}>
          <span className="material-symbols-outlined">replay</span>{t('map.replay')}
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
