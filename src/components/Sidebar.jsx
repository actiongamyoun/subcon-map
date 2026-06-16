import { catLabel, catClass } from '../lib/constants.js'

export default function Sidebar({
  partners, selectedId, onSelect,
  projectMode, activeProject, checkedIds, onToggleCheck,
  distances,
}) {
  return (
    <aside className="sidebar">
      <div className="side-head">
        <div className="row">
          <span className="t">협력사 목록</span>
          {projectMode && activeProject && (
            <span className="proj-tag">
              <span className="material-symbols-outlined">check_circle</span>
              {checkedIds.size}개 선택
            </span>
          )}
        </div>
        <div className="c">
          {projectMode && activeProject
            ? `${activeProject.name} · 체크된 협력사가 PDF에 포함됩니다`
            : `${partners.length} 곳 등록됨`}
        </div>
      </div>

      <div className="cards">
        {partners.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined">domain_disabled</span>
            등록된 협력사가 없습니다.<br />상단 ‘협력사 관리’에서 추가하세요.
          </div>
        ) : (
          partners.map((p) => {
            const isSel = p.id === selectedId
            const checked = projectMode && checkedIds.has(p.id)
            const dist = distances[p.id]
            return (
              <div
                key={p.id}
                className={'card' + (isSel ? ' active' : '')}
                onClick={() => onSelect(p.id)}
              >
                {projectMode && (
                  <div
                    className={'check' + (checked ? ' on' : '')}
                    onClick={(e) => { e.stopPropagation(); onToggleCheck(p.id) }}
                    role="checkbox"
                    aria-checked={checked}
                    title={checked ? '프로젝트에서 제외' : '프로젝트에 추가'}
                  >
                    <span className="material-symbols-outlined">check</span>
                  </div>
                )}
                <div className="body">
                  <div className="name">
                    {p.name}
                    <span className={'badge ' + catClass(p.cat)}>{catLabel(p.cat)}</span>
                  </div>
                  {p.desc && <div className="desc">{p.desc}</div>}
                  <div className={'meta' + (dist ? '' : ' dim')}>
                    <span className="material-symbols-outlined">route</span>
                    {dist ? (
                      <><span>조선소에서</span><span className="km">{dist.km} km</span>{dist.sim && <span style={{ color: 'var(--muted)' }}>(추정)</span>}</>
                    ) : (
                      <span className="km">경로 보기 →</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
