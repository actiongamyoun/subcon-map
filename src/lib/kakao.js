// 카카오맵 JavaScript SDK 동적 로더 (JS 키는 클라이언트 노출 가능, 도메인 제한으로 보호)
// + 주소→좌표 지오코딩 헬퍼

const JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY
let loadPromise = null

export function loadKakao() {
  if (loadPromise) return loadPromise
  loadPromise = new Promise((resolve, reject) => {
    if (!JS_KEY) {
      reject(new Error('VITE_KAKAO_JS_KEY 미설정'))
      return
    }
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => resolve(window.kakao))
      return
    }
    const s = document.createElement('script')
    s.async = true
    s.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false&libraries=services`
    s.onload = () => window.kakao.maps.load(() => resolve(window.kakao))
    s.onerror = () => reject(new Error('카카오 SDK 로드 실패'))
    document.head.appendChild(s)
  })
  return loadPromise
}

// 주소 문자열 → { lat, lng } (실패 시 null). 도로명/지번 우선, 실패하면 키워드 검색.
export async function geocode(address) {
  if (!address) return null
  let kakao
  try {
    kakao = await loadKakao()
  } catch {
    return null
  }
  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder()
    geocoder.addressSearch(address, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) })
        return
      }
      // 주소 검색 실패 → 키워드(장소) 검색 폴백
      const places = new kakao.maps.services.Places()
      places.keywordSearch(address, (res, st) => {
        if (st === kakao.maps.services.Status.OK && res[0]) {
          resolve({ lat: parseFloat(res[0].y), lng: parseFloat(res[0].x) })
        } else {
          resolve(null)
        }
      })
    })
  })
}

export const hasKakaoKey = () => !!JS_KEY
