// 업종/공정 분류 (라벨은 i18n에서, 여기선 색상 클래스 + 아이콘)
export const CATEGORIES = {
  pipe:    { label: '파이프',         cls: 'cat-pipe',    icon: 'plumbing' },
  block:   { label: '선박블록',       cls: 'cat-block',   icon: 'deployed_code' },
  accom:   { label: '거주구',         cls: 'cat-accom',   icon: 'apartment' },
  outfit:  { label: '철의장품',       cls: 'cat-outfit',  icon: 'construction' },
  hatch:   { label: 'Hatch Cover',    cls: 'cat-hatch',   icon: 'garage' },
  lashing: { label: 'Lashing Bridge', cls: 'cat-lashing', icon: 'link' },
  etc:     { label: '기타',           cls: 'cat-etc',     icon: 'category' },
}
export const CATEGORY_ORDER = ['pipe', 'block', 'accom', 'outfit', 'hatch', 'lashing', 'etc']

export function catClass(key) {
  return (CATEGORIES[key] || CATEGORIES.etc).cls
}
export function catIcon(key) {
  return (CATEGORIES[key] || CATEGORIES.etc).icon
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
  name_en: 'Hyundai Heavy Industries (Busan)',
  addr: '부산광역시 영도구 태종로',
  addr_en: 'Taejong-ro, Yeongdo-gu, Busan',
  lat: 35.0918,
  lng: 129.0686,
}
