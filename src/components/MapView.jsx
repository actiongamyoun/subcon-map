import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocode } from '../lib/kakao.js'
import { getDirections } from '../lib/api.js'
import { pathMetrics, pointAt } from '../lib/geo.js'
import { DEFAULT_YARD, catIcon, catHasCustomIcon } from '../lib/constants.js'
import { useLang } from '../lib/lang.jsx'

const ORIGIN_ZOOM = 14
const DEST_ZOOM = 16
const FIT_PADDING = [70, 70]
const CLUSTER_PX = 50 // 이 픽셀 이내 핀끼리 묶음

const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function MapView({ yard, partner, mapPartners = [], showAll = false, onRouted, onReset }) {
  const { t, L: Lz, lang } = useLang()
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const originMarkerRef = useRef(null)
  const destMarkerRef = useRef(null)
  const carRef = useRef(null)
  const faintRef = useRef(null)
  const liveRef = useRef(null)
  const clusterMarkersRef = useRef([])
  const spiderRef = useRef({ id: null, markers: [], legs: [], raf: null })
  const mapPartnersRef = useRef([])
  const zoomFnRef = useRef(null)
  const rafRef = useRef(null)
  const countRafRef = useRef(null)
  const runIdRef = useRef(0)
  const routeDataRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [routeReady, setRouteReady] = useState(false)
  const [playing, setPlaying] = useState(false)
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

  // 지도 초기화
  useEffect(() => {
    const map = L.map(boxRef.current, { zoomControl: true, attributionControl: true })
      .setView([origin.lat, origin.lng], ORIGIN_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap',
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

  // 출발지/언어 변경 시 origin 핀 갱신
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (originMarkerRef.current) originMarkerRef.current.remove()
    originMarkerRef.current = makePin(map, origin, 'origin', yardLabel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yardLabel, origin.lat, origin.lng, ready])

  // 언어 변경 시 목적지 핀 라벨 갱신 (단일 모드)
  useEffect(() => {
    if (!ready || !partner || !destMarkerRef.current || !mapRef.current) return
    const pos = destMarkerRef.current.getLatLng()
    destMarkerRef.current.remove()
    destMarkerRef.current = makePin(mapRef.current, { lat: pos.lat, lng: pos.lng }, 'dest', Lz(partner, 'name'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // 모드 전환: 모두 보기 ↔ 단일 경로
  useEffect(() => {
    if (!ready) return
    if (showAll) {
      enterOverview()
    } else {
      exitOverview()
      if (partner) prepareRoute(partner)
      else clearRoute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, partner?.id, ready])

  // 모두 보기 중 범위(지역/호선) 변경 → 그 범위로 다시 맞춤
  useEffect(() => {
    mapPartnersRef.current = mapPartners
    if (ready && showAll) setTimeout(fitAndDraw, 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPartners])

  // 모두 보기 중 언어 변경 → 핀 라벨만 갱신 (줌 유지)
  useEffect(() => {
    if (ready && showAll) drawOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // 거리 카운트업
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

  /* ── 모두 보기 (클러스터) ── */
  function drawOverview() {
    const map = mapRef.current
    if (!map) return
    clearSpider()
    clusterMarkersRef.current.forEach((m) => m.remove())
    clusterMarkersRef.current = []
    const list = mapPartnersRef.current.filter((p) => p.lat && p.lng)
    const pts = list.map((p) => {
      const ll = L.latLng(Number(p.lat), Number(p.lng))
      return { p, ll, pt: map.latLngToContainerPoint(ll) }
    })
    const used = new Array(pts.length).fill(false)
    for (let i = 0; i < pts.length; i++) {
      if (used[i]) continue
      const group = [pts[i]]; used[i] = true
      for (let j = i + 1; j < pts.length; j++) {
        if (!used[j] && pts[i].pt.distanceTo(pts[j].pt) <= CLUSTER_PX) { group.push(pts[j]); used[j] = true }
      }
      if (group.length === 1) {
        const g = group[0]
        clusterMarkersRef.current.push(makePin(map, { lat: g.ll.lat, lng: g.ll.lng }, 'multi', Lz(g.p, 'name'), g.p.cat))
      } else {
        const lat = group.reduce((s, g) => s + g.ll.lat, 0) / group.length
        const lng = group.reduce((s, g) => s + g.ll.lng, 0) / group.length
        const members = group.map((g) => g.p) // 클러스터에 속한 협력사들
        clusterMarkersRef.current.push(makeCluster(map, { lat, lng }, group.length, () => spiderfy(members, L.latLng(lat, lng))))
      }
    }
  }

  // 클러스터 펼치기: 시작점에서 원형으로 멀리 퍼지며(라벨 안 겹치게) 가는 선으로 연결, 애니메이션
  function spiderfy(members, centerLatLng) {
    const map = mapRef.current
    if (!map) return
    const id = members.map((p) => p.id).sort().join('|')
    if (spiderRef.current.id === id) { clearSpider(); return } // 같은 클러스터 다시 클릭 → 접기
    clearSpider()

    const N = members.length
    const centerPt = map.latLngToContainerPoint(centerLatLng)
    const D = 98 // 인접 핀 최소 픽셀 간격(라벨 겹침 방지)
    const GAP_MAX = (52 * Math.PI) / 180 // 핀 사이 벌어지는 각도(부채살 간격)
    const ARC_MAX = (280 * Math.PI) / 180  // 부채꼴 최대 펼침 폭
    let gap = GAP_MAX
    if (gap * (N - 1) > ARC_MAX) gap = ARC_MAX / (N - 1) // 멤버 많으면 간격 좁혀 한바퀴 안 넘게
    const R = Math.max(72, Math.min(260, D / (2 * Math.sin(gap / 2))))
    const base = -Math.PI / 2 - (gap * (N - 1)) / 2 // 12시 방향을 중심으로 위로 펼침

    const targets = []
    for (let i = 0; i < N; i++) {
      const ang = base + gap * i
      const pt = L.point(centerPt.x + R * Math.cos(ang), centerPt.y + R * Math.sin(ang))
      targets.push(map.containerPointToLatLng(pt))
    }

    const markers = []
    const legs = []
    for (let i = 0; i < N; i++) {
      legs.push(L.polyline([centerLatLng, centerLatLng], { color: '#0EA5A4', weight: 2, opacity: 0.6, dashArray: '2 5' }).addTo(map))
      markers.push(makePin(map, { lat: centerLatLng.lat, lng: centerLatLng.lng }, 'multi', Lz(members[i], 'name'), members[i].cat))
    }
    spiderRef.current = { id, markers, legs, raf: null }

    const DUR = 380
    let t0 = null
    const step = (ts) => {
      if (!t0) t0 = ts
      const k = easeIO(Math.min(1, (ts - t0) / DUR))
      for (let i = 0; i < N; i++) {
        const lat = centerLatLng.lat + (targets[i].lat - centerLatLng.lat) * k
        const lng = centerLatLng.lng + (targets[i].lng - centerLatLng.lng) * k
        markers[i].setLatLng([lat, lng])
        legs[i].setLatLngs([centerLatLng, [lat, lng]])
      }
      if (k < 1) spiderRef.current.raf = requestAnimationFrame(step)
    }
    spiderRef.current.raf = requestAnimationFrame(step)
  }

  function clearSpider() {
    const s = spiderRef.current
    if (s.raf) cancelAnimationFrame(s.raf)
    s.markers.forEach((m) => m.remove())
    s.legs.forEach((l) => l.remove())
    spiderRef.current = { id: null, markers: [], legs: [], raf: null }
  }

  // 모두 보기 범위로 지도 맞춤 + 클러스터 그림 + 줌 리스너 부착
  function fitAndDraw() {
    const map = mapRef.current
    if (!map) return
    map.invalidateSize()
    const pts = mapPartnersRef.current.filter((p) => p.lat && p.lng).map((p) => [Number(p.lat), Number(p.lng)])
    if (pts.length) map.fitBounds(L.latLngBounds([...pts, [origin.lat, origin.lng]]), { padding: FIT_PADDING, animate: true })
    else map.setView([origin.lat, origin.lng], ORIGIN_ZOOM, { animate: true })
    drawOverview()
    if (zoomFnRef.current) map.off('zoomend', zoomFnRef.current)
    zoomFnRef.current = () => drawOverview()
    map.on('zoomend', zoomFnRef.current)
  }

  function enterOverview() {
    const map = mapRef.current
    if (!map) return
    ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    cancelAnimationFrame(countRafRef.current)
    setErrMsg(''); setReadout(null); setPlaying(false); setRouteReady(false)
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null }
    if (carRef.current) carRef.current.remove()
    if (faintRef.current) { faintRef.current.remove(); faintRef.current = null }
    if (liveRef.current) { liveRef.current.remove(); liveRef.current = null }
    routeDataRef.current = null
    // 일정칸이 접히며 지도가 커진 뒤 크기 반영 → fit → 그림
    setTimeout(fitAndDraw, 60)
  }

  function exitOverview() {
    const map = mapRef.current
    if (map && zoomFnRef.current) { map.off('zoomend', zoomFnRef.current); zoomFnRef.current = null }
    clearSpider()
    clusterMarkersRef.current.forEach((m) => m.remove())
    clusterMarkersRef.current = []
    setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize() }, 60)
  }

  /* ── 단일 경로 ── */
  async function prepareRoute(p) {
    const map = mapRef.current
    if (!map) return
    const runId = ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    setErrMsg(''); setReadout(null); setPlaying(false); setRouteReady(false)

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

  function playRoute() {
    const map = mapRef.current
    const rd = routeDataRef.current
    if (!map || !rd) return
    const runId = ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    setReadout(null); setPlaying(true)

    const { dest, path, latlngs, metrics, km, etaMin, sim, bounds } = rd
    map.fitBounds(bounds, { padding: FIT_PADDING, animate: false })
    carRef.current.setLatLng(latlngs[0])
    liveRef.current.setLatLngs([latlngs[0]])

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
      // 자동차 아이콘은 회전시키지 않음(회전하면 뒤집혀 보임) — 경로를 따라 이동만
      if (tt < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        liveRef.current.setLatLngs(latlngs)
        map.setView([Number(dest.lat), Number(dest.lng)], DEST_ZOOM, { animate: true })
        setPlaying(false)
        setReadout({ km, etaMin, sim })
      }
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  // 단일 경로 그래픽/상태 제거 (목적지 핀·경로선·자동차·거리 배너)
  function clearRoute() {
    ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    cancelAnimationFrame(countRafRef.current)
    if (destMarkerRef.current) { destMarkerRef.current.remove(); destMarkerRef.current = null }
    if (faintRef.current) { faintRef.current.remove(); faintRef.current = null }
    if (liveRef.current) { liveRef.current.remove(); liveRef.current = null }
    if (carRef.current) { carRef.current.remove(); carRef.current = null }
    routeDataRef.current = null
    setReadout(null); setRouteReady(false); setPlaying(false); setErrMsg('')
  }

  function goOrigin() {
    const map = mapRef.current
    if (!map) return
    clearRoute()                 // 기존에 형성된 경로 삭제
    map.setView([origin.lat, origin.lng], ORIGIN_ZOOM, { animate: true })
    if (onReset) onReset()       // 사이드 선택 해제 → 같은 협력사 다시 눌러도 경로 재표시 가능
  }

  const showSelectHint = ready && !partner && !showAll && !errMsg
  const showPlayHint = ready && !!partner && !showAll && routeReady && !playing && !readout && !errMsg

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

      {readout && !showAll && (
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
        {!showAll && (
          <button
            className={'map-btn primary' + (showPlayHint ? ' pulse' : '')}
            onClick={playRoute}
            disabled={!routeReady || playing}
          >
            <span className="material-symbols-outlined">navigation</span>{t('map.playRoute')}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── 헬퍼 ── */
function resolveOrigin(yard) {
  if (yard && yard.lat && yard.lng) return { lat: Number(yard.lat), lng: Number(yard.lng) }
  return { lat: DEFAULT_YARD.lat, lng: DEFAULT_YARD.lng }
}

function makePin(map, pos, kind, label, cat) {
  let iconHtml
  if (cat && catHasCustomIcon(cat)) {
    iconHtml = `<span class="cat-ic ci-${cat}"></span>`
  } else {
    const sym = cat ? catIcon(cat) : (kind === 'origin' ? 'anchor' : 'apartment')
    iconHtml = `<span class="material-symbols-outlined">${sym}</span>`
  }
  const html =
    `<div class="pin ${kind}"><div class="dot">${iconHtml}</div>` +
    `<div class="tag">${escapeHtml(label)}</div></div>`
  return L.marker([pos.lat, pos.lng], {
    icon: L.divIcon({ html, className: 'pin-divicon', iconSize: [0, 0], iconAnchor: [0, 0] }),
    interactive: false, keyboard: false,
  }).addTo(map)
}

function makeCluster(map, pos, count, onClick) {
  const html = `<div class="cl-pin"><div class="cl-dot">${count}</div></div>`
  const m = L.marker([pos.lat, pos.lng], {
    icon: L.divIcon({ html, className: 'cl-divicon', iconSize: [0, 0], iconAnchor: [0, 0] }),
    interactive: true, keyboard: false, zIndexOffset: 500,
  }).addTo(map)
  m.on('click', onClick)
  return m
}

function carIcon() {
  return L.divIcon({
    html: '<div class="car-marker"><div class="disc"><span class="material-symbols-outlined">directions_car</span></div></div>',
    className: 'car-divicon', iconSize: [0, 0], iconAnchor: [0, 0],
  })
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
