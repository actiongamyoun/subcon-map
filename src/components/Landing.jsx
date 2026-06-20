import { useLang } from '../lib/lang.jsx'

export default function Landing({ onEnter }) {
  const { t } = useLang()
  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-mark"><span className="material-symbols-outlined">directions_boat</span></div>
        <h1>{t('app.title')}</h1>
        <p className="landing-sub">{t('landing.subtitle')}</p>
        <button className="landing-enter" onClick={onEnter}>
          {t('landing.enter')}<span className="material-symbols-outlined">arrow_forward</span>
        </button>
        <div className="landing-note">{t('landing.note')}</div>
      </div>
    </div>
  )
}
