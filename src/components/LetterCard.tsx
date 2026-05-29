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
  variant?: 'standard' | 'hero' | 'compact'
  arriving?: boolean
}

export default function LetterCard({ letter, now, onDelete, onSelect, variant = 'standard', arriving = false }: Props) {
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

  const isHero = variant === 'hero'
  const isCompact = variant === 'compact'

  return (
    <div
      role={unlocked ? 'button' : undefined}
      tabIndex={unlocked ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={unlocked ? `Read letter to ${letter.recipient}` : undefined}
      className={`rounded-2xl shadow-sm border transition-all duration-300 ${
        unlocked && !isCompact
          ? 'bg-surface border-border cursor-pointer hover:shadow-lg hover:-translate-y-0.5'
          : ''
      }${!unlocked || isCompact
          ? 'bg-surface-muted/80 border-border/60 saturate-[0.85] cursor-default'
          : ''
      } ${showReveal ? 'animate-reveal' : ''}${arriving ? ' animate-arrive' : ''} ${
        isHero ? 'p-8 flex flex-row items-start' : isCompact ? 'p-4 flex items-center' : 'h-[280px] p-6 flex flex-col'
      }`}
    >
      {isCompact ? (
        <button
          onClick={handleClick}
          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
        >
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${unlocked ? 'bg-primary-container' : 'bg-surface-muted'}`}>
            {unlocked ? (
              <MailOpen className="w-4 h-4 text-on-primary-container" strokeWidth={1.5} />
            ) : (
              <Mail className="w-4 h-4 text-on-surface-muted" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-sm text-on-surface truncate">{letter.recipient}</h3>
            <p className="text-xs text-on-surface-muted truncate">
              {unlocked ? `Unlocked ${formatUnlockDate(letter.unlockDate)}` : `Unlocks ${formatUnlockDate(letter.unlockDate)}`}
            </p>
          </div>
        </button>
      ) : (
        <>
          {/* Header */}
          <div className={`flex items-start justify-between flex-shrink-0 ${isHero ? 'flex-1 min-w-0 pr-6' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex-shrink-0 ${isHero ? 'w-12 h-12' : 'w-10 h-10'} rounded-full flex items-center justify-center ${
                unlocked ? 'bg-primary-container' : 'bg-surface-muted'
              }`}>
                {unlocked ? (
                  <MailOpen className={`${isHero ? 'w-6 h-6' : 'w-5 h-5'} text-on-primary-container ${showReveal ? 'animate-reveal' : ''}`} strokeWidth={1.5} />
                ) : (
                  <Mail className={`${isHero ? 'w-6 h-6' : 'w-5 h-5'} text-on-surface-muted`} strokeWidth={1.5} />
                )}
              </div>
              <h3 className={`font-serif text-on-surface truncate ${isHero ? 'text-xl' : 'text-lg'}`}>
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
          <div className={`${isHero ? 'flex-1 min-w-0' : 'flex-1 flex flex-col justify-center min-h-0 mt-4 mb-2'}`}>
            {unlocked ? (
              <div className={showReveal ? 'animate-reveal' : ''}>
                <p className={`font-serif text-on-surface leading-relaxed break-words ${isHero ? 'line-clamp-6 text-base' : 'line-clamp-3'}`}>
                  {letter.content}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-primary">
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-sm font-medium">Read</span>
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
        </>
      )}

      {/* Footer */}
      <div className={`flex-shrink-0 flex items-center gap-2 ${isCompact ? 'ml-3' : isHero ? 'pt-0 pl-6 border-l border-border' : 'pt-3 border-t border-border justify-between'}`}>
        {!isCompact && (
          <p className="text-xs text-on-surface-muted truncate flex-1 min-w-0">
            {unlocked ? `Unlocked ${formatUnlockDate(letter.unlockDate)}` : 'Sealed'}
          </p>
        )}
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
