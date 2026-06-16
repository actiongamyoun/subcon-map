import { useState } from 'react'
import Modal from './Modal.jsx'
import { geocode } from '../lib/kakao.js'
import { CATEGORY_ORDER, CATEGORIES, STATUS_ORDER, STATUS, catLabel } from '../lib/constants.js'

const tmpId = (p) => p + '_' + Math.random().toString(36).slice(2, 8)
const blankDraft = () => ({ id: null, name: '', cat: 'paint', addr: '', desc: '', lat: '', lng: '', items: [] })

export default function PartnerModal({ partners, onClose, onSave, onDelete }) {
  const [mode, setMode] = useState('list') // list | edit
  const [draft, setDraft] = useState(blankDraft())
  const [geo, setGeo] = useState(null)

  const startAdd = () => { setDraft(blankDraft()); setGeo(null); setMode('edit') }
  const startEdit = (p) => {
    setDraft({ ...p, lat: p.lat ?? '', lng: p.lng ?? '', items: (p.items || []).map((it) => ({ ...it })) })
    setGeo(null); setMode('edit')
  }

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const setItem = (i, k, v) => setDraft((d) => {
    const items = d.items.slice(); items[i] = { ...items[i], [k]: v }; return { ...d, items }
  })
  const addItem = () => setDraft((d) => ({ ...d, items: [...d.items, { id: tmpId('i'), name: '', start: '', end: '', status: 'plan' }] }))
  const delItem = (i) => setDraft((d) => ({ ...d, items: d.items.filter((_, x) => x !== i) }))

  async function doGeocode() {
    if (!draft.addr) { setGeo('warn'); return }
    setGeo('load')
    const r = await geocode(draft.addr)
    if (r) { setDraft((d) => ({ ...d, lat: r.lat.toFixed(6), lng: r.lng.toFixed(6) })); setGeo('ok') }
    else setGeo('warn')
  }

  const save = () => {
    const clean = {
      ...draft,
      name: draft.name.trim(),
      desc: draft.desc.trim(),
      addr: draft.addr.trim(),
      lat: draft.lat === '' ? null : Number(draft.lat),
      lng: draft.lng === '' ? null : Number(draft.lng),
      items: draft.items
        .filter((it) => it.name.trim())
        .map((it) => ({ id: it.id || tmpId('i'), name: it.name.trim(), start: it.start, end: it.end, status: it.status || 'plan' })),
    }
    onSave(clean)
    setMode('list')
  }

  const remove = (p) => {
    if (window.confirm(`‘${p.name}’ 협력사를 삭제할까요? 등록된 아이템도 함께 삭제됩니다.`)) onDelete(p.id)
  }

  /* ─── 목록 모드 ─── */
  if (mode === 'list') {
    return (
      <Modal
        icon="apartment" title="협력사 관리" subtitle={`${partners.length}곳 등록됨 · 카드를 눌러 수정하거나 새로 추가하세요`} wide
        onClose={onClose}
        footer={<div className="right"><button className="btn btn-lg" onClick={onClose}>닫기</button></div>}
      >
        <div className="sec-t">
          <span>등록된 협력사</span>
          <button className="btn btn-primary btn-sm" onClick={startAdd}><span className="material-symbols-outlined">add</span>협력사 추가</button>
        </div>
        <div className="plist">
          {partners.length === 0 && <div className="empty"><span className="material-symbols-outlined">domain_add</span>아직 협력사가 없습니다.</div>}
          {partners.map((p) => (
            <div className="pitem" key={p.id}>
              <div className="pg">
                <div className="pn">{p.name} <span className={'badge ' + CATEGORIES[p.cat]?.cls} style={{ marginLeft: 4 }}>{catLabel(p.cat)}</span></div>
                <div className="pd">{p.addr || '주소 미입력'} · 아이템 {(p.items || []).length}개</div>
              </div>
              <button className="linkbtn" onClick={() => startEdit(p)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>수정</button>
              <button className="linkbtn danger" onClick={() => remove(p)}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>삭제</button>
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  /* ─── 편집 모드 ─── */
  return (
    <Modal
      icon={draft.id ? 'edit' : 'domain_add'}
      title={draft.id ? '협력사 수정' : '협력사 추가'}
      subtitle="기본 정보와 진행 아이템(공정·일정)을 입력하세요." wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-lg" onClick={() => setMode('list')}><span className="material-symbols-outlined">arrow_back</span>목록</button>
          <div className="right">
            <button className="btn btn-primary btn-lg" onClick={save} disabled={!draft.name.trim()}>
              <span className="material-symbols-outlined">check</span>저장
            </button>
          </div>
        </>
      }
    >
      <div className="row2">
        <div className="field">
          <label>협력사명</label>
          <input className="in" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="예) 대한코팅" />
        </div>
        <div className="field">
          <label>분류</label>
          <select className="sel" value={draft.cat} onChange={(e) => set('cat', e.target.value)}>
            {CATEGORY_ORDER.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label>주소 <span className="hint">입력 후 ‘좌표 찾기’</span></label>
        <div className="geo-row">
          <input className="in" value={draft.addr} onChange={(e) => { set('addr', e.target.value); setGeo(null) }} placeholder="도로명 또는 지번 주소" />
          <button className="btn" onClick={doGeocode}><span className="material-symbols-outlined">my_location</span>좌표 찾기</button>
          {geo === 'load' && <span className="geo-state geo-load">찾는 중…</span>}
          {geo === 'ok' && <span className="geo-state geo-ok">좌표 확인됨</span>}
          {geo === 'warn' && <span className="geo-state geo-warn">못 찾음 · 직접 입력</span>}
        </div>
      </div>

      <div className="row2">
        <div className="field"><label>위도 (lat)</label><input className="in" value={draft.lat} onChange={(e) => set('lat', e.target.value)} placeholder="35.10" inputMode="decimal" /></div>
        <div className="field"><label>경도 (lng)</label><input className="in" value={draft.lng} onChange={(e) => set('lng', e.target.value)} placeholder="128.85" inputMode="decimal" /></div>
      </div>

      <div className="field">
        <label>한줄 소개</label>
        <input className="in" value={draft.desc} onChange={(e) => set('desc', e.target.value)} placeholder="예) 선체 외판 방식 도장 전문" />
      </div>

      <div className="divider" />

      <div className="sec-t"><span>진행 아이템 (공정 · 일정)</span></div>
      {draft.items.length > 0 && (
        <div className="itemhead">
          <div>아이템명</div><div>착수일</div><div>종료 예상일</div><div>상태</div><div></div>
        </div>
      )}
      {draft.items.map((it, i) => (
        <div className="itemrow" key={it.id || i}>
          <input className="in" value={it.name} onChange={(e) => setItem(i, 'name', e.target.value)} placeholder="예) 1번 도크 외판 도장" />
          <input className="in" type="date" value={it.start || ''} onChange={(e) => setItem(i, 'start', e.target.value)} />
          <input className="in" type="date" value={it.end || ''} onChange={(e) => setItem(i, 'end', e.target.value)} />
          <select className="sel" value={it.status || 'plan'} onChange={(e) => setItem(i, 'status', e.target.value)}>
            {STATUS_ORDER.map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
          </select>
          <button className="del" onClick={() => delItem(i)} title="삭제"><span className="material-symbols-outlined">delete</span></button>
        </div>
      ))}
      <button className="addrow" onClick={addItem}><span className="material-symbols-outlined">add</span>아이템 추가</button>
    </Modal>
  )
}
