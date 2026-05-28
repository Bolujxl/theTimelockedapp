import { useState, useMemo } from 'react'
import { PenLine } from 'lucide-react'
import { useLetters } from './hooks/useLetters'
import { useCountdown } from './hooks/useCountdown'
import LetterCard from './components/LetterCard'
import LetterForm from './components/LetterForm'
import EmptyState from './components/EmptyState'
import { isUnlocked } from './lib/time'

export default function App() {
  const { letters, addLetter, removeLetter } = useLetters()
  const now = useCountdown()
  const [showForm, setShowForm] = useState(false)

  const sortedLetters = useMemo(() => {
    const unlocked = letters
      .filter((l) => isUnlocked(l.unlockDate, now))
      .sort(
        (a, b) =>
          new Date(b.unlockDate).getTime() - new Date(a.unlockDate).getTime(),
      )
    const locked = letters
      .filter((l) => !isUnlocked(l.unlockDate, now))
      .sort(
        (a, b) =>
          new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime(),
      )
    return [...unlocked, ...locked]
  }, [letters, now])

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-serif text-stone-800 tracking-tight">
              Time-Locked Letters
            </h1>
            <p className="text-stone-500 mt-1 text-sm">
              Write letters that only open when the time is right
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 text-stone-50
                       rounded-xl font-medium hover:bg-amber-800 transition-colors duration-200
                       shadow-sm"
          >
            <PenLine className="w-4 h-4" strokeWidth={2} />
            Compose
          </button>
        </header>

        {/* Content area */}
        {letters.length === 0 ? (
          <EmptyState onCompose={() => setShowForm(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedLetters.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                now={now}
                onDelete={removeLetter}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <LetterForm
          onSubmit={addLetter}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
