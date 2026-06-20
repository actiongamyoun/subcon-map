import { useState } from 'react'
import Modal from './Modal.jsx'
import CatBadge from './CatBadge.jsx'
import { useLang } from '../lib/lang.jsx'

// 프로젝트 이름/메모 편집 + 삭제 (작은 팝업)
function ProjEditPopup({ project, onClose, onSave, onDelete }) {
  const { t, L } = useLang()
  const isNew = !project.id
  const [f, setF] = useState({ name: project.name || '', name_en: project.name_en || '', note: project.note || '' })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = () => { if (f.name.trim()) onSave({ ...project, name: f.name.trim(), name_en: f.name_en.trim(), note: f.note.trim() }) }
  const remove = () => { if (window.confirm(t('prM.confirmDelete', { name: L(project, 'name') }))) onDelete(project.id) }

  return (
    <Modal
      icon={isNew ? 'create_new_folder' : 'edit'}
      title={isNew ? t('prM.addTitle') : t('prM.editTitle')}
      onClose={onClose}
      footer={
        <>
          {!isNew
            ? <button className="linkbtn danger" onClick={remove}><span className="material-symbols-outlined" style={{ fontSize: 17 }}>delete</span>{t('common.delete')}</button>
            : <span />}
          <div className="right">
            <button className="btn btn-lg" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn btn-primary btn-lg" onClick={save} disabled={!f.name.trim()}>
              <span className="material-symbols-outlined">check</span>{t('common.save')}
            </button>
          </div>
        </>
      }
    >
      <div className="field">
        <label>{t('prM.name')}</label>
        <input className="in" value={f.name} autoFocus onChange={(e) => set('name', e.target.value)} placeholder="2031호선 (PCTC)" />
      </div>
      <div className="field">
        <label>{t('prM.nameEn')}</label>
        <input className="in" value={f.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder="Hull 2031 (PCTC)" />
      </div>
      <div className="field">
        <label>{t('prM.note')} <span className="hint">{t('common.optional')}</span></label>
        <input className="in" value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="자동차운반선 / Car carrier" />
      </div>
    </Modal>
  )
}

export default function ProjectMatrix({ projects, partners, onSaveProject, onDeleteProject }) {
  const { t, L } = useLang()
  const [editProj, setEditProj] = useState(null)

  const isIn = (proj, pid) => (proj.partnerIds || []).includes(pid)
  const toggle = (proj, pid) => {
    const partnerIds = isIn(proj, pid)
      ? proj.partnerIds.filter((x) => x !== pid)
      : [...(proj.partnerIds || []), pid]
    onSaveProject({ ...proj, partnerIds })
  }
  const blank = { id: null, name: '', name_en: '', note: '', partnerIds: [] }

  return (
    <div className="mtx-wrap">
      <div className="mtx-bar">
        <div>
          <div className="mtx-title">{t('mtx.title')}</div>
          <div className="mtx-sub">{t('mtx.subtitle')}</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setEditProj(blank)}>
          <span className="material-symbols-outlined">add</span>{t('prM.addProject')}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty"><span className="material-symbols-outlined">create_new_folder</span>{t('prM.empty')}</div>
      ) : partners.length === 0 ? (
        <div className="empty"><span className="material-symbols-outlined">domain_disabled</span>{t('prM.needPartners')}</div>
      ) : (
        <div className="mtx-scroll">
          <table className="mtx">
            <thead>
              <tr>
                <th className="mtx-corner">{t('mtx.corner')}</th>
                {projects.map((pr) => (
                  <th key={pr.id} className="mtx-ph">
                    <button className="mtx-pname" onClick={() => setEditProj(pr)} title={t('common.edit')}>
                      <span className="mtx-pn-text">{L(pr, 'name')}</span>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <span className="mtx-pcnt">{(pr.partnerIds || []).length}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id}>
                  <td className="mtx-rn">
                    <div className="mtx-rn-in">
                      <span className="mtx-rn-name">{L(p, 'name')}</span>
                      <CatBadge cat={p.cat} />
                    </div>
                  </td>
                  {projects.map((pr) => {
                    const on = isIn(pr, p.id)
                    return (
                      <td key={pr.id} className="mtx-cell">
                        <button className={'mtx-chk' + (on ? ' on' : '')} onClick={() => toggle(pr, p.id)} aria-pressed={on}>
                          <span className="material-symbols-outlined">check</span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editProj && (
        <ProjEditPopup
          project={editProj}
          onClose={() => setEditProj(null)}
          onSave={(pr) => { onSaveProject(pr); setEditProj(null) }}
          onDelete={(id) => { onDeleteProject(id); setEditProj(null) }}
        />
      )}
    </div>
  )
}
