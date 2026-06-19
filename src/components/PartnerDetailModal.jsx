import Modal from './Modal.jsx'
import CatBadge from './CatBadge.jsx'
import { useLang } from '../lib/lang.jsx'

export default function PartnerDetailModal({ partner, distance, onClose }) {
  const { t, L } = useLang()
  if (!partner) return null
  const hasLinks = partner.homepage || partner.brochure

  return (
    <Modal
      icon="info"
      title={L(partner, 'name')}
      subtitle={t('detail.title')}
      onClose={onClose}
      footer={<div className="right"><button className="btn btn-lg" onClick={onClose}>{t('common.close')}</button></div>}
    >
      <div className="detail-head">
        <CatBadge cat={partner.cat} />
        {distance && (
          <span className="detail-dist">
            <span className="material-symbols-outlined">route</span>{t('detail.fromYard')} {distance.km} km
          </span>
        )}
      </div>

      {L(partner, 'addr') && (
        <div className="detail-line"><span className="material-symbols-outlined">location_on</span><span>{L(partner, 'addr')}</span></div>
      )}
      {L(partner, 'desc') && (
        <div className="detail-line"><span className="material-symbols-outlined">description</span><span>{L(partner, 'desc')}</span></div>
      )}

      <div className="divider" />

      <div className="detail-links">
        {partner.homepage && (
          <a className="detail-link" href={normUrl(partner.homepage)} target="_blank" rel="noreferrer">
            <span className="material-symbols-outlined dl-ic">language</span>
            <div className="dl-body">
              <div className="dl-t">{t('detail.homepage')}</div>
              <div className="dl-s">{t('detail.visitSite')}</div>
            </div>
            <span className="material-symbols-outlined dl-go">open_in_new</span>
          </a>
        )}
        {partner.brochure && (
          <a className="detail-link" href={partner.brochure} target="_blank" rel="noreferrer">
            <span className="material-symbols-outlined dl-ic pdf">picture_as_pdf</span>
            <div className="dl-body">
              <div className="dl-t">{t('detail.brochure')}</div>
              <div className="dl-s">{t('detail.viewBrochure')}</div>
            </div>
            <span className="material-symbols-outlined dl-go">open_in_new</span>
          </a>
        )}
        {!hasLinks && (
          <div className="detail-empty"><span className="material-symbols-outlined">link_off</span>{t('detail.noLinks')}</div>
        )}
      </div>
    </Modal>
  )
}

function normUrl(u) {
  const s = String(u || '').trim()
  if (!s) return s
  return /^https?:\/\//i.test(s) ? s : 'https://' + s
}
