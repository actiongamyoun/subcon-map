import { useEffect, useRef, useState } from 'react'
import { loadKakao, geocode } from '../lib/kakao.js'
import { getDirections } from '../lib/api.js'
import { pathMetrics, pointAt } from '../lib/geo.js'
import { DEFAULT_YARD } from '../lib/constants.js'

const TRAVEL_MS = 3400
const FOLLOW_LEVEL = 6 // 카카오 줌 레벨(작을수록 확대)

function compassBearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const φ1 = toRad(a.lat), φ2 = toRad(b.lat), Δλ = toRad(b.lng - a.lng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180) / Math.PI
}
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export default function MapView({ yard, partner, onRouted }) {
  const boxRef = useRef(null)
  const kakaoRef = useRef(null)
  const mapRef = useRef(null)
  const originPinRef = useRef(null)
  const destPinRef = useRef(null)
  const carRef = useRef(null)
  const carElRef = useRef(null)
  const faintRef = useRef(null)
  const liveRef = useRef(null)
  const rafRef = useRef(null)
  const runIdRef = useRef(0)

  const [mapState, setMapState] = useState('init') // init | ready | nokey
  const [hintGone, setHintGone] = useState(false)
  const [readout, setReadout] = useState(null) // { km, eta, sim }
  const [errMsg, setErrMsg] = useState('')

  const origin = resolveOrigin(yard)

  // 지도 초기화
  useEffect(() => {
    let dead = false
    loadKakao()
      .then((kakao) => {
        if (dead) return
        kakaoRef.current = kakao
        const map = new kakao.maps.Map(boxRef.current, {
          center: new kakao.maps.LatLng(origin.lat, origin.lng),
          level: 8,
        })
        mapRef.current = map
        originPinRef.current = makePin(kakao, map, origin, 'origin', yard?.name || '조선소')
        setMapState('ready')
      })
      .catch(() => { if (!dead) setMapState('nokey') })
    return () => {
      dead = true
      cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 조선소(출발지) 변경 시 origin 핀 갱신
  useEffect(() => {
    const kakao = kakaoRef.current, map = mapRef.current
    if (mapState !== 'ready' || !kakao || !map) return
    if (originPinRef.current) originPinRef.current.setMap(null)
    originPinRef.current = makePin(kakao, map, origin, 'origin', yard?.name || '조선소')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yard?.name, origin.lat, origin.lng, mapState])

  // 협력사 선택 → 경로
  useEffect(() => {
    if (mapState !== 'ready' || !partner) return
    runRoute(partner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner?.id, mapState])

  async function runRoute(p) {
    const kakao = kakaoRef.current, map = mapRef.current
    if (!kakao || !map) return
    const runId = ++runIdRef.current
    cancelAnimationFrame(rafRef.current)
    setErrMsg('')
    setReadout(null)
    setHintGone(true)

    // 목적지 좌표 확보 (없으면 주소 지오코딩)
    let dest = p.lat && p.lng ? { lat: p.lat, lng: p.lng } : await geocode(p.addr)
    if (runId !== runIdRef.current) return
    if (!dest) {
      setErrMsg(`‘${p.name}’의 위치를 찾지 못했습니다. 협력사 관리에서 주소를 확인해 주세요.`)
      return
    }

    // 목적지 핀
    if (destPinRef.current) destPinRef.current.setMap(null)
    destPinRef.current = makePin(kakao, map, dest, 'dest', p.name)

    // 길찾기 (실제 도로 or 폴백)
    const dir = await getDirections(origin, dest)
    if (runId !== runIdRef.current) return
    const path = dir.path && dir.path.length > 1 ? dir.path : [[origin.lat, origin.lng], [dest.lat, dest.lng]]

    // 폴리라인 (희미한 전체 + 진하게 그려지는 라이브)
    if (faintRef.current) faintRef.current.setMap(null)
    if (liveRef.current) liveRef.current.setMap(null)
    const fullLatLng = path.map(([la, ln]) => new kakao.maps.LatLng(la, ln))
    faintRef.current = new kakao.maps.Polyline({
      map, path: fullLatLng, strokeWeight: 5, strokeColor: '#FF6A3D', strokeOpacity: 0.25, strokeStyle: 'solid',
    })
    liveRef.current = new kakao.maps.Polyline({
      map, path: [fullLatLng[0]], strokeWeight: 5, strokeColor: '#FF6A3D', strokeOpacity: 0.95, strokeStyle: 'solid',
    })

    // 차량 오버레이
    if (!carRef.current) {
      const el = document.createElement('div')
      el.className = 'car-marker'
      el.innerHTML = '<div class="disc"><span class="material-symbols-outlined">navigation</span></div>'
      carElRef.current = el
      carRef.current = new kakao.maps.CustomOverlay({ content: el, position: fullLatLng[0], yAnchor: 0.5, xAnchor: 0.5, zIndex: 10 })
    }
    carRef.current.setPosition(fullLatLng[0])
    carRef.current.setMap(map)

    const metrics = pathMetrics(path)

    // 줌인 → 이동(팔로우) → 줌아웃 시퀀스
    map.setLevel(FOLLOW_LEVEL, { anchor: new kakao.maps.LatLng(origin.lat, origin.lng) })
    map.setCenter(new kakao.maps.LatLng(origin.lat, origin.lng))

    let t0 = null
    const km = (dir.distance / 1000).toFixed(1)
    const etaMin = Math.max(1, Math.round(dir.duration / 60))

    function frame(ts) {
      if (runId !== runIdRef.current) return
      if (!t0) t0 = ts
      const t = easeIO(Math.min(1, (ts - t0) / TRAVEL_MS))
      const at = pointAt(path, metrics, t)
      const pos = new kakao.maps.LatLng(at.lat, at.lng)

      // 라이브 폴리라인: 지나온 구간 + 현재 보간점
      const sub = fullLatLng.slice(0, at.idx)
      sub.push(pos)
      liveRef.current.setPath(sub)

      // 차량 위치/회전
      carRef.current.setPosition(pos)
      const brg = compassBearing(at.from, at.to)
      if (carElRef.current) carElRef.current.style.transform = `rotate(${brg}deg)`

      // 지도 팔로우
      map.setCenter(pos)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        liveRef.current.setPath(fullLatLng)
        // 전체 경로가 보이게 줌아웃
        const bounds = new kakao.maps.LatLngBounds()
        fullLatLng.forEach((ll) => bounds.extend(ll))
        map.setBounds(bounds, 70, 70, 70, 70)
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

      {mapState === 'nokey' && (
        <div className="map-overlay-hint">
          <div className="card-hint">
            <span className="material-symbols-outlined">map</span>
            <div className="h">지도 키를 설정하면 지도가 표시됩니다</div>
            <div className="p">
              Vercel 환경변수 <code>VITE_KAKAO_JS_KEY</code> 에 카카오 JavaScript 키를 등록하고
              플랫폼 Web 도메인에 배포 주소를 추가하세요.
            </div>
          </div>
        </div>
      )}

      {mapState === 'ready' && !hintGone && (
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
        <button className="map-btn" onClick={replay} disabled={!partner || mapState !== 'ready'}>
          <span className="material-symbols-outlined">replay</span>경로 다시 보기
        </button>
      </div>

      <div className="map-legend">
        <span><i style={{ background: 'var(--brand)' }} />조선소</span>
        <span><i style={{ background: 'var(--route)' }} />협력사</span>
      </div>
    </div>
  )
}

/* ── 헬퍼 ── */
function resolveOrigin(yard) {
  if (yard && yard.lat && yard.lng) return { lat: Number(yard.lat), lng: Number(yard.lng) }
  return { lat: DEFAULT_YARD.lat, lng: DEFAULT_YARD.lng }
}

function makePin(kakao, map, pos, kind, label) {
  const el = document.createElement('div')
  el.className = 'pin ' + kind
  const icon = kind === 'origin' ? 'anchor' : 'apartment'
  el.innerHTML = `<div class="dot"><span class="material-symbols-outlined">${icon}</span></div><div class="tag">${escapeHtml(label)}</div>`
  return new kakao.maps.CustomOverlay({
    map, content: el, position: new kakao.maps.LatLng(pos.lat, pos.lng), yAnchor: 1, xAnchor: 0.5, zIndex: 6,
  })
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
