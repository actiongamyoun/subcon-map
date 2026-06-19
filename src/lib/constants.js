// 업종/공정 분류 (라벨은 i18n에서, 여기선 색상 클래스 + 아이콘)
export const CATEGORIES = {
  pipe:    { label: '파이프',         cls: 'cat-pipe',    icon: 'plumbing' },
  block:   { label: '선박블록',       cls: 'cat-block',   icon: 'deployed_code' },
  accom:   { label: '거주구',         cls: 'cat-accom',   icon: 'apartment' },
  outfit:  { label: '철의장품',       cls: 'cat-outfit',  icon: 'handyman' },
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

// 주소에서 시/도 추출 (모두 보기 지역 필터용)
const REGION_RULES = [
  ['부산', ['부산']], ['울산', ['울산']],
  ['경남', ['경상남도', '경남']], ['경북', ['경상북도', '경북']],
  ['대구', ['대구']], ['서울', ['서울']], ['인천', ['인천']], ['경기', ['경기']],
  ['대전', ['대전']], ['세종', ['세종']], ['광주', ['광주']],
  ['전남', ['전라남도', '전남']], ['전북', ['전라북도', '전북']],
  ['충남', ['충청남도', '충남']], ['충북', ['충청북도', '충북']],
  ['강원', ['강원']], ['제주', ['제주']],
]
export const REGION_ALL = '전체'
export function regionOf(addr) {
  const s = String(addr || '')
  for (const [label, keys] of REGION_RULES) {
    if (keys.some((k) => s.includes(k))) return label
  }
  return '기타지역'
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
