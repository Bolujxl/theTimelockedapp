import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Letter } from '../types'

type Props = {
  onSubmit: (letter: Letter) => void
  onClose: () => void
}

function futureMin(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function LetterForm({ onSubmit, onClose }: Props) {
  const [recipient, setRecipient] = useState('')
  const [content, setContent] = useState('')
  const [unlockDate, setUnlockDate] = useState('')
  const [error, setError] = useState('')
  const recipientRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    recipientRef.current?.focus()
  }, [])

  const isValid =
    recipient.trim().length > 0 &&
    recipient.length <= 60 &&
    content.trim().length > 0 &&
    unlockDate.length > 0 &&
    new Date(unlockDate) > new Date()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValid) {
      setError('Please fill all fields with valid values.')
      return
    }

    const letter: Letter = {
      id: crypto.randomUUID(),
      recipient: recipient.trim(),
      content: content.trim(),
      unlockDate: new Date(unlockDate).toISOString(),
      createdAt: new Date().toISOString(),
    }

    onSubmit(letter)
    setRecipient('')
    setContent('')
    setUnlockDate('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-stone-800">Compose a letter</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Recipient
            </label>
            <input
              ref={recipientRef}
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              maxLength={60}
              placeholder="Future Me, Mom, Best Friend..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50
                         text-stone-800 placeholder:text-stone-400
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                         transition-shadow"
            />
            <p className="text-xs text-stone-400 mt-1 text-right">
              {recipient.length}/60
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Your letter
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Dear future me..."
              rows={6}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50
                         text-stone-800 placeholder:text-stone-400 font-serif
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                         transition-shadow resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Unlock date &amp; time
            </label>
            <input
              type="datetime-local"
              value={unlockDate}
              min={futureMin()}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50
                         text-stone-800
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                         transition-shadow"
            />
            <p className="text-xs text-stone-400 mt-1">
              Must be a future date and time.
            </p>
          </div>

          {error && (
            <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3 rounded-xl font-medium transition-all duration-200
                       bg-amber-700 text-stone-50 hover:bg-amber-800
                       disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed
                       shadow-sm"
          >
            Seal &amp; lock letter
          </button>
        </form>
      </div>
    </div>
  )
}
