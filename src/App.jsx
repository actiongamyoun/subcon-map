import { useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar.jsx'
import ProjectBar from './components/ProjectBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import MapView from './components/MapView.jsx'
import Gantt from './components/Gantt.jsx'
import PrintView from './components/PrintView.jsx'
import PartnerDetailModal from './components/PartnerDetailModal.jsx'
import Landing from './components/Landing.jsx'
import AdminScreen from './components/AdminScreen.jsx'
import AdminGate from './components/AdminGate.jsx'
import { LangProvider, useLang } from './lib/lang.jsx'
import {
  loadData, isDemo, saveYard, savePartner, deletePartner, saveProject, deleteProject,
} from './lib/api.js'
import { regionOf, REGION_ALL } from './lib/constants.js'

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

  const [view, setView] = useState('landing') // landing | main | admin
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [bannerOff, setBannerOff] = useState(false)

  const [yard, setYard] = useState({})
  const [partners, setPartners] = useState([])
  const [projects, setProjects] = useState([])

  const [selectedId, setSelectedId] = useState(null)
  const [activeProjectId, setActiveProjectId] = useState(null)
  const [region, setRegion] = useState(REGION_ALL)
  const [showAll, setShowAll] = useState(false)
  const [distances, setDistances] = useState({})
  const [detailPartner, setDetailPartner] = useState(null)
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
  // 주소에서 추출한 시/도 목록 (전체 + 등장 지역들)
  const regions = useMemo(() => {
    const set = new Set()
    partners.forEach((p) => { if (p.lat && p.lng) set.add(regionOf(p.addr)) })
    return [REGION_ALL, ...Array.from(set).sort()]
  }, [partners])

  // 표시 협력사: 프로젝트 선택 시 그 멤버만 ∩ 지역 (목록·지도 공통)
  const listPartners = useMemo(() => {
    let arr = activeProject ? partners.filter((p) => activeProject.partnerIds.includes(p.id)) : partners
    if (region !== REGION_ALL) arr = arr.filter((p) => regionOf(p.addr) === region)
    return arr
  }, [partners, activeProject, region])
  const mapPartners = listPartners

  /* ── 핸들러 ── */
  const onRouted = (id, info) => setDistances((d) => ({ ...d, [id]: info }))
  const pickRegion = (r) => { setRegion(r); setShowAll(true); setSelectedId(null) }
  const selectPartner = (id) => { setSelectedId(id); setShowAll(false) }

  const handleSaveYard = (y) => { setYard(y); saveYard(y) }

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

  const openAdmin = () => { if (adminAuthed) setView('admin'); else setGateOpen(true) }
  const gatePass = () => { setAdminAuthed(true); setGateOpen(false); setView('admin') }

  /* ── 랜딩 (데이터 없어도 즉시 표시) ── */
  if (view === 'landing') return <Landing onEnter={() => setView('main')} />

  /* ── 로딩 (메인·관리자는 데이터 필요) ── */
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

  /* ── 관리자 화면 ── */
  if (view === 'admin') {
    return (
      <AdminScreen
        yard={yard}
        partners={partners}
        projects={projects}
        onSaveYard={handleSaveYard}
        onSavePartner={handleSavePartner}
        onDeletePartner={handleDeletePartner}
        onSaveProject={handleSaveProject}
        onDeleteProject={handleDeleteProject}
        onExit={() => setView('main')}
      />
    )
  }

  /* ── 메인 화면 ── */
  return (
    <>
      <div className="app">
        <TopBar
          yard={yard}
          activeProject={activeProject}
          onExportAll={exportAll}
          onExportProject={exportProject}
          onOpenAdmin={openAdmin}
        />

        <ProjectBar
          projects={projects}
          activeId={activeProjectId}
          onSelect={setActiveProjectId}
        />

        <div className="main">
          <Sidebar
            partners={listPartners}
            selectedId={selectedId}
            onSelect={selectPartner}
            distances={distances}
            regions={regions}
            region={region}
            onPickRegion={pickRegion}
            showAll={showAll}
            onDetail={setDetailPartner}
            activeProject={activeProject}
          />
          <div className={'content' + (showAll ? ' map-full' : '')}>
            <MapView yard={yard} partner={selectedPartner} mapPartners={mapPartners} showAll={showAll} onRouted={onRouted} onReset={() => setSelectedId(null)} />
            {!showAll && <Gantt partner={selectedPartner} activeProject={activeProject} projects={projects} />}
          </div>
        </div>
      </div>

      {gateOpen && <AdminGate onClose={() => setGateOpen(false)} onPass={gatePass} />}

      {detailPartner && (
        <PartnerDetailModal
          partner={partners.find((p) => p.id === detailPartner.id) || detailPartner}
          distance={distances[detailPartner.id]}
          onClose={() => setDetailPartner(null)}
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
