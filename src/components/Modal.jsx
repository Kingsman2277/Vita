import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
