import { differenceInSeconds, differenceInDays } from 'date-fns'

export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}

export function formatTimeRemaining(unlockDate: string, now: Date): {
  days: number
  hours: number
  minutes: number
  seconds: number 
} {
  const target = new Date(unlockDate)
  const totalSeconds = differenceInSeconds(target, now)

  if (totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  const days = differenceInDays(target, now)
  const remainingAfterDays = totalSeconds - days * 86400
  const hours = Math.floor(remainingAfterDays / 3600)
  const remainingAfterHours = remainingAfterDays - hours * 3600
  const minutes = Math.floor(remainingAfterHours / 60)
  const seconds = remainingAfterHours - minutes * 60

  return { days, hours, minutes, seconds }
}

export function formatUnlockDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
