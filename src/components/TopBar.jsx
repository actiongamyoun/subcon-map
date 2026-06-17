import { useState, useRef, useEffect } from 'react'
import { useLang } from '../lib/lang.jsx'

export default function TopBar({ yard, activeProject, onEditYard, onManagePartners, onExportAll, onExportProject }) {
  const { t, L, lang, toggle } = useLang()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const yardName = L(yard, 'name') || t('yard.unset')

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><span className="material-symbols-outlined">directions_boat</span></div>
        <div style={{ minWidth: 0 }}>
          <h1>{t('app.title')}</h1>
          <div className="yard">
            <span className="material-symbols-outlined">anchor</span>
            {yardName}
          </div>
        </div>
      </div>

      <div className="spacer" />

      <button className="btn btn-sm" onClick={toggle} title="Language / 언어">
        <span className="material-symbols-outlined">language</span>{lang === 'ko' ? 'EN' : '한'}
      </button>

      <button className="btn" onClick={onEditYard}>
        <span className="material-symbols-outlined">settings</span>{t('top.yardSettings')}
      </button>
      <button className="btn" onClick={onManagePartners}>
        <span className="material-symbols-outlined">apartment</span>{t('top.managePartners')}
      </button>

      <div className="export-wrap" ref={wrapRef}>
        <button className="btn btn-primary" onClick={() => setOpen((v) => !v)}>
          <span className="material-symbols-outlined">picture_as_pdf</span>{t('top.export')}
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
        </button>
        {open && (
          <div className="menu">
            <button onClick={() => { setOpen(false); onExportAll() }}>
              <span className="material-symbols-outlined">format_list_bulleted</span>
              {t('top.exportAll')}
            </button>
            <button
              disabled={!activeProject}
              onClick={() => { if (activeProject) { setOpen(false); onExportProject() } }}
            >
              <span className="material-symbols-outlined">folder_special</span>
              {t('top.exportProject')}
              <span className="sub">{activeProject ? L(activeProject, 'name') : t('top.selectProject')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
