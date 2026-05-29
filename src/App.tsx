import { useState, useMemo, useEffect, useRef } from 'react'
import { PenLine, AlertTriangle, X, HardDrive } from 'lucide-react'
import { useLetters } from './hooks/useLetters'
import { useCountdown } from './hooks/useCountdown'
import LetterCard from './components/LetterCard'
import WritingSurface from './components/WritingSurface'
import LetterModal from './components/LetterModal'
import UnlockCeremony from './components/UnlockCeremony'
import EmptyState from './components/EmptyState'
import { isUnlocked } from './lib/time'
import type { Letter } from './types'

export default function App() {
  const { letters, addLetter, removeLetter, saveError, dismissSaveError, storageUnavailable, revealLetter } =
    useLetters()
  const now = useCountdown()
  const [showForm, setShowForm] = useState(false)
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null)
  const [ceremonyLetter, setCeremonyLetter] = useState<Letter | null>(null)
  const [gridVisible, setGridVisible] = useState(!ceremonyLetter)
  const [notification, setNotification] = useState<Letter | null>(null)
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevUnlockedIds = useRef<Set<string>>(new Set())
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(new Set())

  const { locked, unlocked, unreadUnlocked } = useMemo(() => {
    const lockedList = letters
      .filter((l) => !isUnlocked(l.unlockDate, now))
      .sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime())

    const unlockedList = letters
      .filter((l) => isUnlocked(l.unlockDate, now))
      .sort((a, b) => new Date(b.unlockDate).getTime() - new Date(a.unlockDate).getTime())

    const unread = unlockedList.filter((l) => l.revealedAt === null)

    return { locked: lockedList, unlocked: unlockedList, unreadUnlocked: unread }
  }, [letters, now])

  const ceremony = ceremonyLetter ?? (unreadUnlocked.length > 0 ? unreadUnlocked[0] : null)

  useEffect(() => {
    prevUnlockedIds.current = new Set(unlocked.map((l) => l.id))
  }, [])

  useEffect(() => {
    setGridVisible(!ceremony)
  }, [ceremony])

  useEffect(() => {
    if (ceremony) return
    const currentIds = new Set(unlocked.map((l) => l.id))
    const newlyUnlocked = unlocked.filter((l) => !prevUnlockedIds.current.has(l.id))
    prevUnlockedIds.current = currentIds

    if (newlyUnlocked.length > 0 && unreadUnlocked.length === 0) {
      const latest = newlyUnlocked[0]
      setNotification(latest)
      setArrivingIds(new Set(newlyUnlocked.map((l) => l.id)))
      const idsToArrive = newlyUnlocked.map((l) => l.id)
      setTimeout(() => {
        setArrivingIds((prev) => {
          const next = new Set(prev)
          for (const id of idsToArrive) next.delete(id)
          return next
        })
      }, 700)
      notificationTimer.current = setTimeout(() => setNotification(null), 4000)
    }

    return () => {
      if (notificationTimer.current) clearTimeout(notificationTimer.current)
    }
  }, [unlocked, ceremony])

  const hasHero = unlocked.length > 0
  const hasOlder = unlocked.length > 1

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <div className="flex items-center gap-3">
            <picture>
              <source srcSet="/logo-dark.svg" media="(prefers-color-scheme: dark)" />
              <img src="/logo.svg" alt="" className="w-10 h-10 shrink-0" />
            </picture>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-serif text-on-background tracking-tight">
                Time-Locked Letters
              </h1>
              <p className="text-on-surface-muted mt-1 text-sm">
                Write letters that only open when the time is right
              </p>
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="bg-danger-container border-b border-danger/30">
          <div className="max-w-5xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <p className="text-sm text-on-danger-container flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              Couldn&apos;t save your letters. Your browser storage may be full.
            </p>
            <button
              onClick={dismissSaveError}
              className="p-1 rounded-full hover:bg-on-danger-container/10 transition-colors flex-shrink-0"
              aria-label="Dismiss save error"
            >
              <X className="w-4 h-4 text-on-danger-container" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {storageUnavailable && (
        <div className="bg-surface-muted border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center gap-3">
            <HardDrive className="w-4 h-4 text-on-surface-muted flex-shrink-0" strokeWidth={1.5} />
            <p className="text-sm text-on-surface-muted">
              Storage is unavailable — letters won&apos;t be saved after closing this tab.
            </p>
          </div>
        </div>
      )}

      {notification && (
        <div className="bg-primary-container border-b border-primary/20 animate-reveal">
          <div className="max-w-5xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <p className="text-sm text-on-primary-container">
              A letter is now unlocked.
            </p>
            <button
              onClick={() => { setSelectedLetter(notification); setNotification(null) }}
              className="text-sm font-medium text-on-primary-container hover:underline flex-shrink-0"
            >
              Read
            </button>
          </div>
        </div>
      )}

      {ceremony && (
        <UnlockCeremony
          letter={ceremony}
          onReveal={(id) => {
            revealLetter(id)
            setCeremonyLetter(null)
          }}
          onSkip={(id) => {
            revealLetter(id)
            setCeremonyLetter(null)
          }}
          onDelete={(id) => {
            removeLetter(id)
            setCeremonyLetter(null)
          }}
        />
      )}

      {/* Content area */}
      <div className={`max-w-5xl mx-auto px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-8 transition-opacity duration-500 ${gridVisible ? 'opacity-100' : 'opacity-0'}`}>
        {letters.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {locked.length > 0 && (
              <section className="mb-10">
                <p className="text-xs text-on-surface-muted font-medium uppercase tracking-wider mb-4">
                  {locked.length} {locked.length === 1 ? 'letter' : 'letters'} waiting
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {locked.map((letter) => (
                    <LetterCard key={letter.id} letter={letter} now={now} onDelete={removeLetter} onSelect={setSelectedLetter} />
                  ))}
                </div>
              </section>
            )}

            {unlocked.length > 0 && (
              <section>
                <p className="text-xs text-on-surface-muted font-medium uppercase tracking-wider mb-4">
                  Opened
                </p>

                {hasHero && (
                  <div className="mb-5">
                    <LetterCard
                      key={unlocked[0].id}
                      letter={unlocked[0]}
                      now={now}
                      onDelete={removeLetter}
                      onSelect={setSelectedLetter}
                      variant="hero"
                      arriving={arrivingIds.has(unlocked[0].id)}
                    />
                  </div>
                )}

                {hasOlder && (
                  <div className="flex flex-col gap-2">
                    {unlocked.slice(1).map((letter) => (
                      <LetterCard
                        key={letter.id}
                        letter={letter}
                        now={now}
                        onDelete={removeLetter}
                        onSelect={setSelectedLetter}
                        variant="compact"
                        arriving={arrivingIds.has(letter.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {showForm && (
        <WritingSurface
          onSubmit={addLetter}
          onClose={() => setShowForm(false)}
        />
      )}

      {selectedLetter && (
        <LetterModal
          letter={selectedLetter}
          onClose={() => setSelectedLetter(null)}
          onDelete={removeLetter}
        />
      )}

      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <button
          onClick={() => setShowForm(true)}
          className="pointer-events-auto inline-flex items-center gap-2 px-5 py-3 bg-primary text-on-primary
                     rounded-2xl font-medium hover:brightness-90 active:scale-95
                     transition-all duration-200 shadow-lg shadow-overlay/10"
        >
          <PenLine className="w-5 h-5" strokeWidth={2} />
          Compose
        </button>
      </div>
    </div>
  )
}
