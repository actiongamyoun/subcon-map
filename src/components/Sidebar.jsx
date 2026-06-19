import CatBadge from './CatBadge.jsx'
import { useLang } from '../lib/lang.jsx'

export default function Sidebar({
  partners, selectedId, onSelect,
  projectMode, activeProject, checkedIds, onToggleCheck,
  distances,
}) {
  const { t, L } = useLang()
  return (
    <aside className="sidebar">
      <div className="side-head">
        <div className="row">
          <span className="t">{t('side.partners')}</span>
          {projectMode && activeProject && (
            <span className="proj-tag">
              <span className="material-symbols-outlined">check_circle</span>
              {t('side.selectedN', { n: checkedIds.size })}
            </span>
          )}
        </div>
        <div className="c">
          {projectMode && activeProject
            ? t('side.projectHint', { name: L(activeProject, 'name') })
            : t('side.registeredN', { n: partners.length })}
        </div>
      </div>

      <div className="cards">
        {partners.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined">domain_disabled</span>
            {t('side.emptyTitle')}<br />{t('side.emptyHint')}
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
                    title={checked ? t('side.removeFromProject') : t('side.addToProject')}
                  >
                    <span className="material-symbols-outlined">check</span>
                  </div>
                )}
                <div className="body">
                  <div className="name">
                    {L(p, 'name')}
                    <CatBadge cat={p.cat} />
                  </div>
                  {L(p, 'desc') && <div className="desc">{L(p, 'desc')}</div>}
                  <div className={'meta' + (dist ? '' : ' dim')}>
                    <span className="material-symbols-outlined">route</span>
                    {dist ? (
                      <><span>{t('side.fromYard')}</span><span className="km">{dist.km} km</span>{dist.sim && <span style={{ color: 'var(--muted)' }}>({t('side.estimate')})</span>}</>
                    ) : (
                      <span className="km">{t('side.viewRoute')}</span>
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
