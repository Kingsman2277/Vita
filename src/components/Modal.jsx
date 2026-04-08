import { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, children }) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'
    previouslyFocused.current = document.activeElement

    // Focus the first focusable element inside the panel
    const focusFirst = () => {
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(FOCUSABLE)
      const target = focusables[0] || panel
      target.focus({ preventScroll: true })
    }
    // Defer to next tick so the portal is mounted
    const t = setTimeout(focusFirst, 0)

    // Trap focus + escape to close
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        el => !el.hasAttribute('disabled') && el.offsetParent !== null
      )
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      // Restore focus to the element that opened the modal
      const prev = previouslyFocused.current
      if (prev && typeof prev.focus === 'function') {
        prev.focus({ preventScroll: true })
      }
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id={titleId} className="section-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
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
