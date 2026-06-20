import { useTranslation } from 'react-i18next'

export default function ConfirmModal({ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant = 'error' }) {
  const { t } = useTranslation()
  if (!isOpen) return null
  return (
    <dialog className="modal modal-open" onClick={onCancel}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-2">{title || t('common.confirm_title')}</h3>
        <p className="opacity-80">{message}</p>
        <div className="modal-action">
          <button className="btn btn-soft" onClick={onCancel}>{cancelLabel || t('common.cancel')}</button>
          <button className={`btn btn-${variant}`} onClick={onConfirm}>{confirmLabel || t('common.confirm')}</button>
        </div>
      </div>
    </dialog>
  )
}
