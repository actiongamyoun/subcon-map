import { catLabel, STATUS } from '../lib/constants.js'

// 간트 표시 범위: 선택 협력사의 아이템 전체를 감싸되, 월 경계로 스냅. 최소 5개월.
function computeRange(items) {
  const today = new Date()
  let min = new Date(today.getFullYear(), today.getMonth(), 1)
  let max = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  items.forEach((it) => {
    const s = new Date(it.start), e = new Date(it.end)
    if (!isNaN(s) && s < min) min = s
    if (!isNaN(e) && e > max) max = e
  })
  // 월 경계로 확장
  const start = new Date(min.getFullYear(), min.getMonth(), 1)
  const end = new Date(max.getFullYear(), max.getMonth() + 1, 0)
  // 최소 5개월 보장
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  if (months < 5) end.setMonth(start.getMonth() + 5, 0)
  return { start: start.getTime(), end: end.getTime() }
}

function monthList(start, end) {
  const out = []
  const d = new Date(start)
  d.setDate(1)
  while (d.getTime() <= end) {
    out.push({ label: `${d.getMonth() + 1}월`, ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime() })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

export default function Gantt({ partner }) {
  const items = partner?.items || []
  const hasItems = partner && items.length > 0
  const { start, end } = computeRange(items)
  const span = end - start || 1
  const pct = (dateStr) => {
    const t = new Date(dateStr).getTime()
    if (isNaN(t)) return 0
    return Math.max(0, Math.min(100, ((t - start) / span) * 100))
  }
  const todayPct = Math.max(0, Math.min(100, ((Date.now() - start) / span) * 100))
  const months = monthList(start, end)

  return (
    <div className="gantt">
      <div className="gantt-head">
        <div className="left">
          <span className="t"><span className="material-symbols-outlined">calendar_month</span>진행 일정</span>
          <span className="who">{partner ? `${partner.name} · ${catLabel(partner.cat)}` : '협력사 미선택'}</span>
        </div>
        <div className="legend">
          {Object.entries(STATUS).map(([k, v]) => (
            <span key={k}><i className={'bg-' + k}></i>{v.label}</span>
          ))}
        </div>
      </div>

      <div className="gantt-body">
        {!partner ? (
          <div className="empty">
            <span className="material-symbols-outlined">arrow_back</span>
            협력사를 선택하면 진행 아이템과 착수·종료 예상 일정이 표시됩니다.
          </div>
        ) : !hasItems ? (
          <div className="empty">
            <span className="material-symbols-outlined">event_busy</span>
            등록된 아이템이 없습니다. 상단 ‘협력사 관리’에서 추가할 수 있어요.
          </div>
        ) : (
          <div className="gchart">
            <div className="gmonths">
              {months.map((m, i) => {
                const x = ((m.ts - start) / span) * 100
                return <div className="m" key={i} style={{ left: x + '%' }}>{m.label}</div>
              })}
            </div>
            <div style={{ position: 'relative' }}>
              {months.map((m, i) => {
                const x = ((m.ts - start) / span) * 100
                return <div className="vline" key={i} style={{ left: `calc(168px + (100% - 184px) * ${x / 100})` }} />
              })}
              <div className="today" style={{ left: `calc(168px + (100% - 184px) * ${todayPct / 100})` }} />
              {items.map((it) => {
                const l = pct(it.start)
                const w = Math.max(1.5, pct(it.end) - l)
                return (
                  <div className="grow" key={it.id || it.name}>
                    <div className="glabel" title={it.name}>{it.name}</div>
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
