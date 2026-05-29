import type { Letter } from '../types'

const STORAGE_KEY = 'time-locked-letters:v2'
const V1_KEY = 'time-locked-letters:v1'

export function loadLetters(): Letter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Letter[]
    }

    const v1Raw = localStorage.getItem(V1_KEY)
    if (v1Raw) {
      const v1Parsed = JSON.parse(v1Raw)
      if (Array.isArray(v1Parsed)) {
        const migrated = (v1Parsed as Letter[]).map((l) => ({
          ...l,
          revealedAt: l.revealedAt ?? l.createdAt,
        }))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        return migrated
      }
    }

    return []
  } catch (err) {
    console.warn('Failed to load letters from localStorage:', err)
    return []
  }
}

export function saveLetters(letters: Letter[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
    return true
  } catch (err) {
    console.warn('Failed to save letters to localStorage:', err)
    return false
  }
}

export function isStorageAvailable(): boolean {
  try {
    const testKey = STORAGE_KEY + ':test'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}
