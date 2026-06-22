import { useState } from 'react'
import { useLang } from '../lib/lang.jsx'

// 메인 상단 프로젝트 선택 — 드롭다운 (프로젝트가 늘어나도 깔끔하게)
export default function ProjectBar({ projects, activeId, onSelect }) {
  const { t, L } = useLang()
  const [open, setOpen] = useState(false)
  const active = projects.find((p) => p.id === activeId) || null

  return (
    <div className="projbar">
      <span className="pb-label"><span className="material-symbols-outlined">folder_open</span>{t('nav.projects')}</span>

      <div className="proj-menu">
        <button className={'proj-btn' + (activeId !== null ? ' active' : '')} onClick={() => setOpen((v) => !v)}>
          <span className="material-symbols-outlined">{active ? 'folder' : 'apps'}</span>
          <span className="pm-name">{active ? L(active, 'name') : t('nav.all')}</span>
          {active && <span className="cnt">{(active.partnerIds || []).length}</span>}
          <span className="material-symbols-outlined pm-caret">expand_more</span>
        </button>

        {open && (
          <>
            <div className="proj-scrim" onClick={() => setOpen(false)} />
            <div className="proj-list">
              <button
                className={'proj-item' + (activeId === null ? ' on' : '')}
                onClick={() => { onSelect(null); setOpen(false) }}
              >
                <span className="material-symbols-outlined">apps</span>
                <span className="pi-name">{t('nav.all')}</span>
              </button>
              {projects.map((pr) => (
                <button
                  key={pr.id}
                  className={'proj-item' + (activeId === pr.id ? ' on' : '')}
                  onClick={() => { onSelect(pr.id); setOpen(false) }}
                  title={pr.note || L(pr, 'name')}
                >
                  <span className="material-symbols-outlined">folder</span>
                  <span className="pi-name">{L(pr, 'name')}</span>
                  <span className="cnt">{(pr.partnerIds || []).length}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
