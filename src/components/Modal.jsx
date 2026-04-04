import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" style={{ overflowY: 'auto' }}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Scroll container — lets modal scroll if content is tall */}
      <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="relative bg-card border border-border rounded-t-[16px] sm:rounded-[16px] w-full sm:max-w-md animate-slide-up"
          style={{ padding: '28px 32px 32px', maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header — sticky so title + close are always visible */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">{title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
