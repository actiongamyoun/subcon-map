import { useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar.jsx'
import ProjectBar from './components/ProjectBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import MapView from './components/MapView.jsx'
import Gantt from './components/Gantt.jsx'
import PrintView from './components/PrintView.jsx'
import YardModal from './components/YardModal.jsx'
import PartnerModal from './components/PartnerModal.jsx'
import ProjectModal from './components/ProjectModal.jsx'
import { LangProvider, useLang } from './lib/lang.jsx'
import {
  loadData, isDemo, saveYard, savePartner, deletePartner, saveProject, deleteProject,
} from './lib/api.js'

const newId = (p) => p + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1000)

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  )
}

function AppInner() {
  const { t, L } = useLang()

  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [bannerOff, setBannerOff] = useState(false)

  const [yard, setYard] = useState({})
  const [partners, setPartners] = useState([])
  const [projects, setProjects] = useState([])

  const [selectedId, setSelectedId] = useState(null)
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [distances, setDistances] = useState({})

  const [yardOpen, setYardOpen] = useState(false)
  const [partnersOpen, setPartnersOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [printData, setPrintData] = useState(null)

  // 초기 로드
  useEffect(() => {
    loadData().then((d) => {
      setYard(d.yard || {})
      setPartners(d.partners || [])
      setProjects(d.projects || [])
      setDemo(isDemo())
      setLoading(false)
    })
  }, [])

  // 인쇄 트리거
  useEffect(() => {
    if (!printData) return
    const tm = setTimeout(() => { window.print(); setPrintData(null) }, 80)
    return () => clearTimeout(tm)
  }, [printData])

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  )
  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === selectedId) || null,
    [partners, selectedId]
  )
  const checkedIds = useMemo(
    () => new Set(activeProject ? activeProject.partnerIds : []),
    [activeProject]
  )
  // 전체보기 범위: 호선 선택 시 그 멤버, 전체면 모든 협력사
  const mapPartners = useMemo(
    () => (activeProject ? partners.filter((p) => activeProject.partnerIds.includes(p.id)) : partners),
    [partners, activeProject]
  )

  /* ── 핸들러 ── */
  const onRouted = (id, info) => setDistances((d) => ({ ...d, [id]: info }))

  const onToggleCheck = (partnerId) => {
    if (!activeProject) return
    const has = activeProject.partnerIds.includes(partnerId)
    const partnerIds = has
      ? activeProject.partnerIds.filter((x) => x !== partnerId)
      : [...activeProject.partnerIds, partnerId]
    const next = { ...activeProject, partnerIds }
    setProjects((ps) => ps.map((p) => (p.id === next.id ? next : p)))
    saveProject(next)
  }

  const handleSaveYard = (y) => { setYard(y); setYardOpen(false); saveYard(y) }

  const handleSavePartner = (p) => {
    const withId = p.id ? p : { ...p, id: newId('p') }
    setPartners((list) => {
      const i = list.findIndex((x) => x.id === withId.id)
      if (i >= 0) { const next = list.slice(); next[i] = withId; return next }
      return [...list, withId]
    })
    savePartner(withId)
  }

  const handleDeletePartner = (id) => {
    setPartners((list) => list.filter((x) => x.id !== id))
    setProjects((ps) => ps.map((pr) => ({ ...pr, partnerIds: (pr.partnerIds || []).filter((x) => x !== id) })))
    if (selectedId === id) setSelectedId(null)
    deletePartner(id)
  }

  const handleSaveProject = (pr) => {
    const withId = pr.id ? pr : { ...pr, id: newId('prj') }
    setProjects((list) => {
      const i = list.findIndex((x) => x.id === withId.id)
      if (i >= 0) { const next = list.slice(); next[i] = withId; return next }
      return [...list, withId]
    })
    saveProject(withId)
  }

  const handleDeleteProject = (id) => {
    setProjects((list) => list.filter((x) => x.id !== id))
    if (activeProjectId === id) setActiveProjectId(null)
    deleteProject(id)
  }

  const exportAll = () =>
    setPrintData({ title: t('print.allTitle'), yard, partners, distances })

  const exportProject = () => {
    if (!activeProject) return
    const members = partners.filter((p) => activeProject.partnerIds.includes(p.id))
    setPrintData({ title: t('print.projectTitle', { name: L(activeProject, 'name') }), yard, partners: members, distances })
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: '#6B8199' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="material-symbols-outlined" style={{ fontSize: 40, color: '#0EA5A4' }}>directions_boat</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>{t('app.loading')}</div>
        </div>
      </div>
    )
  }

  const projectMode = activeProjectId !== null

  return (
    <>
      <div className="app">
        <TopBar
          yard={yard}
          activeProject={activeProject}
          onEditYard={() => setYardOpen(true)}
          onManagePartners={() => setPartnersOpen(true)}
          onExportAll={exportAll}
          onExportProject={exportProject}
        />

        <ProjectBar
          projects={projects}
          activeId={activeProjectId}
          onSelect={setActiveProjectId}
          onManage={() => setProjectsOpen(true)}
        />

        <div className="main">
          <Sidebar
            partners={partners}
            selectedId={selectedId}
            onSelect={setSelectedId}
            projectMode={projectMode}
            activeProject={activeProject}
            checkedIds={checkedIds}
            onToggleCheck={onToggleCheck}
            distances={distances}
          />
          <div className="content">
            <MapView yard={yard} partner={selectedPartner} mapPartners={mapPartners} onRouted={onRouted} onShowAll={() => setSelectedId(null)} />
            <Gantt partner={selectedPartner} activeProject={activeProject} projects={projects} />
          </div>
        </div>
      </div>

      {yardOpen && <YardModal yard={yard} onClose={() => setYardOpen(false)} onSave={handleSaveYard} />}
      {partnersOpen && (
        <PartnerModal
          partners={partners}
          projects={projects}
          activeProjectId={activeProjectId}
          onClose={() => setPartnersOpen(false)}
          onSave={handleSavePartner}
          onDelete={handleDeletePartner}
        />
      )}
      {projectsOpen && (
        <ProjectModal
          projects={projects}
          partners={partners}
          onClose={() => setProjectsOpen(false)}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
        />
      )}

      <PrintView data={printData} />

      {demo && !bannerOff && (
        <div className="demo-banner">
          <span className="material-symbols-outlined">info</span>
          <span><b>{t('demo.tag')}</b>{t('demo.body')}</span>
          <button className="btn-ghost btn-sm" style={{ color: '#fff', padding: '2px 6px' }} onClick={() => setBannerOff(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>
      )}
    </>
  )
}
