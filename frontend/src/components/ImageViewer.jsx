import { useTranslation } from 'react-i18next'
import SecureImage from './SecureImage'

export default function ImageViewer({ url, onClose }) {
  const { t } = useTranslation()
  if (!url) return null
  return (
    <dialog className="modal modal-open" onClick={onClose}>
      <div className="modal-box max-w-3xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">{t('cleaning.view_photo')}</h3>
          <button className="btn btn-sm btn-ghost btn-circle" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <SecureImage src={url} alt={t('cleaning.view_photo')} className="w-full max-h-[70vh] object-contain rounded" />
      </div>
    </dialog>
  )
}