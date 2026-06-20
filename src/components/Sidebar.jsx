import { useState } from 'react'
import CatBadge from './CatBadge.jsx'
import { REGION_ALL } from '../lib/constants.js'
import { useLang } from '../lib/lang.jsx'

// 지역(시/도) + 모두 보기 드롭다운 — 선택 시 지도 모두 보기 진입
function RegionMenu({ regions, region, showAll, onPick }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const label = showAll && region !== REGION_ALL ? region : t('region.showAll')
  const labelOf = (r) => (r === REGION_ALL ? t('region.all') : r)
  return (
    <div className="region-menu">
      <button className={'region-btn' + (showAll ? ' active' : '')} onClick={() => setOpen((v) => !v)}>
        <span className="material-symbols-outlined">map</span>
        <span className="rb-label">{label}</span>
        <span className="material-symbols-outlined rb-caret">expand_more</span>
      </button>
      {open && (
        <>
          <div className="region-scrim" onClick={() => setOpen(false)} />
          <div className="region-list">
            {regions.map((r) => (
              <button
                key={r}
                className={'region-item' + (showAll && region === r ? ' on' : '')}
                onClick={() => { onPick(r); setOpen(false) }}
              >
                <span className="material-symbols-outlined">{r === REGION_ALL ? 'public' : 'location_on'}</span>
                {labelOf(r)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Sidebar({
  partners, selectedId, onSelect, distances,
  regions = [REGION_ALL], region = REGION_ALL, onPickRegion, showAll = false,
  onDetail, activeProject,
}) {
  const { t, L } = useLang()
  const [copiedId, setCopiedId] = useState(null)

  const sharePartner = (p) => {
    const name = L(p, 'name')
    const addr = L(p, 'addr') || ''
    const link = p.lat && p.lng
      ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
      : addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : ''
    const text = [name, addr, link].filter(Boolean).join('\n')
    if (navigator.share) {
      navigator.share({ title: name, text }).catch(() => {})
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(p.id)
        setTimeout(() => setCopiedId(null), 1500)
      }).catch(() => {})
    }
  }

  const subtitle = activeProject
    ? t('side.projectCount', { name: L(activeProject, 'name'), n: partners.length })
    : t('side.registeredN', { n: partners.length })

  return (
    <aside className="sidebar">
      <div className="side-head">
        <div className="sh-left">
          <div className="row">
            <span className="t">{t('side.partners')}</span>
          </div>
          <div className="c">{subtitle}</div>
        </div>
        <RegionMenu regions={regions} region={region} showAll={showAll} onPick={onPickRegion} />
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
            const dist = distances[p.id]
            return (
              <div
                key={p.id}
                className={'card' + (isSel ? ' active' : '')}
                onClick={() => onSelect(p.id)}
              >
                <div className="body">
                  <div className="name">
                    <span className="nm-text">{L(p, 'name')}</span>
                    <CatBadge cat={p.cat} />
                    <div className="card-actions">
                      <button
                        className="share-btn detail-btn"
                        onClick={(e) => { e.stopPropagation(); onDetail && onDetail(p) }}
                        title={t('detail.open')}
                      >
                        <span className="material-symbols-outlined">info</span>
                      </button>
                      <button
                        className="share-btn"
                        onClick={(e) => { e.stopPropagation(); sharePartner(p) }}
                        title={t('share.title')}
                      >
                        <span className="material-symbols-outlined">{copiedId === p.id ? 'check' : 'ios_share'}</span>
                      </button>
                    </div>
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
