import { catLabel } from '../lib/constants.js'

// 화면에서는 숨겨져 있다가(@media print) 인쇄 시에만 표시되는 명단.
export default function PrintView({ data }) {
  if (!data) return <div className="print-root" />
  const { title, yard, partners, distances } = data
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <div className="print-root">
      <h1>{title}</h1>
      <div className="pmeta">
        <span>조선소: {yard?.name || '-'}</span>
        <span>출력일: {dateStr}</span>
        <span>협력사: {partners.length}곳</span>
      </div>
      <table>
        <thead>
          <tr>
            <th className="num">No</th>
            <th>협력사명</th>
            <th>분류</th>
            <th>주소</th>
            <th>한줄 소개</th>
            <th className="km">거리(km)</th>
          </tr>
        </thead>
        <tbody>
          {partners.map((p, i) => {
            const d = distances && distances[p.id]
            return (
              <tr key={p.id}>
                <td className="num">{i + 1}</td>
                <td><b>{p.name}</b></td>
                <td className="cat">{catLabel(p.cat)}</td>
                <td>{p.addr || '-'}</td>
                <td>{p.desc || '-'}</td>
                <td className="km">{d ? d.km : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="pfoot">사외협력사 안내 · {yard?.name || ''} · {dateStr} 출력</div>
    </div>
  )
}
