import type { Letter } from '../types'

const STORAGE_KEY = 'time-locked-letters:v1'

export function loadLetters(): Letter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Letter[]
  } catch (err) {
    console.warn('Failed to load letters from localStorage:', err)
    return []
  }
}

export function saveLetters(letters: Letter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
  } catch (err) {
    console.warn('Failed to save letters to localStorage:', err)
  }
}
