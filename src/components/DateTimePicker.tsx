import { useState, useRef, useEffect, useCallback } from 'react'
import { DayPicker } from 'react-day-picker'
import { Calendar } from 'lucide-react'

type Props = {
  value: Date | null
  onChange: (next: Date | null) => void
  minDate?: Date
  error?: string
}

export default function DateTimePicker({
  value,
  onChange,
  minDate = new Date(),
  error,
}: Props) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(minDate)
  const [draftDate, setDraftDate] = useState<Date | null>(null)
  const [draftHour, setDraftHour] = useState<number | null>(null)
  const [draftMinute, setDraftMinute] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const syncedRef = useRef(value)

  useEffect(() => {
    if (value === syncedRef.current) return
    syncedRef.current = value
    if (value) {
      setDraftDate(value)
      setDraftHour(value.getHours())
      setDraftMinute(value.getMinutes())
      setMonth(value)
    } else {
      setDraftDate(null)
      setDraftHour(null)
      setDraftMinute(null)
    }
  }, [value])

  const now = new Date()
  const isToday =
    draftDate !== null &&
    draftDate.toDateString() === now.toDateString()

  const commit = useCallback(
    (date: Date | null, h: number | null, m: number | null) => {
      if (date && h !== null && m !== null) {
        const combined = new Date(date)
        combined.setHours(h, m, 0, 0)
        onChange(combined)
      }
    },
    [onChange],
  )

  function handleDateSelect(d: Date | undefined) {
    if (!d) return
    setDraftDate(d)
    setMonth(d)
    commit(d, draftHour, draftMinute)
  }

  function handleHour(e: React.ChangeEvent<HTMLSelectElement>) {
    const h = parseInt(e.target.value)
    setDraftHour(h)
    commit(draftDate, h, draftMinute)
  }

  function handleMinute(e: React.ChangeEvent<HTMLSelectElement>) {
    const m = parseInt(e.target.value)
    setDraftMinute(m)
    commit(draftDate, draftHour, m)
  }

  function openPicker() {
    syncFromValue()
    setOpen(true)
  }

  function syncFromValue() {
    if (value) {
      setDraftDate(value)
      setDraftHour(value.getHours())
      setDraftMinute(value.getMinutes())
      setMonth(value)
    } else {
      setDraftDate(null)
      setDraftHour(null)
      setDraftMinute(null)
    }
  }

  const formatted = value
    ? value.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`w-full px-4 py-2.5 rounded-xl border transition-shadow text-left
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    ${error ? 'border-danger' : 'border-border'}
                    ${value ? 'bg-surface-muted text-on-surface' : 'bg-surface-muted text-on-surface-muted'}`}
      >
        <span className="inline-flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          {value ? formatted : 'Pick a date & time'}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Date and time picker"
          className="absolute bottom-full left-0 mb-1 z-50 bg-surface border border-border
                     rounded-xl shadow-lg p-4 w-[300px] sm:w-[340px]"
        >
          <DayPicker
            mode="single"
            selected={draftDate ?? undefined}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            disabled={{ before: minDate }}
            classNames={{
              month: 'flex flex-col',
              month_caption: 'flex justify-center mb-2 relative',
              caption_label: 'text-on-surface font-medium text-sm',
              nav: 'absolute inset-x-0 top-0 flex justify-between',
              button_previous:
                'text-on-surface-muted hover:text-on-surface hover:bg-surface-muted rounded-md p-0.5',
              button_next:
                'text-on-surface-muted hover:text-on-surface hover:bg-surface-muted rounded-md p-0.5',
              month_grid: 'w-full border-collapse',
              weekdays: '',
              weekday: 'text-on-surface-muted text-xs font-medium w-9 h-8',
              week: '',
              day: 'text-on-surface text-sm p-0 size-9',
              day_button:
                'size-9 rounded-md text-sm hover:bg-surface-muted transition-colors',
              outside: '',
              today: '',
              disabled: '',
            }}
            modifiersClassNames={{
              selected:
                '[&>button]:bg-primary [&>button]:text-on-primary [&>button]:hover:bg-primary [&>button]:hover:brightness-90',
              today: '',
              outside:
                '[&>button]:text-on-surface-muted/50 [&>button]:hover:bg-surface-muted',
              disabled:
                '[&>button]:text-on-surface-muted/60 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
            }}
          />

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <select
              value={draftHour ?? ''}
              onChange={handleHour}
              aria-label="Hour"
              className="bg-surface border border-border rounded-lg px-2 py-1.5 text-on-surface text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="" disabled>
                HH
              </option>
              {Array.from({ length: 24 }, (_, i) => (
                <option
                  key={i}
                  value={i}
                  disabled={isToday && i < now.getHours()}
                >
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>

            <span className="text-on-surface-muted text-sm">:</span>

            <select
              value={draftMinute ?? ''}
              onChange={handleMinute}
              aria-label="Minute"
              className="bg-surface border border-border rounded-lg px-2 py-1.5 text-on-surface text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="" disabled>
                MM
              </option>
              {Array.from({ length: 60 }, (_, i) => (
                <option
                  key={i}
                  value={i}
                  disabled={
                    isToday &&
                    draftHour !== null &&
                    draftHour === now.getHours() &&
                    i < now.getMinutes()
                  }
                >
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium
                         bg-primary text-on-primary hover:brightness-90 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
