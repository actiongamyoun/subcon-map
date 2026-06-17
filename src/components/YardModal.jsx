import { useState } from 'react'
import Modal from './Modal.jsx'
import { geocode } from '../lib/kakao.js'
import { useLang } from '../lib/lang.jsx'

export default function YardModal({ yard, onClose, onSave }) {
  const { t } = useLang()
  const [f, setF] = useState({
    name: yard?.name || '',
    name_en: yard?.name_en || '',
    addr: yard?.addr || '',
    addr_en: yard?.addr_en || '',
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
      name_en: f.name_en.trim(),
      addr: f.addr.trim(),
      addr_en: f.addr_en.trim(),
      lat: f.lat === '' ? null : Number(f.lat),
      lng: f.lng === '' ? null : Number(f.lng),
    })
  }

  return (
    <Modal
      icon="settings"
      title={t('yardM.title')}
      subtitle={t('yardM.subtitle')}
      onClose={onClose}
      footer={
        <div className="right">
          <button className="btn btn-lg" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary btn-lg" onClick={save} disabled={!f.name.trim()}>
            <span className="material-symbols-outlined">check</span>{t('common.save')}
          </button>
        </div>
      }
    >
      <div className="row2">
        <div className="field">
          <label>{t('yardM.name')}</label>
          <input className="in" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="현대중공업 (부산)" />
        </div>
        <div className="field">
          <label>{t('yardM.nameEn')}</label>
          <input className="in" value={f.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder="Hyundai Heavy Industries" />
        </div>
      </div>

      <div className="field">
        <label>{t('field.address')} <span className="hint">{t('geo.enterThenFind')}</span></label>
        <div className="geo-row">
          <input className="in" value={f.addr} onChange={(e) => { set('addr', e.target.value); setGeo(null) }} placeholder="부산광역시 영도구 …" />
          <button className="btn" onClick={doGeocode}>
            <span className="material-symbols-outlined">my_location</span>{t('geo.find')}
          </button>
          {geo === 'load' && <span className="geo-state geo-load">{t('geo.searching')}</span>}
          {geo === 'ok' && <span className="geo-state geo-ok">{t('geo.found')}</span>}
          {geo === 'warn' && <span className="geo-state geo-warn">{t('geo.notFound')}</span>}
        </div>
      </div>

      <div className="field">
        <label>{t('field.addressEn')}</label>
        <input className="in" value={f.addr_en} onChange={(e) => set('addr_en', e.target.value)} placeholder="Yeongdo-gu, Busan" />
      </div>

      <div className="row2">
        <div className="field">
          <label>{t('geo.lat')}</label>
          <input className="in" value={f.lat} onChange={(e) => set('lat', e.target.value)} placeholder="35.0918" inputMode="decimal" />
        </div>
        <div className="field">
          <label>{t('geo.lng')}</label>
          <input className="in" value={f.lng} onChange={(e) => set('lng', e.target.value)} placeholder="129.0686" inputMode="decimal" />
        </div>
      </div>
    </Modal>
  )
}
