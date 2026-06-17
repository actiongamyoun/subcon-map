import { createContext, useContext, useEffect, useState } from 'react'
import { STRINGS, CAT_I18N, STATUS_I18N } from './i18n.js'

const LangCtx = createContext(null)

function getInitialLang() {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'ko' || saved === 'en') return saved
  } catch {
    /* localStorage 미사용 환경 */
  }
  return 'ko'
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang)

  useEffect(() => {
    try { localStorage.setItem('lang', lang) } catch { /* noop */ }
    document.documentElement.lang = lang
  }, [lang])

  // 고정 UI 문자열 (치환: {n}, {name} 등)
  const t = (key, vars) => {
    let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.ko[key] ?? key
    if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k])
    return s
  }

  // 데이터 필드 현지화 (영어 모드: field_en 우선, 없으면 한글 폴백)
  const L = (obj, field) => {
    if (!obj) return ''
    if (lang === 'en') return obj[field + '_en'] || obj[field] || ''
    return obj[field] || ''
  }

  const tc = (catKey) => (CAT_I18N[catKey] || CAT_I18N.etc)[lang]
  const ts = (statusKey) => (STATUS_I18N[statusKey] || STATUS_I18N.plan)[lang]

  const toggle = () => setLang((v) => (v === 'ko' ? 'en' : 'ko'))

  return (
    <LangCtx.Provider value={{ lang, setLang, toggle, t, L, tc, ts }}>
      {children}
    </LangCtx.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangCtx)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}
