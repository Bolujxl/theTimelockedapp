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
  const [line1, setLine1] = useState(false)
  const [line2, setLine2] = useState(false)
  const [line3, setLine3] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const t1 = setTimeout(() => setLine1(true), 50)
    const t2 = setTimeout(() => setLine2(true), 250)
    const t3 = setTimeout(() => setLine3(true), 450)
    const t4 = setTimeout(() => setShowActions(true), 600)

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (reading) handleSkip()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKey)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
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
        <div className={`mb-8 transition-all duration-700 ${line1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary-container flex items-center justify-center animate-seal">
            <span className="text-on-primary-container text-2xl">✦</span>
          </div>
        </div>

        <h2 className={`text-2xl sm:text-3xl font-serif text-on-surface mb-3 transition-all duration-700 ${line2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          A letter has arrived.
        </h2>
        <p className={`text-sm text-on-surface-muted mb-2 transition-all duration-700 delay-100 ${line3 ? 'opacity-100' : 'opacity-0'}`}>
          For: {letter.recipient}
        </p>
        <p className={`text-xs text-on-surface-muted mb-10 transition-all duration-700 delay-100 ${line3 ? 'opacity-100' : 'opacity-0'}`}>
          Written {formatUnlockDate(letter.createdAt)}
        </p>

        <div className={`transition-all duration-500 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={handleOpen}
            className="px-8 py-3 rounded-2xl font-medium text-lg
                       bg-primary text-on-primary hover:brightness-90
                       shadow-lg shadow-overlay/10 transition-all duration-200 mb-4"
          >
            Read it
          </button>

          <br />
          <button
            onClick={handleSkip}
            className="text-sm text-on-surface-muted hover:text-on-surface transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-reveal">
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
          aria-label={confirmDelete ? 'Confirm delete' : 'Delete letter'}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          {confirmDelete ? 'Delete?' : 'Delete'}
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
