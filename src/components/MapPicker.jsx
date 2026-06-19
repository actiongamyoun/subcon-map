import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_YARD } from '../lib/constants.js'

// 지도를 클릭(또는 핀 드래그)해서 좌표를 지정하는 미니맵. onPick({lat,lng}) 호출.
// 키 불필요(OSM) — 카카오 승인 전에도 즉시 작동.
export default function MapPicker({ lat, lng, onPick }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  function ensureMarker(map, la, ln) {
    if (markerRef.current) { markerRef.current.setLatLng([la, ln]); return }
    const m = L.marker([la, ln], { draggable: true }).addTo(map)
    m.on('dragend', () => {
      const p = m.getLatLng()
      onPick({ lat: p.lat, lng: p.lng })
    })
    markerRef.current = m
  }

  // 초기화
  useEffect(() => {
    const has = lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))
    const center = has ? [Number(lat), Number(lng)] : [DEFAULT_YARD.lat, DEFAULT_YARD.lng]
    const map = L.map(boxRef.current, { zoomControl: true }).setView(center, has ? 15 : 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)
    mapRef.current = map
    if (has) ensureMarker(map, Number(lat), Number(lng))

    map.on('click', (e) => {
      const la = e.latlng.lat, ln = e.latlng.lng
      ensureMarker(map, la, ln)
      onPick({ lat: la, lng: ln })
    })

    const tm = setTimeout(() => map.invalidateSize(), 250)
    return () => {
      clearTimeout(tm)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부에서 좌표가 바뀌면(검색 선택/직접 입력) 마커도 동기화 (루프 방지 가드)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) return
    const la = Number(lat), ln = Number(lng)
    if (markerRef.current) {
      const cur = markerRef.current.getLatLng()
      if (Math.abs(cur.lat - la) < 1e-6 && Math.abs(cur.lng - ln) < 1e-6) return
      markerRef.current.setLatLng([la, ln])
    } else {
      ensureMarker(map, la, ln)
    }
    map.panTo([la, ln])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return <div className="mappicker" ref={boxRef} />
}
