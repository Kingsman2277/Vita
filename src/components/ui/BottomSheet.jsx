import { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import IconButton from './IconButton'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Mobile bottom sheet, centred dialog from 640px up. The focus trap, scroll
// lock and focus restore are carried over verbatim from ../Modal.jsx — that
// behaviour was already correct and shouldn't be re-derived.
export default function BottomSheet({ open, onClose, title, children }) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  // Keep latest onClose in a ref so the effect below doesn't re-run
  // every time the parent re-renders (which would steal focus from inputs)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'
    previouslyFocused.current = document.activeElement

    const focusFirst = () => {
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll(FOCUSABLE)
      const target = focusables[0] || panel
      target.focus({ preventScroll: true })
    }
    const t = setTimeout(focusFirst, 0)

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
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
      const prev = previouslyFocused.current
      if (prev && typeof prev.focus === 'function') {
        prev.focus({ preventScroll: true })
      }
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center bg-black/55 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-[480px] bg-sheet rounded-t-sheet sm:rounded-sheet px-4 pt-3 max-h-[80dvh] overflow-y-auto motion-safe:animate-[ui-sheet-up_220ms_ease-out]"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {/* Grab handle — decorative on desktop but harmless */}
        <div className="w-10 h-[5px] rounded-full bg-[#3A3A3F] mx-auto mb-3 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-[17px] font-semibold text-fg">{title}</h2>
          <IconButton
            size={36}
            label="Close"
            onClick={onClose}
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          />
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
