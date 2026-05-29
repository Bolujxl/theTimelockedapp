import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import type { Letter } from '../types'
import { formatUnlockDate } from '../lib/time'

type Props = {
  letter: Letter
  onReveal: (id: string) => void
  onSkip: (id: string) => void
  onDelete: (id: string) => void
}

export default function UnlockCeremony({ letter, onReveal, onSkip, onDelete }: Props) {
  const [reading, setReading] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (reading) {
          handleSkip()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKey)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  })

  useEffect(() => {
    if (reading) {
      const timer = setTimeout(() => setFadeIn(true), 200)
      return () => clearTimeout(timer)
    }
  }, [reading])

  function handleOpen() {
    setReading(true)
  }

  function handleSkip() {
    onSkip(letter.id)
  }

  function handleReveal() {
    onReveal(letter.id)
  }

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(letter.id)
    } else {
      setConfirmDelete(true)
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  if (!reading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary-container flex items-center justify-center animate-seal">
            <span className="text-on-primary-container text-2xl">✦</span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-serif text-on-surface mb-3">
          A letter has arrived.
        </h2>
        <p className="text-sm text-on-surface-muted mb-2">
          For: {letter.recipient}
        </p>
        <p className="text-xs text-on-surface-muted mb-10">
          Written {formatUnlockDate(letter.createdAt)}
        </p>

        <button
          onClick={handleOpen}
          className="px-8 py-3 rounded-2xl font-medium text-lg
                     bg-primary text-on-primary hover:brightness-90
                     shadow-lg shadow-overlay/10 transition-all duration-200 mb-4"
        >
          Read it
        </button>

        <button
          onClick={handleSkip}
          className="text-sm text-on-surface-muted hover:text-on-surface transition-colors"
        >
          Not now
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
        <h2 className="font-serif text-xl text-on-surface truncate">
          {letter.recipient}
        </h2>
        <button
          onClick={handleSkip}
          className="text-sm text-on-surface-muted hover:text-on-surface transition-colors px-2 py-1"
        >
          Close
        </button>
      </div>

      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto px-6 sm:px-12 pb-6 transition-opacity duration-1000"
        style={{ opacity: fadeIn ? 1 : 0 }}
      >
        <div className="max-w-3xl mx-auto pt-12">
          <p className="font-serif text-xl leading-relaxed text-on-surface whitespace-pre-wrap break-words">
            {letter.content}
          </p>
          <p className="text-xs text-on-surface-muted mt-8">
            Unlocked {formatUnlockDate(letter.unlockDate)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-6 sm:px-6 flex-shrink-0">
        <button
          onClick={handleDeleteClick}
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px]
                     transition-all duration-200 ${
                       confirmDelete
                         ? 'bg-danger-container text-on-danger-container hover:brightness-95'
                         : 'text-on-surface-muted hover:text-danger hover:bg-danger-container/50'
                     }`}
          aria-label={confirmDelete ? 'Confirm delete this letter' : 'Delete this letter'}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>

        <button
          onClick={handleReveal}
          className="px-6 py-2.5 rounded-2xl font-medium
                     bg-primary text-on-primary hover:brightness-90
                     shadow-sm transition-all duration-200"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
