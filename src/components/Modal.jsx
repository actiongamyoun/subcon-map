import { useEffect } from 'react'

export default function Modal({ icon, title, subtitle, wide, onClose, children, footer, embedded }) {
  useEffect(() => {
    if (embedded) return
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, embedded])

  const inner = (
    <div className={'modal' + (wide ? ' wide' : '') + (embedded ? ' embed' : '')}>
      <div className="mhead">
        <div>
          <h2>{icon && <span className="material-symbols-outlined">{icon}</span>}{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {!embedded && (
          <button className="x" onClick={onClose} aria-label="닫기">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>
      <div className="mbody">{children}</div>
      {footer && <div className="mfoot">{footer}</div>}
    </div>
  )

  if (embedded) return inner

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {inner}
    </div>
  )
}
