import { useState } from 'react'
import Modal from './Modal.jsx'
import { geocode } from '../lib/kakao.js'

export default function YardModal({ yard, onClose, onSave }) {
  const [f, setF] = useState({
    name: yard?.name || '',
    addr: yard?.addr || '',
    lat: yard?.lat ?? '',
    lng: yard?.lng ?? '',
  })
  const [geo, setGeo] = useState(null) // null | 'load' | 'ok' | 'warn'
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  async function doGeocode() {
    if (!f.addr) { setGeo('warn'); return }
    setGeo('load')
    const r = await geocode(f.addr)
    if (r) { setF((s) => ({ ...s, lat: r.lat.toFixed(6), lng: r.lng.toFixed(6) })); setGeo('ok') }
    else setGeo('warn')
  }

  const save = () => {
    onSave({
      ...yard,
      name: f.name.trim(),
      addr: f.addr.trim(),
      lat: f.lat === '' ? null : Number(f.lat),
      lng: f.lng === '' ? null : Number(f.lng),
    })
  }

  return (
    <Modal
      icon="settings"
      title="조선소 설정"
      subtitle="경로의 출발지가 되는 조선소 위치입니다."
      onClose={onClose}
      footer={
        <>
          <div className="right">
            <button className="btn btn-lg" onClick={onClose}>취소</button>
            <button className="btn btn-primary btn-lg" onClick={save} disabled={!f.name.trim()}>
              <span className="material-symbols-outlined">check</span>저장
            </button>
          </div>
        </>
      }
    >
      <div className="field">
        <label>조선소명</label>
        <input className="in" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="예) 현대중공업 (부산)" />
      </div>

      <div className="field">
        <label>주소 <span className="hint">입력 후 ‘좌표 찾기’를 누르세요</span></label>
        <div className="geo-row">
          <input className="in" value={f.addr} onChange={(e) => { set('addr', e.target.value); setGeo(null) }} placeholder="도로명 또는 지번 주소" />
          <button className="btn" onClick={doGeocode}>
            <span className="material-symbols-outlined">my_location</span>좌표 찾기
          </button>
          {geo === 'load' && <span className="geo-state geo-load">찾는 중…</span>}
          {geo === 'ok' && <span className="geo-state geo-ok">좌표 확인됨</span>}
          {geo === 'warn' && <span className="geo-state geo-warn">못 찾음 · 직접 입력</span>}
        </div>
      </div>

      <div className="row2">
        <div className="field">
          <label>위도 (lat)</label>
          <input className="in" value={f.lat} onChange={(e) => set('lat', e.target.value)} placeholder="35.0918" inputMode="decimal" />
        </div>
        <div className="field">
          <label>경도 (lng)</label>
          <input className="in" value={f.lng} onChange={(e) => set('lng', e.target.value)} placeholder="129.0686" inputMode="decimal" />
        </div>
      </div>
    </Modal>
  )
}
