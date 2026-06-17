import { useState } from 'react'
import Modal from './Modal.jsx'
import { CATEGORIES } from '../lib/constants.js'
import { useLang } from '../lib/lang.jsx'

const blankDraft = () => ({ id: null, name: '', name_en: '', note: '', partnerIds: [] })

export default function ProjectModal({ projects, partners, onClose, onSave, onDelete }) {
  const { t, L, tc } = useLang()
  const [mode, setMode] = useState('list')
  const [draft, setDraft] = useState(blankDraft())

  const startAdd = () => { setDraft(blankDraft()); setMode('edit') }
  const startEdit = (pr) => { setDraft({ ...pr, name_en: pr.name_en || '', partnerIds: [...(pr.partnerIds || [])] }); setMode('edit') }
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const toggle = (id) => setDraft((d) => ({
    ...d,
    partnerIds: d.partnerIds.includes(id) ? d.partnerIds.filter((x) => x !== id) : [...d.partnerIds, id],
  }))

  const save = () => { onSave({ ...draft, name: draft.name.trim(), name_en: draft.name_en.trim(), note: draft.note.trim() }); setMode('list') }
  const remove = (pr) => { if (window.confirm(t('prM.confirmDelete', { name: L(pr, 'name') }))) onDelete(pr.id) }

  if (mode === 'list') {
    return (
      <Modal
        icon="folder_open" title={t('prM.manageTitle')} subtitle={t('prM.manageSubtitle')}
        onClose={onClose}
        footer={<div className="right"><button className="btn btn-lg" onClick={onClose}>{t('common.close')}</button></div>}
      >
        <div className="sec-t">
          <span>{t('prM.list')}</span>
          <button className="btn btn-primary btn-sm" onClick={startAdd}><span className="material-symbols-outlined">add</span>{t('prM.addProject')}</button>
        </div>
        <div className="plist">
          {projects.length === 0 && <div className="empty"><span className="material-symbols-outlined">create_new_folder</span>{t('prM.empty')}</div>}
          {projects.map((pr) => (
            <div className="pitem" key={pr.id}>
              <div className="pg">
                <div className="pn">{L(pr, 'name')}</div>
                <div className="pd">{pr.note ? pr.note + ' · ' : ''}{t('prM.partnersN', { n: (pr.partnerIds || []).length })}</div>
              </div>
              <button className="linkbtn" onClick={() => startEdit(pr)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>{t('common.edit')}</button>
              <button className="linkbtn danger" onClick={() => remove(pr)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>{t('common.delete')}</button>
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      icon={draft.id ? 'edit' : 'create_new_folder'}
      title={draft.id ? t('prM.editTitle') : t('prM.addTitle')}
      subtitle={t('prM.editSubtitle')}
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
          <label>{t('prM.name')}</label>
          <input className="in" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="2031호선 (PCTC)" />
        </div>
        <div className="field">
          <label>{t('prM.nameEn')}</label>
          <input className="in" value={draft.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder="Hull 2031 (PCTC)" />
        </div>
      </div>
      <div className="field">
        <label>{t('prM.note')} <span className="hint">{t('common.optional')}</span></label>
        <input className="in" value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="자동차운반선 / Car carrier" />
      </div>

      <div className="divider" />
      <div className="sec-t"><span>{t('prM.members')}</span><span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>{t('prM.selectedN', { n: draft.partnerIds.length })}</span></div>
      {partners.length === 0 && <div className="empty"><span className="material-symbols-outlined">domain_disabled</span>{t('prM.needPartners')}</div>}
      {partners.map((p) => {
        const on = draft.partnerIds.includes(p.id)
        return (
          <div key={p.id} className={'checkrow' + (on ? ' on' : '')} onClick={() => toggle(p.id)}>
            <div className="cbox"><span className="material-symbols-outlined">check</span></div>
            <div className="pg">
              <div className="pn">{L(p, 'name')} <span className={'badge ' + CATEGORIES[p.cat]?.cls} style={{ marginLeft: 4 }}>{tc(p.cat)}</span></div>
              <div className="pd">{L(p, 'addr') || t('common.noAddress')}</div>
            </div>
          </div>
        )
      })}
    </Modal>
  )
}
