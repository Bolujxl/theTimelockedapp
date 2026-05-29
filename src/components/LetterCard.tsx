import { useState, useRef, useEffect } from 'react'
import { Lock, Mail, MailOpen, Trash2, Eye } from 'lucide-react'
import type { Letter } from '../types'
import { isUnlocked, formatUnlockDate } from '../lib/time'
import Countdown from './Countdown'

type Props = {
  letter: Letter
  now: Date
  onDelete: (id: string) => void
  onSelect: (letter: Letter) => void
}

export default function LetterCard({ letter, now, onDelete, onSelect }: Props) {
  const unlocked = isUnlocked(letter.unlockDate, now)
  const prevUnlocked = useRef(unlocked)
  const [showReveal, setShowReveal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!prevUnlocked.current && unlocked) {
      setShowReveal(true)
      const timer = setTimeout(() => setShowReveal(false), 700)
      return () => clearTimeout(timer)
    }
    prevUnlocked.current = unlocked
  }, [unlocked])

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(letter.id)
    } else {
      setConfirmDelete(true)
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!unlocked) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(letter)
    }
  }

  function handleClick() {
    if (!unlocked) return
    onSelect(letter)
  }

  return (
    <div
      role={unlocked ? 'button' : undefined}
      tabIndex={unlocked ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={unlocked ? `Read letter to ${letter.recipient}` : undefined}
      className={`h-[280px] rounded-2xl p-6 shadow-sm border flex flex-col transition-all duration-300 ${
        unlocked
          ? 'bg-surface border-border cursor-pointer hover:shadow-lg hover:-translate-y-0.5'
          : 'bg-surface-muted/80 border-border/60 saturate-[0.85] cursor-default'
      } ${showReveal ? 'animate-reveal' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              unlocked ? 'bg-primary-container' : 'bg-surface-muted'
            }`}
          >
            {unlocked ? (
              <MailOpen
                className={`w-5 h-5 text-on-primary-container ${showReveal ? 'animate-reveal' : ''}`}
                strokeWidth={1.5}
              />
            ) : (
              <Mail className="w-5 h-5 text-on-surface-muted" strokeWidth={1.5} />
            )}
          </div>
          <h3 className="font-serif text-lg text-on-surface truncate">
            {letter.recipient}
          </h3>
        </div>

        {!unlocked && (
          <div className="flex-shrink-0 ml-2">
            <Lock className="w-5 h-5 text-on-surface-muted animate-seal" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Middle slot */}
      <div className="flex-1 flex flex-col justify-center min-h-0 mt-4 mb-2">
        {unlocked ? (
          <div className={showReveal ? 'animate-reveal' : ''}>
            <p className="font-serif text-on-surface leading-relaxed line-clamp-3 break-words">
              {letter.content}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-primary">
              <Eye className="w-4 h-4" strokeWidth={1.5} />
              <span className="text-sm font-medium">View</span>
            </div>
          </div>
        ) : (
          <>
            <Countdown unlockDate={letter.unlockDate} now={now} />
            <p className="text-xs text-on-surface-muted mt-2">
              Unlocks on {formatUnlockDate(letter.unlockDate)}
            </p>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 pt-3 border-t border-border flex items-center justify-between gap-2">
        <p className="text-xs text-on-surface-muted truncate flex-1 min-w-0">
          {unlocked
            ? `Unlocked ${formatUnlockDate(letter.unlockDate)}`
            : 'Sealed'}
        </p>
        <button
          onClick={handleDeleteClick}
          aria-label={confirmDelete ? 'Confirm delete' : 'Delete letter'}
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px]
                     whitespace-nowrap transition-all duration-200 ${
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
  )
}
