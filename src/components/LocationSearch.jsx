import { useState } from 'react'
import { searchPlaces } from '../lib/kakao.js'
import { useLang } from '../lib/lang.jsx'

// 카카오맵식 검색: 업체명/주소 입력 → 후보 목록 → 선택 시 onPick({name,addr,lat,lng})
export default function LocationSearch({ onPick }) {
  const { t } = useLang()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null) // null=대기 | [] | [..]
  const [loading, setLoading] = useState(false)

  async function run() {
    const query = q.trim()
    if (!query) return
    setLoading(true)
    setResults(null)
    const r = await searchPlaces(query)
    setResults(r)
    setLoading(false)
  }

  const pick = (r) => {
    onPick(r)
    setQ(r.name)
    setResults(null)
  }

  return (
    <div className="locsearch">
      <div className="geo-row">
        <input
          className="in"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run() } }}
          placeholder={t('loc.placeholder')}
        />
        <button className="btn" type="button" onClick={run}>
          <span className="material-symbols-outlined">search</span>{t('loc.searchBtn')}
        </button>
      </div>

      {loading && <div className="locmsg">{t('loc.searching')}</div>}
      {results && results.length === 0 && <div className="locmsg">{t('loc.noResults')}</div>}
      {results && results.length > 0 && (
        <ul className="locresults">
          {results.map((r, i) => (
            <li key={i} onClick={() => pick(r)}>
              <span className="material-symbols-outlined">location_on</span>
              <div className="lr-text">
                <div className="lr-name">{r.name}</div>
                <div className="lr-addr">{r.addr}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
