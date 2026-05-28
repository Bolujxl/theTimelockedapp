import { useState, useRef, useEffect } from 'react'
import { Lock, Mail, MailOpen, Trash2 } from 'lucide-react'
import type { Letter } from '../types'
import { isUnlocked, formatUnlockDate } from '../lib/time'
import Countdown from './Countdown'

type Props = {
  letter: Letter
  now: Date
  onDelete: (id: string) => void
}

export default function LetterCard({ letter, now, onDelete }: Props) {
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

  function handleDeleteClick() {
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

  return (
    <div
      className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 ${
        unlocked
          ? 'bg-white border-stone-100'
          : 'bg-stone-50/80 border-stone-200/60 saturate-[0.85]'
      } ${showReveal ? 'animate-reveal' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              unlocked ? 'bg-amber-100' : 'bg-stone-200'
            }`}
          >
            {unlocked ? (
              <MailOpen
                className={`w-5 h-5 ${showReveal ? 'animate-reveal' : ''} ${
                  unlocked ? 'text-amber-700' : ''
                }`}
                strokeWidth={1.5}
              />
            ) : (
              <Mail className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
            )}
          </div>
          <h3 className="font-serif text-lg text-stone-800 truncate">
            {letter.recipient}
          </h3>
        </div>

        {/* Lock icon for locked cards */}
        {!unlocked && (
          <div className="flex-shrink-0 ml-2">
            <Lock className="w-5 h-5 text-stone-400 animate-seal" strokeWidth={1.5} />
          </div>
        )}
      </div>

      {/* Unlocked content */}
      {unlocked ? (
        <div className={showReveal ? 'animate-reveal' : ''}>
          <div className="w-full min-h-[80px] px-4 py-3 rounded-xl bg-stone-50 border border-stone-100 mb-4">
            <p className="font-serif text-stone-700 leading-relaxed whitespace-pre-wrap break-words">
              {letter.content}
            </p>
          </div>
          <p className="text-xs text-stone-400">
            Unlocked {formatUnlockDate(letter.unlockDate)}
          </p>
        </div>
      ) : (
        /* Locked card — content NOT in DOM */
        <>
          <div className="mb-4">
            <Countdown unlockDate={letter.unlockDate} now={now} />
          </div>
          <p className="text-xs text-stone-400 mb-1">
            Unlocks on {formatUnlockDate(letter.unlockDate)}
          </p>
          <p className="text-xs text-stone-300 italic">
            This letter is sealed until the unlock date.
          </p>
        </>
      )}

      {/* Delete button */}
      <div className="mt-4 pt-4 border-t border-stone-100 flex justify-end">
        <button
          onClick={handleDeleteClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                     transition-all duration-200 ${
                       confirmDelete
                         ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                         : 'text-stone-400 hover:text-rose-500 hover:bg-rose-50'
                     }`}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
