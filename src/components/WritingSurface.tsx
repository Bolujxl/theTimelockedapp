import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import type { Letter } from '../types'
import DateTimePicker from './DateTimePicker'

const STRIP_CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g
const DRAFT_KEY = 'time-locked-letters:draft'

type Props = {
  onSubmit: (letter: Letter) => void
  onClose: () => void
}

function loadDraft(): { recipient: string; content: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveDraft(recipient: string, content: string) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ recipient, content }))
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {}
}

export default function WritingSurface({ onSubmit, onClose }: Props) {
  const [recipient, setRecipient] = useState(() => loadDraft()?.recipient ?? '')
  const [content, setContent] = useState(() => loadDraft()?.content ?? '')
  const [unlockDate, setUnlockDate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    bodyRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      if (draftTimer.current) clearTimeout(draftTimer.current)
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => {
      if (recipient || content) {
        saveDraft(recipient, content)
      }
    }, 500)
  }, [recipient, content])

  const hasContent = recipient.trim().length > 0 || content.trim().length > 0

  const triggerClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose(), 200)
  }, [onClose])

  function handleClose() {
    if (hasContent) {
      const ok = window.confirm('Discard this letter?')
      if (!ok) return
      clearDraft()
    }
    triggerClose()
  }

  const isValid =
    recipient.trim().length > 0 &&
    recipient.length <= 60 &&
    content.trim().length > 0 &&
    unlockDate !== null &&
    unlockDate > new Date()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValid) {
      setError('Please fill all fields with valid values.')
      return
    }

    const letter: Letter = {
      id: crypto.randomUUID(),
      recipient: recipient.trim().replace(STRIP_CONTROL, ''),
      content: content.trim().replace(STRIP_CONTROL, ''),
      unlockDate: unlockDate.toISOString(),
      createdAt: new Date().toISOString(),
      revealedAt: null,
    }

    clearDraft()
    onSubmit(letter)
    setRecipient('')
    setContent('')
    setUnlockDate(null)
    onClose()
  }

  return (
    <div className={`fixed inset-0 z-50 bg-background flex flex-col transition-all duration-200 ${closing ? 'opacity-0 translate-y-5' : 'opacity-100'}`}>
      {/* Close button */}
      <div className="flex justify-end px-4 pt-4 sm:px-6 sm:pt-6">
        <button
          onClick={handleClose}
          className="p-3 rounded-full hover:bg-surface-muted transition-colors"
          aria-label="Close writing surface"
        >
          <X className="w-5 h-5 text-on-surface-muted" />
        </button>
      </div>

      {/* Writing area */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6 sm:px-12 pb-24"
      >
        {/* Recipient */}
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          maxLength={60}
          placeholder="To..."
          className="w-full bg-transparent border-0 border-b border-border
                     text-2xl sm:text-3xl font-serif text-on-surface
                     placeholder:text-on-surface-muted pb-2 pt-1 mb-1
                     focus:outline-none focus:border-primary transition-colors"
        />
        <p className="text-xs text-on-surface-muted text-right mb-8">
          {recipient.length}/60
        </p>

        {/* Body */}
        <textarea
          ref={bodyRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dear future me..."
          maxLength={10000}
          rows={1}
          className="flex-1 w-full bg-transparent border-0 resize-none
                     text-2xl leading-relaxed font-serif text-on-surface
                     placeholder:text-on-surface-muted
                     focus:outline-none"
        />

        {/* Date picker */}
        <div className="flex items-center gap-2 mt-6 mb-1 text-sm">
          <span className="text-on-surface-muted">Unlocks:</span>
          <DateTimePicker
            value={unlockDate}
            onChange={setUnlockDate}
            minDate={new Date()}
          />
        </div>

        {unlockDate !== null && unlockDate <= new Date() && (
          <p className="text-xs text-danger mt-1">Must be a future date and time.</p>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger mt-3">
            {error}
          </p>
        )}
      </form>

      {/* Seal button — floating at bottom */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center z-40 pointer-events-none pb-6">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="pointer-events-auto px-8 py-3 rounded-2xl font-medium text-lg
                     bg-primary text-on-primary hover:brightness-90
                     disabled:bg-surface-muted disabled:text-on-surface-muted disabled:cursor-not-allowed
                     shadow-lg shadow-overlay/10 transition-all duration-200"
        >
          Seal &amp; lock letter
        </button>
      </div>
    </div>
  )
}
