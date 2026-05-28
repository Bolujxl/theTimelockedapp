import { useState, useCallback, useEffect } from 'react'
import type { Letter } from '../types'
import { loadLetters, saveLetters } from '../lib/storage'

export function useLetters() {
  const [letters, setLetters] = useState<Letter[]>(() => loadLetters())

  useEffect(() => {
    saveLetters(letters)
  }, [letters])

  const addLetter = useCallback((letter: Letter) => {
    setLetters((prev) => [letter, ...prev])
  }, [])

  const removeLetter = useCallback((id: string) => {
    setLetters((prev) => prev.filter((l) => l.id !== id))
  }, [])

  return { letters, addLetter, removeLetter }
}
