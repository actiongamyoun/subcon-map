import { STATUS_ORDER } from '../lib/constants.js'
import { EN_MONTHS } from '../lib/i18n.js'
import { useLang } from '../lib/lang.jsx'
import CatBadge from './CatBadge.jsx'

// 간트 표시 범위: 아이템 전체를 감싸되, 월 경계로 스냅. 최소 5개월.
function computeRange(items) {
  const today = new Date()
  let min = new Date(today.getFullYear(), today.getMonth(), 1)
  let max = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  items.forEach((it) => {
    const s = new Date(it.start), e = new Date(it.end)
    if (!isNaN(s) && s < min) min = s
    if (!isNaN(e) && e > max) max = e
  })
  const start = new Date(min.getFullYear(), min.getMonth(), 1)
  const end = new Date(max.getFullYear(), max.getMonth() + 1, 0)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  if (months < 5) end.setMonth(start.getMonth() + 5, 0)
  return { start: start.getTime(), end: end.getTime() }
}

function monthList(start, end) {
  const out = []
  const d = new Date(start)
  d.setDate(1)
  while (d.getTime() <= end) {
    out.push({ m: d.getMonth(), ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime() })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

export default function Gantt({ partner, activeProject = null, projects = [] }) {
  const { t, L, ts, lang } = useLang()
  const allItems = partner?.items || []

  // 활성 호선으로 필터: 해당 호선 아이템 + 공통(prj 없음). 전체(호선 미선택)면 모두.
  const items = activeProject
    ? allItems.filter((it) => it.prj === activeProject.id || !it.prj)
    : allItems

  const projName = (prj) => {
    if (!prj) return t('item.common')
    const p = projects.find((x) => x.id === prj)
    return p ? L(p, 'name') : t('item.common')
  }

  const hasAny = partner && allItems.length > 0
  const hasItems = partner && items.length > 0
  const { start, end } = computeRange(items)
  const span = end - start || 1
  const pct = (dateStr) => {
    const ti = new Date(dateStr).getTime()
    if (isNaN(ti)) return 0
    return Math.max(0, Math.min(100, ((ti - start) / span) * 100))
  }
  const todayPct = Math.max(0, Math.min(100, ((Date.now() - start) / span) * 100))
  const months = monthList(start, end)
  const monthLabel = (m) => (lang === 'en' ? EN_MONTHS[m] : m + 1 + '월')

  return (
    <div className="gantt">
      <div className="gantt-head">
        <div className="left">
          <span className="t"><span className="material-symbols-outlined">calendar_month</span>{t('gantt.title')}</span>
          <span className="who">
            {partner ? <>{L(partner, 'name')} <CatBadge cat={partner.cat} /></> : t('gantt.noPartner')}
          </span>
        </div>
        <div className="legend">
          {STATUS_ORDER.map((k) => (
            <span key={k}><i className={'bg-' + k}></i>{ts(k)}</span>
          ))}
        </div>
      </div>

      <div className="gantt-body">
        {!partner ? (
          <div className="empty">
            <span className="material-symbols-outlined">arrow_back</span>
            {t('gantt.selectHint')}
          </div>
        ) : !hasItems ? (
          <div className="empty">
            <span className="material-symbols-outlined">event_busy</span>
            {hasAny && activeProject ? t('gantt.noItemsProject') : t('gantt.noItems')}
          </div>
        ) : (
          <div className="gchart">
            <div className="gmonths">
              {months.map((mm, i) => {
                const x = ((mm.ts - start) / span) * 100
                return <div className="m" key={i} style={{ left: x + '%' }}>{monthLabel(mm.m)}</div>
              })}
            </div>
            <div style={{ position: 'relative' }}>
              {months.map((mm, i) => {
                const x = ((mm.ts - start) / span) * 100
                return <div className="vline" key={i} style={{ left: `calc(168px + (100% - 184px) * ${x / 100})` }} />
              })}
              <div className="today" data-label={t('gantt.today')} style={{ left: `calc(168px + (100% - 184px) * ${todayPct / 100})` }} />
              {items.map((it) => {
                const l = pct(it.start)
                const w = Math.max(1.5, pct(it.end) - l)
                return (
                  <div className="grow" key={it.id || it.name}>
                    <div className="glabel">
                      <div className="gl-name" title={it.name}>{it.name}</div>
                      <div className="gl-prj" title={projName(it.prj)}>{projName(it.prj)}</div>
                    </div>
                    <div className="gtrack">
                      <div className={'gbar b-' + (it.status || 'plan')} style={{ left: l + '%', width: w + '%' }}>
                        <span>{it.name}</span>
                        <span className="dates">{(it.start || '').slice(5)}~{(it.end || '').slice(5)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
