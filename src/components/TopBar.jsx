import { useState, useRef, useEffect } from 'react'

export default function TopBar({ yardName, activeProject, onEditYard, onManagePartners, onExportAll, onExportProject }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><span className="material-symbols-outlined">directions_boat</span></div>
        <div style={{ minWidth: 0 }}>
          <h1>사외협력사 안내</h1>
          <div className="yard">
            <span className="material-symbols-outlined">anchor</span>
            {yardName || '조선소 미설정'}
          </div>
        </div>
      </div>

      <div className="spacer" />

      <button className="btn" onClick={onEditYard}>
        <span className="material-symbols-outlined">settings</span>조선소 설정
      </button>
      <button className="btn" onClick={onManagePartners}>
        <span className="material-symbols-outlined">apartment</span>협력사 관리
      </button>

      <div className="export-wrap" ref={wrapRef}>
        <button className="btn btn-primary" onClick={() => setOpen((v) => !v)}>
          <span className="material-symbols-outlined">picture_as_pdf</span>출력
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
        </button>
        {open && (
          <div className="menu">
            <button onClick={() => { setOpen(false); onExportAll() }}>
              <span className="material-symbols-outlined">format_list_bulleted</span>
              전체 협력사 명단
            </button>
            <button
              disabled={!activeProject}
              onClick={() => { if (activeProject) { setOpen(false); onExportProject() } }}
            >
              <span className="material-symbols-outlined">folder_special</span>
              현재 프로젝트 명단
              <span className="sub">{activeProject ? activeProject.name : '프로젝트 선택'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
