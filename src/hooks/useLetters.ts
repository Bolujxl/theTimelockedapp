import { useState, useCallback, useEffect } from 'react'
import type { Letter } from '../types'
import { loadLetters, saveLetters, isStorageAvailable } from '../lib/storage'

export function useLetters() {
  const [letters, setLetters] = useState<Letter[]>(() => loadLetters())
  const [saveError, setSaveError] = useState(false)
  const [storageUnavailable] = useState(() => !isStorageAvailable())

  useEffect(() => {
    const ok = saveLetters(letters)
    setSaveError(!ok)
  }, [letters])

  const addLetter = useCallback((letter: Letter) => {
    setLetters((prev) => [letter, ...prev])
  }, [])

  const removeLetter = useCallback((id: string) => {
    setLetters((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const dismissSaveError = useCallback(() => setSaveError(false), [])

  const revealLetter = useCallback((id: string) => {
    setLetters((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, revealedAt: new Date().toISOString() } : l,
      ),
    )
  }, [])

  return { letters, addLetter, removeLetter, saveError, dismissSaveError, storageUnavailable, revealLetter }
}
