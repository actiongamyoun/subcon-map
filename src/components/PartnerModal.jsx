import { useState } from 'react'
import Modal from './Modal.jsx'
import LocationSearch from './LocationSearch.jsx'
import MapPicker from './MapPicker.jsx'
import CatBadge from './CatBadge.jsx'
import { CATEGORY_ORDER } from '../lib/constants.js'
import { uploadBrochure } from '../lib/api.js'
import { useLang } from '../lib/lang.jsx'

const blankDraft = () => ({ id: null, name: '', name_en: '', cat: 'pipe', addr: '', addr_en: '', desc: '', desc_en: '', lat: '', lng: '', homepage: '', brochure: '', items: [] })

export default function PartnerModal({ partners, projects = [], activeProjectId = null, onClose, onSave, onDelete, embedded }) {
  const { t, L, tc } = useLang()
  const [mode, setMode] = useState('list') // list | edit
  const [draft, setDraft] = useState(blankDraft())
  const [uploading, setUploading] = useState(false)

  const startAdd = () => { setDraft(blankDraft()); setMode('edit') }
  const startEdit = (p) => {
    setDraft({
      ...p,
      name_en: p.name_en || '', addr_en: p.addr_en || '', desc_en: p.desc_en || '',
      homepage: p.homepage || '', brochure: p.brochure || '',
      lat: p.lat ?? '', lng: p.lng ?? '',
      items: (p.items || []).map((it) => ({ ...it })),
    })
    setMode('edit')
  }

  const handlePdf = async (e) => {
    const file = e.target.files && e.target.files[0]
    e.target.value = '' // 같은 파일 다시 고를 수 있게 초기화
    if (!file) return
    setUploading(true)
    const res = await uploadBrochure(file)
    setUploading(false)
    if (res && res.ok && res.url) {
      setDraft((d) => ({ ...d, brochure: res.url }))
    } else {
      const msg = { too_big: t('pM.fileTooBig'), not_pdf: t('pM.notPdf'), demo: t('pM.uploadDemo') }
      window.alert((res && msg[res.error]) || t('pM.uploadFail'))
    }
  }

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const onPick = (r) => setDraft((d) => ({ ...d, addr: r.addr, lat: r.lat.toFixed(6), lng: r.lng.toFixed(6) }))

  const save = () => {
    const clean = {
      ...draft,
      name: draft.name.trim(), name_en: draft.name_en.trim(),
      desc: draft.desc.trim(), desc_en: draft.desc_en.trim(),
      addr: draft.addr.trim(), addr_en: draft.addr_en.trim(),
      homepage: (draft.homepage || '').trim(), brochure: draft.brochure || '',
      lat: draft.lat === '' ? null : Number(draft.lat),
      lng: draft.lng === '' ? null : Number(draft.lng),
      items: draft.items || [],
    }
    onSave(clean)
    setMode('list')
  }

  const remove = (p) => {
    if (window.confirm(t('pM.confirmDelete', { name: L(p, 'name') }))) onDelete(p.id)
  }

  /* ─── 목록 모드 ─── */
  if (mode === 'list') {
    return (
      <Modal
        embedded={embedded}
        icon="apartment" title={t('pM.manageTitle')} subtitle={t('pM.manageSubtitle', { n: partners.length })} wide
        onClose={onClose}
        footer={<div className="right"><button className="btn btn-lg" onClick={onClose}>{t('common.close')}</button></div>}
      >
        <div className="sec-t">
          <span>{t('pM.registered')}</span>
          <button className="btn btn-primary btn-sm" onClick={startAdd}><span className="material-symbols-outlined">add</span>{t('pM.addPartner')}</button>
        </div>
        <div className="plist">
          {partners.length === 0 && <div className="empty"><span className="material-symbols-outlined">domain_add</span>{t('pM.empty')}</div>}
          {partners.map((p) => (
            <div className="pitem" key={p.id}>
              <div className="pg">
                <div className="pn">{L(p, 'name')} <CatBadge cat={p.cat} style={{ marginLeft: 4 }} /></div>
                <div className="pd">{L(p, 'addr') || t('common.noAddress')}</div>
              </div>
              <button className="linkbtn" onClick={() => startEdit(p)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>{t('common.edit')}</button>
              <button className="linkbtn danger" onClick={() => remove(p)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>{t('common.delete')}</button>
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  /* ─── 편집 모드 ─── */
  return (
    <Modal
      embedded={embedded}
      icon={draft.id ? 'edit' : 'domain_add'}
      title={draft.id ? t('pM.editTitle') : t('pM.addTitle')}
      subtitle={t('pM.editSubtitle')} wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-lg" onClick={() => setMode('list')}><span className="material-symbols-outlined">arrow_back</span>{t('common.list')}</button>
          <div className="right">
            <button className="btn btn-primary btn-lg" onClick={save} disabled={!draft.name.trim()}>
              <span className="material-symbols-outlined">check</span>{t('common.save')}
            </button>
          </div>
        </>
      }
    >
      <div className="row2">
        <div className="field">
          <label>{t('pM.name')}</label>
          <input className="in" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="대성배관" />
        </div>
        <div className="field">
          <label>{t('pM.nameEn')}</label>
          <input className="in" value={draft.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder="Daesung Piping" />
        </div>
      </div>

      <div className="field">
        <label>{t('pM.category')}</label>
        <select className="sel" value={draft.cat} onChange={(e) => set('cat', e.target.value)}>
          {CATEGORY_ORDER.map((k) => <option key={k} value={k}>{tc(k)}</option>)}
        </select>
      </div>

      <div className="field">
        <label>{t('loc.search')} <span className="hint">{t('loc.hint')}</span></label>
        <LocationSearch onPick={onPick} />
      </div>

      <div className="field">
        <label>{t('loc.mapPick')} <span className="hint">{t('loc.mapHint')}</span></label>
        <MapPicker lat={draft.lat} lng={draft.lng} onPick={(p) => setDraft((d) => ({ ...d, lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) }))} />
      </div>

      <div className="field">
        <label>{t('field.address')}</label>
        <input className="in" value={draft.addr} onChange={(e) => set('addr', e.target.value)} placeholder="부산광역시 …" />
      </div>

      <div className="field">
        <label>{t('field.addressEn')}</label>
        <input className="in" value={draft.addr_en} onChange={(e) => set('addr_en', e.target.value)} placeholder="Gangseo-gu, Busan" />
      </div>

      <div className="row2">
        <div className="field"><label>{t('geo.lat')}</label><input className="in" value={draft.lat} onChange={(e) => set('lat', e.target.value)} placeholder="35.10" inputMode="decimal" /></div>
        <div className="field"><label>{t('geo.lng')}</label><input className="in" value={draft.lng} onChange={(e) => set('lng', e.target.value)} placeholder="128.85" inputMode="decimal" /></div>
      </div>

      <div className="row2">
        <div className="field">
          <label>{t('pM.desc')}</label>
          <input className="in" value={draft.desc} onChange={(e) => set('desc', e.target.value)} placeholder="블록 배관 설치 전문" />
        </div>
        <div className="field">
          <label>{t('pM.descEn')}</label>
          <input className="in" value={draft.desc_en} onChange={(e) => set('desc_en', e.target.value)} placeholder="Block piping install" />
        </div>
      </div>

      <div className="divider" />

      <div className="sec-t"><span>{t('pM.links')}</span></div>
      <div className="field">
        <label>{t('pM.homepage')}</label>
        <input className="in" value={draft.homepage || ''} onChange={(e) => set('homepage', e.target.value)} placeholder="https://example.com" inputMode="url" />
      </div>
      <div className="field">
        <label>{t('pM.brochure')}</label>
        {draft.brochure ? (
          <div className="brochure-row">
            <span className="material-symbols-outlined pdf-ic">picture_as_pdf</span>
            <span className="bn">{t('pM.brochureSet')}</span>
            <a className="linkbtn" href={draft.brochure} target="_blank" rel="noreferrer">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>{t('pM.brochureView')}
            </a>
            <button className="linkbtn danger" onClick={() => set('brochure', '')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>{t('pM.brochureRemove')}
            </button>
          </div>
        ) : (
          <label className={'pdf-upload' + (uploading ? ' busy' : '')}>
            <span className="material-symbols-outlined">{uploading ? 'progress_activity' : 'upload_file'}</span>
            {uploading ? t('pM.uploading') : t('pM.uploadPdf')}
            <input type="file" accept="application/pdf,.pdf" hidden disabled={uploading} onChange={handlePdf} />
          </label>
        )}
      </div>
    </Modal>
  )
}
