import { useState } from 'react'
import Modal from './Modal.jsx'
import { catLabel, CATEGORIES } from '../lib/constants.js'

const blankDraft = () => ({ id: null, name: '', note: '', partnerIds: [] })

export default function ProjectModal({ projects, partners, onClose, onSave, onDelete }) {
  const [mode, setMode] = useState('list')
  const [draft, setDraft] = useState(blankDraft())

  const startAdd = () => { setDraft(blankDraft()); setMode('edit') }
  const startEdit = (pr) => { setDraft({ ...pr, partnerIds: [...(pr.partnerIds || [])] }); setMode('edit') }
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const toggle = (id) => setDraft((d) => ({
    ...d,
    partnerIds: d.partnerIds.includes(id) ? d.partnerIds.filter((x) => x !== id) : [...d.partnerIds, id],
  }))

  const save = () => { onSave({ ...draft, name: draft.name.trim(), note: draft.note.trim() }); setMode('list') }
  const remove = (pr) => { if (window.confirm(`‘${pr.name}’ 프로젝트를 삭제할까요?`)) onDelete(pr.id) }

  if (mode === 'list') {
    return (
      <Modal
        icon="folder_open" title="프로젝트 관리" subtitle="프로젝트를 만들고 포함할 협력사를 선택하세요. 출력 시 프로젝트별 명단으로 사용됩니다."
        onClose={onClose}
        footer={<div className="right"><button className="btn btn-lg" onClick={onClose}>닫기</button></div>}
      >
        <div className="sec-t">
          <span>프로젝트 목록</span>
          <button className="btn btn-primary btn-sm" onClick={startAdd}><span className="material-symbols-outlined">add</span>프로젝트 추가</button>
        </div>
        <div className="plist">
          {projects.length === 0 && <div className="empty"><span className="material-symbols-outlined">create_new_folder</span>아직 프로젝트가 없습니다.</div>}
          {projects.map((pr) => (
            <div className="pitem" key={pr.id}>
              <div className="pg">
                <div className="pn">{pr.name}</div>
                <div className="pd">{pr.note ? pr.note + ' · ' : ''}협력사 {(pr.partnerIds || []).length}곳</div>
              </div>
              <button className="linkbtn" onClick={() => startEdit(pr)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>수정</button>
              <button className="linkbtn danger" onClick={() => remove(pr)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>삭제</button>
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      icon={draft.id ? 'edit' : 'create_new_folder'}
      title={draft.id ? '프로젝트 수정' : '프로젝트 추가'}
      subtitle="프로젝트명과 포함할 협력사를 선택하세요."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-lg" onClick={() => setMode('list')}><span className="material-symbols-outlined">arrow_back</span>목록</button>
          <div className="right">
            <button className="btn btn-primary btn-lg" onClick={save} disabled={!draft.name.trim()}>
              <span className="material-symbols-outlined">check</span>저장
            </button>
          </div>
        </>
      }
    >
      <div className="field">
        <label>프로젝트명</label>
        <input className="in" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="예) 2031호선 (PCTC)" />
      </div>
      <div className="field">
        <label>비고 <span className="hint">선택</span></label>
        <input className="in" value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="예) 자동차운반선" />
      </div>

      <div className="divider" />
      <div className="sec-t"><span>포함 협력사</span><span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>{draft.partnerIds.length}곳 선택됨</span></div>
      {partners.length === 0 && <div className="empty"><span className="material-symbols-outlined">domain_disabled</span>먼저 협력사를 등록하세요.</div>}
      {partners.map((p) => {
        const on = draft.partnerIds.includes(p.id)
        return (
          <div key={p.id} className={'checkrow' + (on ? ' on' : '')} onClick={() => toggle(p.id)}>
            <div className="cbox"><span className="material-symbols-outlined">check</span></div>
            <div className="pg">
              <div className="pn">{p.name} <span className={'badge ' + CATEGORIES[p.cat]?.cls} style={{ marginLeft: 4 }}>{catLabel(p.cat)}</span></div>
              <div className="pd">{p.addr || '주소 미입력'}</div>
            </div>
          </div>
        )
      })}
    </Modal>
  )
}
