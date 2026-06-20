import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

function ConfirmDialog({ isOpen, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, variant }) {
  const { t } = useTranslation()
  if (!isOpen) return null
  return (
    <dialog className="modal modal-open" onClick={onCancel}>
      <div className="modal-box max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-2">{title || t('common.confirm_title')}</h3>
        <p className="opacity-80">{message || t('common.confirm_delete')}</p>
        <div className="modal-action">
          <button className="btn btn-soft" onClick={onCancel}>{cancelLabel || t('common.cancel')}</button>
          <button className={`btn btn-${variant || 'error'}`} onClick={onConfirm}>{confirmLabel || t('common.confirm')}</button>
        </div>
      </div>
    </dialog>
  )
}

export function ToastProvider({ children }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', title: '', confirmLabel: '', cancelLabel: '', variant: 'error', resolve: null })

  const addToast = useCallback((message, type = 'error', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message: message || t('common.confirm_delete'),
        title: options.title || t('common.confirm_title'),
        confirmLabel: options.confirmLabel || t('common.confirm'),
        cancelLabel: options.cancelLabel || t('common.cancel'),
        variant: options.variant || 'error',
        resolve,
      })
    })
  }, [t])

  const handleConfirm = useCallback(() => {
    confirmState.resolve(true)
    setConfirmState({ isOpen: false, resolve: null })
  }, [confirmState])

  const handleCancel = useCallback(() => {
    confirmState.resolve(false)
    setConfirmState({ isOpen: false, resolve: null })
  }, [confirmState])

  return (
    <ToastContext.Provider value={{ addToast, confirm }}>
      {children}
      <div className="toast toast-end toast-bottom z-[100]">
        {toasts.map((t) => (
          <div key={t.id} className={`alert ${t.type === 'error' ? 'alert-error' : t.type === 'success' ? 'alert-success' : 'alert-info'} shadow-lg`}>
            <span>{t.message}</span>
            <button className="btn btn-xs btn-ghost" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>✕</button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ToastContext.Provider>
  )
}
