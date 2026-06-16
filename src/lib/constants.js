// 업종/공정 분류
export const CATEGORIES = {
  paint: { label: '도장/방식', cls: 'cat-paint' },
  surf:  { label: '표면처리', cls: 'cat-surf' },
  mech:  { label: '기계가공', cls: 'cat-mech' },
  elec:  { label: '전장/배선', cls: 'cat-elec' },
  weld:  { label: '용접/구조', cls: 'cat-weld' },
  etc:   { label: '기타', cls: 'cat-etc' },
}
export const CATEGORY_ORDER = ['paint', 'surf', 'mech', 'elec', 'weld', 'etc']

export function catLabel(key) {
  return (CATEGORIES[key] || CATEGORIES.etc).label
}
export function catClass(key) {
  return (CATEGORIES[key] || CATEGORIES.etc).cls
}

// 아이템 진행 상태
export const STATUS = {
  plan: { label: '예정', cls: 'st-plan' },
  prog: { label: '진행중', cls: 'st-prog' },
  done: { label: '완료', cls: 'st-done' },
}
export const STATUS_ORDER = ['plan', 'prog', 'done']

// 조선소 기본 위치 (부산 영도 인근) — 데이터 없을 때 지도 초기 중심
export const DEFAULT_YARD = {
  name: '현대중공업 (부산)',
  addr: '부산광역시 영도구 태종로',
  lat: 35.0918,
  lng: 129.0686,
}
