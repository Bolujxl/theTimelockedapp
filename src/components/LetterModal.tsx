import { useEffect, useRef, useState } from 'react'
import { X, Trash2, MailOpen } from 'lucide-react'
import type { Letter } from '../types'
import { formatUnlockDate } from '../lib/time'

type Props = {
  letter: Letter
  onClose: () => void
  onDelete: (id: string) => void
}

export default function LetterModal({ letter, onClose, onDelete }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null

    document.body.style.overflow = 'hidden'

    closeRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus.current?.focus()
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [onClose])

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(letter.id)
      onClose()
    } else {
      setConfirmDelete(true)
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop bg-overlay/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-recipient-${letter.id}`}
        className="animate-modal-panel bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              <MailOpen className="w-5 h-5 text-on-primary-container" strokeWidth={1.5} />
            </div>
            <h2
              id={`modal-recipient-${letter.id}`}
              className="font-serif text-xl text-on-surface truncate"
            >
              {letter.recipient}
            </h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close letter"
            className="p-3 -mr-2 rounded-full hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="w-full px-5 py-4 rounded-xl bg-surface-muted border border-border">
            <p className="font-serif text-on-surface leading-relaxed whitespace-pre-wrap break-words">
              {letter.content}
            </p>
          </div>
          <p className="text-xs text-on-surface-muted mt-3">
            Unlocked {formatUnlockDate(letter.unlockDate)}
          </p>
        </div>

        {/* Footer with delete */}
        <div className="px-6 pb-5 pt-3 border-t border-border flex justify-end">
          <button
            onClick={handleDeleteClick}
            aria-label={confirmDelete ? 'Confirm delete' : 'Delete letter'}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px]
                       transition-all duration-200 ${
                         confirmDelete
                           ? 'bg-danger-container text-on-danger-container hover:brightness-95'
                           : 'text-on-surface-muted hover:text-danger hover:bg-danger-container/50'
                       }`}
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            {confirmDelete ? 'Delete?' : 'Delete'}
          </button>
          <span aria-live="polite" className="sr-only">
            {confirmDelete ? 'Click again to confirm deletion' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
