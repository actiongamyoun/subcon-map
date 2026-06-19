// 프론트엔드는 same-origin /api/* 만 호출합니다 (CORS 없음).
// /api/data        → 구글시트(GAS) 프록시
// /api/directions  → 카카오 모빌리티 길찾기 프록시
import { cloneSample } from './sampleData.js'
import { haversine, synthPath } from './geo.js'

let DEMO = false // GAS 미연결 시 true. 이때 저장은 메모리(세션)에만 반영.
export const isDemo = () => DEMO

// ── 데이터 로드 ──────────────────────────────────────────────
export async function loadData() {
  try {
    const r = await fetch('/api/data', { method: 'GET' })
    if (!r.ok) throw new Error('status ' + r.status)
    const data = await r.json()
    if (data && data.ok && data.partners) {
      DEMO = false
      return normalize(data)
    }
    throw new Error('bad payload')
  } catch (e) {
    // /api 없음(로컬 vite dev) 또는 GAS 미설정 → 데모 데이터
    DEMO = true
    return cloneSample()
  }
}

function normalize(d) {
  return {
    yard: d.yard || {},
    partners: (d.partners || []).map((p) => ({ ...p, items: p.items || [] })),
    projects: (d.projects || []).map((p) => ({ ...p, partnerIds: p.partnerIds || [] })),
  }
}

// ── 저장 계열 (action 기반) ──────────────────────────────────
async function post(action, payload) {
  if (DEMO) return { ok: true, demo: true } // 데모: 호출 생략 (App이 메모리 상태로 반영)
  try {
    const r = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    })
    return await r.json()
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export const saveYard = (yard) => post('saveYard', yard)
export const savePartner = (partner) => post('savePartner', partner)
export const deletePartner = (id) => post('deletePartner', { id })
export const saveProject = (project) => post('saveProject', project)
export const deleteProject = (id) => post('deleteProject', { id })

// ── 회사소개서 PDF 업로드 (GAS → 구글드라이브) ────────────────
// 프록시 본문 한도(~4.5MB) 고려 → PDF 3MB 이하만 허용
export const MAX_BROCHURE_BYTES = 3 * 1024 * 1024
export async function uploadBrochure(file) {
  if (DEMO) return { ok: false, error: 'demo' }
  if (!file) return { ok: false, error: 'no file' }
  if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || '')) {
    return { ok: false, error: 'not_pdf' }
  }
  if (file.size > MAX_BROCHURE_BYTES) return { ok: false, error: 'too_big' }
  const data = await fileToBase64(file)
  return post('uploadBrochure', { name: file.name, mime: file.type || 'application/pdf', data })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '') // "data:...;base64," 접두 제거
    r.onerror = () => reject(new Error('read failed'))
    r.readAsDataURL(file)
  })
}

// ── 길찾기 ───────────────────────────────────────────────────
// 반환: { path:[[lat,lng]...], distance(m), duration(s), real:boolean }
export async function getDirections(origin, dest) {
  try {
    const q = `origin=${origin.lng},${origin.lat}&destination=${dest.lng},${dest.lat}`
    const r = await fetch('/api/directions?' + q)
    if (!r.ok) throw new Error('status ' + r.status)
    const data = await r.json()
    if (data && data.path && data.path.length > 1) {
      return { path: data.path, distance: data.distance, duration: data.duration, real: true }
    }
    throw new Error(data && data.error ? data.error : 'no route')
  } catch (e) {
    // 폴백: 직선거리 + 곡선 합성 경로 (도로 아님)
    const distance = haversine(origin.lat, origin.lng, dest.lat, dest.lng)
    return {
      path: synthPath(origin, dest),
      distance,
      duration: (distance / 1000 / 38) * 3600, // 평균 38km/h 가정
      real: false,
    }
  }
}
