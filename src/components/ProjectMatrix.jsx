import { useState } from 'react'
import Modal from './Modal.jsx'
import { STATUS_ORDER } from '../lib/constants.js'
import { useLang } from '../lib/lang.jsx'

const tmpId = (p) => p + '_' + Math.random().toString(36).slice(2, 8)

/* ── 프로젝트 이름/메모 편집 + 삭제 (작은 팝업) ── */
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

/* ── (협력사 × 프로젝트) 공정 일정 편집 팝업 ── */
function ScheduleEditor({ partner, project, onClose, onSave }) {
  const { t, L, ts } = useLang()
  const [rows, setRows] = useState(() => (partner.items || []).filter((it) => it.prj === project.id).map((it) => ({ ...it })))
  const set = (i, k, v) => setRows((r) => { const n = r.slice(); n[i] = { ...n[i], [k]: v }; return n })
  const add = () => setRows((r) => [...r, { id: tmpId('i'), name: '', prj: project.id, start: '', end: '', status: 'plan' }])
  const del = (i) => setRows((r) => r.filter((_, x) => x !== i))

  const save = () => {
    const others = (partner.items || []).filter((it) => it.prj !== project.id) // 다른 호선 공정은 보존
    const mine = rows
      .filter((it) => (it.name || '').trim())
      .map((it) => ({ id: it.id || tmpId('i'), name: it.name.trim(), prj: project.id, start: it.start || '', end: it.end || '', status: it.status || 'plan' }))
    onSave({ ...partner, items: [...others, ...mine] })
  }

  return (
    <Modal
      icon="calendar_month"
      title={t('sched.title')}
      subtitle={`${L(partner, 'name')} · ${L(project, 'name')}`}
      onClose={onClose}
      footer={
        <div className="right">
          <button className="btn btn-lg" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary btn-lg" onClick={save}><span className="material-symbols-outlined">check</span>{t('common.save')}</button>
        </div>
      }
    >
      {rows.length > 0 && (
        <div className="itemhead">
          <div>{t('pM.itemName')}</div><div>{t('pM.itemStart')}</div><div>{t('pM.itemEnd')}</div><div>{t('pM.itemStatus')}</div><div></div>
        </div>
      )}
      {rows.map((it, i) => (
        <div className="itemrow" key={it.id || i}>
          <input className="in" value={it.name} onChange={(e) => set(i, 'name', e.target.value)} placeholder="1번 블록 배관 설치" />
          <input className="in" type="date" value={it.start || ''} onChange={(e) => set(i, 'start', e.target.value)} />
          <input className="in" type="date" value={it.end || ''} onChange={(e) => set(i, 'end', e.target.value)} />
          <select className="sel" value={it.status || 'plan'} onChange={(e) => set(i, 'status', e.target.value)}>
            {STATUS_ORDER.map((k) => <option key={k} value={k}>{ts(k)}</option>)}
          </select>
          <button className="del" onClick={() => del(i)} title={t('common.delete')}><span className="material-symbols-outlined">delete</span></button>
        </div>
      ))}
      {rows.length === 0 && <div className="empty"><span className="material-symbols-outlined">event_busy</span>{t('sched.empty')}</div>}
      <button className="addrow" onClick={add}><span className="material-symbols-outlined">add</span>{t('pM.addItem')}</button>
    </Modal>
  )
}

export default function ProjectMatrix({ projects, partners, onSaveProject, onDeleteProject, onSavePartner }) {
  const { t, L } = useLang()
  const [editProj, setEditProj] = useState(null)
  const [sched, setSched] = useState(null) // { partner, project } | null

  const isIn = (proj, pid) => (proj.partnerIds || []).includes(pid)
  const toggle = (proj, pid) => {
    const partnerIds = isIn(proj, pid)
      ? proj.partnerIds.filter((x) => x !== pid)
      : [...(proj.partnerIds || []), pid]
    onSaveProject({ ...proj, partnerIds })
  }
  const itemCount = (p, pr) => (p.items || []).filter((it) => it.prj === pr.id).length
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
                {partners.map((p) => (
                  <th key={p.id} className="mtx-ph">
                    <span className="mtx-ph-name">{L(p, 'name')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((pr) => (
                <tr key={pr.id}>
                  <td className="mtx-rn">
                    <button className="mtx-pname" onClick={() => setEditProj(pr)} title={t('common.edit')}>
                      <span className="mtx-pn-text">{L(pr, 'name')}</span>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <span className="mtx-pcnt">{(pr.partnerIds || []).length}</span>
                  </td>
                  {partners.map((p) => {
                    const on = isIn(pr, p.id)
                    const cnt = itemCount(p, pr)
                    return (
                      <td key={p.id} className="mtx-cell">
                        <div className="mtx-cellin">
                          <button className={'mtx-chk' + (on ? ' on' : '')} onClick={() => toggle(pr, p.id)} aria-pressed={on} title={on ? t('mtx.unassign') : t('mtx.assign')}>
                            <span className="material-symbols-outlined">check</span>
                          </button>
                          {on && (
                            <button className={'mtx-sch' + (cnt > 0 ? ' has' : '')} onClick={() => setSched({ partner: p, project: pr })} title={t('sched.edit')}>
                              <span className="material-symbols-outlined">calendar_month</span>
                              <span className="mtx-scn">{cnt}</span>
                            </button>
                          )}
                        </div>
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

      {sched && (
        <ScheduleEditor
          partner={sched.partner}
          project={sched.project}
          onClose={() => setSched(null)}
          onSave={(pp) => { onSavePartner && onSavePartner(pp); setSched(null) }}
        />
      )}
    </div>
  )
}
