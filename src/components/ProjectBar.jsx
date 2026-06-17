import { useLang } from '../lib/lang.jsx'

export default function ProjectBar({ projects, activeId, onSelect, onManage }) {
  const { t, L } = useLang()
  return (
    <div className="projbar">
      <span className="pb-label"><span className="material-symbols-outlined">folder_open</span>{t('nav.projects')}</span>

      <button className={'chip' + (activeId === null ? ' active' : '')} onClick={() => onSelect(null)}>
        {t('nav.all')}
      </button>

      {projects.map((pr) => (
        <button
          key={pr.id}
          className={'chip' + (activeId === pr.id ? ' active' : '')}
          onClick={() => onSelect(pr.id)}
          title={pr.note || L(pr, 'name')}
        >
          {L(pr, 'name')}
          <span className="cnt">{(pr.partnerIds || []).length}</span>
        </button>
      ))}

      <button className="chip chip-add" onClick={onManage}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>tune</span>
        {t('nav.manageProjects')}
      </button>
    </div>
  )
}
