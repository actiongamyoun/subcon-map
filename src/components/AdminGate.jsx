import { useState } from 'react'
import Modal from './Modal.jsx'
import { useLang } from '../lib/lang.jsx'

const ADMIN_PW = 'admin1234' // 임시 소프트 게이트

export default function AdminGate({ onClose, onPass }) {
  const { t } = useLang()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  const submit = () => {
    if (pw === ADMIN_PW) onPass()
    else setErr(true)
  }

  return (
    <Modal
      icon="lock"
      title={t('gate.title')}
      subtitle={t('gate.subtitle')}
      onClose={onClose}
      footer={
        <div className="right">
          <button className="btn btn-ghost btn-lg" onClick={onClose}>{t('common.close')}</button>
          <button className="btn btn-primary btn-lg" onClick={submit}>{t('gate.enter')}</button>
        </div>
      }
    >
      <div className="field">
        <label>{t('gate.password')}</label>
        <input
          className="in"
          type="password"
          value={pw}
          autoFocus
          placeholder="••••••••"
          onChange={(e) => { setPw(e.target.value); setErr(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
        {err && (
          <div className="gate-err">
            <span className="material-symbols-outlined">error</span>{t('gate.wrong')}
          </div>
        )}
      </div>
    </Modal>
  )
}
