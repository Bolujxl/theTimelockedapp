import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Letter } from '../types'
import DateTimePicker from './DateTimePicker'

const STRIP_CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g

type Props = {
  onSubmit: (letter: Letter) => void
  onClose: () => void
}

export default function LetterForm({ onSubmit, onClose }: Props) {
  const [recipient, setRecipient] = useState('')
  const [content, setContent] = useState('')
  const [unlockDate, setUnlockDate] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const recipientRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    recipientRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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

    onSubmit(letter)
    setRecipient('')
    setContent('')
    setUnlockDate(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-on-surface">Compose a letter</h2>
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Recipient
            </label>
            <input
              ref={recipientRef}
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              maxLength={60}
              placeholder="Future Me, Mom, Best Friend..."
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-muted
                         text-on-surface placeholder:text-on-surface-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                         transition-shadow"
            />
            <p className="text-xs text-on-surface-muted mt-1 text-right">
              {recipient.length}/60
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Your letter
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dear future me..."
              maxLength={10000}
              rows={6}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface-muted
                         text-on-surface placeholder:text-on-surface-muted font-serif
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                         transition-shadow resize-none"
            />
            <p className="text-xs text-on-surface-muted mt-1 text-right">
              {content.length}/10000
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Unlock date &amp; time
            </label>
            <DateTimePicker
              value={unlockDate}
              onChange={setUnlockDate}
              minDate={new Date()}
              error={unlockDate !== null && unlockDate <= new Date() ? 'Must be a future date and time.' : undefined}
            />
            <p className="text-xs text-on-surface-muted mt-1">
              Must be a future date and time.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger bg-danger-container rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3 rounded-xl font-medium transition-all duration-200
                       bg-primary text-on-primary hover:brightness-90
                       disabled:bg-surface-muted disabled:text-on-surface-muted disabled:cursor-not-allowed
                       shadow-sm"
          >
            Seal &amp; lock letter
          </button>
        </form>
      </div>
    </div>
  )
}
