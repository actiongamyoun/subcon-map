import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocode } from '../lib/kakao.js'
import { getDirections } from '../lib/api.js'
import { pathMetrics, pointAt } from '../lib/geo.js'
import { DEFAULT_YARD, catIcon } from '../lib/constants.js'
import { useLang } from '../lib/lang.jsx'

const ORIGIN_ZOOM = 14   // 조선소(출발지) 보여줄 때 줌
const DEST_ZOOM = 16     // 도착 시 목적지 클로즈업 줌
const FIT_PADDING = [70, 70]

function compassBearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const f1 = toRad(a.lat), f2 = toRad(b.lat), dl = toRad(b.lng - a.lng)
  const y = Math.sin(dl) * Math.cos(f2)
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)
  return (Math.atan2(y, x) * 180) / Math.PI
}
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function MapView({ yard, partner, mapPartners = [], onRouted, onShowAll }) {
  const { t, L: Lz, lang } = useLang()
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const originMarkerRef = useRef(null)
  const destMarkerRef = useRef(null)
  const carRef = useRef(null)
  const faintRef = useRef(null)
  const liveRef = useRef(null)
  const allMarkersRef = useRef([])
  const rafRef = useRef(null)
  const countRafRef = useRef(null)
  const runIdRef = useRef(0)
  const routeDataRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [routeReady, setRouteReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [readout, setReadout] = useState(null)
  const [displayKm, setDisplayKm] = useState(0)
  const [errMsg, setErrMsg] = useState('')

  const origin = resolveOrigin(yard)
  const yardLabel = Lz(yard, 'name') || t('yard.fallback')

  // 소요시간 포맷: 60분 이상이면 시간 단위로 (예: 241분 → 4시간 1분)
  const fmtDuration = (min) => {
    const h = Math.floor(min / 60), m = min % 60
    if (h === 0) return lang === 'en' ? `${m} min` : `${m}분`
    if (m === 0) return lang === 'en' ? `${h} hr` : `${h}시간`
    return lang === 'en' ? `${h} hr ${m} min` : `${h}시간 ${m}분`
  }

  // 지도 초기화 (OpenStreetMap) — 조선소를 적절히 확대해 표시
  useEffect(() => {
    const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true })
      .setView([origin.lat, origin.lng], ORIGIN_ZOOM)
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
      cancelAnimationFrame(countRafRef.current)
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

  // 언어 변경 시 목적지 핀 라벨 갱신
  useEffect(() => {
    if (!ready || !partner || !destMarkerRef.current || !mapRef.current) return
    const pos = destMarkerRef.current.getLatLng()
    destMarkerRef.current.remove()
    destMarkerRef.current = makePin(mapRef.current, { lat: pos.lat, lng: pos.lng }, 'dest', Lz(partner, 'name'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // 협력사 선택 → 경로 "준비"(대략적 위치 표시), 자동 이동은 안 함
  useEffect(() => {
    if (!ready || !partner) return
    prepareRoute(partner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner?.id, ready])

  // 거리 카운트업 애니메이션
  useEffect(() => {
    cancelAnimationFrame(countRafRef.current)
    if (!readout) { setDisplayKm(0); return }
    const target = parseFloat(readout.km) || 0
    let t0 = null
    const dur = 900
    const step = (ts) => {
      if (!t0) t0 = ts
      const p = Math.min(1, (ts - t0) / dur)
      setDisplayKm(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) countRafRef.current = requestAnimationFrame(step)
      else setDisplayKm(target)
    }
    countRafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(countRafRef.current)
  }, [readout])

  // 1) 협력사 선택 → 목적지 핀 + 경로(흐리게) 그리고 출발+도착이 다 보이게 축소
  async function prepareRoute(p) {
    const map = mapRef.current
    if (!map) return
    const runId = ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    setErrMsg('')
    setReadout(null)
    setPlaying(false)
    setRouteReady(false)
    // 전체보기 상태였다면 해제 + 전체 핀 제거
    if (allMarkersRef.current.length) { allMarkersRef.current.forEach((m) => m.remove()); allMarkersRef.current = [] }
    setShowAll(false)

    let dest = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : await geocode(p.addr)
    if (runId !== runIdRef.current) return
    if (!dest) { setErrMsg(t('map.notFoundBody', { name: Lz(p, 'name') })); return }

    if (destMarkerRef.current) destMarkerRef.current.remove()
    destMarkerRef.current = makePin(map, dest, 'dest', Lz(p, 'name'))

    const dir = await getDirections(origin, dest)
    if (runId !== runIdRef.current) return
    const path = dir.path && dir.path.length > 1 ? dir.path : [[origin.lat, origin.lng], [dest.lat, dest.lng]]
    const latlngs = path.map(([la, ln]) => [la, ln])
    const metrics = pathMetrics(path)
    const km = (dir.distance / 1000).toFixed(1)
    const etaMin = Math.max(1, Math.round(dir.duration / 60))

    if (faintRef.current) faintRef.current.remove()
    if (liveRef.current) liveRef.current.remove()
    faintRef.current = L.polyline(latlngs, { color: '#FF6A3D', weight: 5, opacity: 0.3, dashArray: '3 9' }).addTo(map)
    liveRef.current = L.polyline([latlngs[0]], { color: '#FF6A3D', weight: 5, opacity: 0.95 }).addTo(map)

    if (!carRef.current) carRef.current = L.marker(latlngs[0], { icon: carIcon(), zIndexOffset: 1000, interactive: false }).addTo(map)
    else { carRef.current.setLatLng(latlngs[0]); carRef.current.addTo(map) }

    const bounds = L.latLngBounds(latlngs)
    map.invalidateSize()
    map.fitBounds(bounds, { padding: FIT_PADDING, animate: true })

    routeDataRef.current = { dest, path, latlngs, metrics, km, etaMin, sim: !dir.real, bounds }
    setRouteReady(true)
    if (onRouted) onRouted(p.id, { km, sim: !dir.real })
  }

  // 2) 경로 보기 → 차량이 경로를 따라 이동(카메라 고정 = 어지럼 방지) → 3) 도착 시 목적지 확대
  function playRoute() {
    const map = mapRef.current
    const rd = routeDataRef.current
    if (!map || !rd) return
    const runId = ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    setReadout(null)
    setPlaying(true)

    const { dest, path, latlngs, metrics, km, etaMin, sim, bounds } = rd
    // 전체 경로가 보이는 축소 상태로 고정 (따라가지 않음)
    map.fitBounds(bounds, { padding: FIT_PADDING, animate: false })
    carRef.current.setLatLng(latlngs[0])
    liveRef.current.setLatLngs([latlngs[0]])

    // 거리에 비례한 편안한 속도 (3.5~7초)
    const TRAVEL_MS = Math.min(7000, Math.max(3500, parseFloat(km) * 280))
    let t0 = null
    function frame(ts) {
      if (runId !== runIdRef.current) return
      if (!t0) t0 = ts
      const tt = easeIO(Math.min(1, (ts - t0) / TRAVEL_MS))
      const at = pointAt(path, metrics, tt)
      const pos = [at.lat, at.lng]

      const sub = latlngs.slice(0, at.idx); sub.push(pos)
      liveRef.current.setLatLngs(sub)
      carRef.current.setLatLng(pos)
      const el = carRef.current.getElement()
      if (el) {
        const inner = el.querySelector('.car-marker')
        if (inner) inner.style.transform = `rotate(${compassBearing(at.from, at.to)}deg)`
      }
      // 카메라 고정 — 축소 상태 유지

      if (tt < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        liveRef.current.setLatLngs(latlngs)
        // 도착: 목적지로 확대
        map.setView([Number(dest.lat), Number(dest.lng)], DEST_ZOOM, { animate: true })
        setPlaying(false)
        setReadout({ km, etaMin, sim })
      }
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  // 출발지(조선소)로 이동 + 적절히 확대
  function goOrigin() {
    const map = mapRef.current
    if (!map) return
    map.setView([origin.lat, origin.lng], ORIGIN_ZOOM, { animate: true })
  }

  // 현재 범위(호선 선택 시 그 멤버, 전체면 전부)의 협력사를 지도에 한 번에 핀으로 표시
  function showAllPartners() {
    const map = mapRef.current
    if (!map) return
    ++runIdRef.current // 진행 중인 경로 준비/애니메이션 취소
    cancelAnimationFrame(rafRef.current)
    cancelAnimationFrame(countRafRef.current)
    setErrMsg('')
    setReadout(null)
    setPlaying(false)
    setRouteReady(false)

    // 단일 경로 그래픽 제거
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null }
    if (carRef.current) carRef.current.remove()
    if (faintRef.current) { faintRef.current.remove(); faintRef.current = null }
    if (liveRef.current) { liveRef.current.remove(); liveRef.current = null }
    routeDataRef.current = null

    // 기존 전체 핀 제거 후 다시 그림
    allMarkersRef.current.forEach((m) => m.remove())
    allMarkersRef.current = []

    const pts = []
    mapPartners.forEach((p) => {
      if (!(p.lat && p.lng)) return
      const pos = { lat: Number(p.lat), lng: Number(p.lng) }
      allMarkersRef.current.push(makePin(map, pos, 'multi', Lz(p, 'name'), catIcon(p.cat)))
      pts.push([pos.lat, pos.lng])
    })

    map.invalidateSize()
    if (pts.length) {
      map.fitBounds(L.latLngBounds([...pts, [origin.lat, origin.lng]]), { padding: FIT_PADDING, animate: true })
    } else {
      map.setView([origin.lat, origin.lng], ORIGIN_ZOOM, { animate: true })
    }
    setShowAll(true)
    if (onShowAll) onShowAll() // 단일 선택 해제 → 이후 사이드 목록에서 다시 선택 가능
  }

  // 전체보기 중 범위(필터)가 바뀌면 핀 다시 표시
  useEffect(() => {
    if (!ready || !showAll) return
    showAllPartners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPartners])

  // 전체보기 중 언어 변경 시 핀 라벨만 갱신 (줌 유지)
  useEffect(() => {
    if (!ready || !showAll || !mapRef.current) return
    const map = mapRef.current
    allMarkersRef.current.forEach((m) => m.remove())
    allMarkersRef.current = []
    mapPartners.forEach((p) => {
      if (!(p.lat && p.lng)) return
      allMarkersRef.current.push(makePin(map, { lat: Number(p.lat), lng: Number(p.lng) }, 'multi', Lz(p, 'name'), catIcon(p.cat)))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const hasMappable = mapPartners.some((p) => p.lat && p.lng)
  const showSelectHint = ready && !partner && !showAll && !errMsg
  const showPlayHint = ready && !!partner && routeReady && !playing && !readout && !errMsg

  return (
    <div className="mapwrap">
      <div className="kmap" ref={boxRef} />

      {showSelectHint && (
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

      {showPlayHint && (
        <div className="play-hint">
          <span className="material-symbols-outlined">arrow_downward</span>{t('map.pressPlay')}
        </div>
      )}

      {readout && (
        <div className="dist-top" key={partner?.id || 'd'}>
          <span className="material-symbols-outlined ic">flag</span>
          <div className="dt-body">
            <div className="lab">{t('map.finalDistance')}</div>
            <div className="val">{displayKm.toFixed(1)}<span className="u">km</span></div>
          </div>
          <div className="dt-eta">
            <span className="material-symbols-outlined">local_shipping</span>
            {t('map.eta')} {fmtDuration(readout.etaMin)}
          </div>
          {readout.sim && <div className="badge-sim">{t('map.simRoute')}</div>}
        </div>
      )}

      <div className="map-tools">
        <button className="map-btn" onClick={goOrigin} disabled={!ready}>
          <span className="material-symbols-outlined">anchor</span>{t('map.toOrigin')}
        </button>
        <button
          className={'map-btn' + (showAll ? ' active' : '')}
          onClick={showAllPartners}
          disabled={!ready || !hasMappable}
        >
          <span className="material-symbols-outlined">pin_drop</span>{t('map.showAll')}
        </button>
        <button
          className={'map-btn primary' + (showPlayHint ? ' pulse' : '')}
          onClick={playRoute}
          disabled={!routeReady || playing}
        >
          <span className="material-symbols-outlined">navigation</span>{t('map.playRoute')}
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

function makePin(map, pos, kind, label, iconOverride) {
  const icon = iconOverride || (kind === 'origin' ? 'anchor' : 'apartment')
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
