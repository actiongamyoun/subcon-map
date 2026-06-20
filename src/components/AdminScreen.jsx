import { useState } from 'react'
import YardModal from './YardModal.jsx'
import PartnerModal from './PartnerModal.jsx'
import ProjectModal from './ProjectModal.jsx'
import { useLang } from '../lib/lang.jsx'

const TABS = [
  { key: 'partners', icon: 'apartment', label: 'admin.tabPartners' },
  { key: 'projects', icon: 'folder_open', label: 'admin.tabProjects' },
  { key: 'yard', icon: 'settings', label: 'admin.tabYard' },
]

export default function AdminScreen({
  yard, partners, projects,
  onSaveYard, onSavePartner, onDeletePartner, onSaveProject, onDeleteProject,
  onExit,
}) {
  const { t } = useLang()
  const [tab, setTab] = useState('partners')
  const noop = () => {}

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="admin-brand">
          <div className="brand-mark sm"><span className="material-symbols-outlined">admin_panel_settings</span></div>
          <div style={{ minWidth: 0 }}>
            <h1>{t('admin.title')}</h1>
            <div className="admin-sub">{t('admin.subtitle')}</div>
          </div>
        </div>
        <button className="btn" onClick={onExit}>
          <span className="material-symbols-outlined">logout</span>{t('admin.exit')}
        </button>
      </header>

      <nav className="admin-tabs">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            className={'admin-tab' + (tab === tb.key ? ' on' : '')}
            onClick={() => setTab(tb.key)}
          >
            <span className="material-symbols-outlined">{tb.icon}</span>{t(tb.label)}
          </button>
        ))}
      </nav>

      <div className="admin-body">
        {tab === 'partners' && (
          <PartnerModal
            embedded
            partners={partners}
            projects={projects}
            onClose={noop}
            onSave={onSavePartner}
            onDelete={onDeletePartner}
          />
        )}
        {tab === 'projects' && (
          <ProjectModal
            embedded
            projects={projects}
            partners={partners}
            onClose={noop}
            onSave={onSaveProject}
            onDelete={onDeleteProject}
          />
        )}
        {tab === 'yard' && (
          <YardModal embedded yard={yard} onClose={noop} onSave={onSaveYard} />
        )}
      </div>
    </div>
  )
}
