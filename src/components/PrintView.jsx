import { useLang } from '../lib/lang.jsx'

// 화면에서는 숨겨져 있다가(@media print) 인쇄 시에만 표시되는 명단.
export default function PrintView({ data }) {
  const { t, L, tc } = useLang()
  if (!data) return <div className="print-root" />
  const { title, yard, partners, distances } = data
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const yardName = L(yard, 'name') || '-'

  return (
    <div className="print-root">
      <h1>{title}</h1>
      <div className="pmeta">
        <span>{t('print.shipyard')}: {yardName}</span>
        <span>{t('print.date')}: {dateStr}</span>
        <span>{t('print.partners')}: {partners.length}{t('print.count')}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th className="num">{t('print.no')}</th>
            <th>{t('print.name')}</th>
            <th>{t('print.category')}</th>
            <th>{t('print.address')}</th>
            <th>{t('print.desc')}</th>
            <th className="km">{t('print.distance')}</th>
          </tr>
        </thead>
        <tbody>
          {partners.map((p, i) => {
            const d = distances && distances[p.id]
            return (
              <tr key={p.id}>
                <td className="num">{i + 1}</td>
                <td><b>{L(p, 'name')}</b></td>
                <td className="cat">{tc(p.cat)}</td>
                <td>{L(p, 'addr') || '-'}</td>
                <td>{L(p, 'desc') || '-'}</td>
                <td className="km">{d ? d.km : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="pfoot">{t('print.footer')} · {yardName} · {dateStr}</div>
    </div>
  )
}
