import { formatTimeRemaining } from '../lib/time'

function Pad({ value }: { value: number }) {
  return <>{String(value).padStart(2, '0')}</>
}

export default function Countdown({
  unlockDate,
  now,
}: {
  unlockDate: string
  now: Date
}) {
  const { days, hours, minutes, seconds } = formatTimeRemaining(
    unlockDate,
    now,
  )

  return (
    <div
      aria-label={`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds remaining`}
      className="flex items-center gap-1.5 sm:gap-3 text-on-surface-muted font-mono text-xs sm:text-sm tracking-wide"
    >
      <div className="flex items-baseline gap-0.5" aria-hidden="true">
        <span className="text-on-surface font-semibold">
          <Pad value={days} />
        </span>
        <span className="text-xs">d</span>
      </div>
      <span className="text-on-surface-muted/60" aria-hidden="true">:</span>
      <div className="flex items-baseline gap-0.5" aria-hidden="true">
        <span className="text-on-surface font-semibold">
          <Pad value={hours} />
        </span>
        <span className="text-xs">h</span>
      </div>
      <span className="text-on-surface-muted/60" aria-hidden="true">:</span>
      <div className="flex items-baseline gap-0.5" aria-hidden="true">
        <span className="text-on-surface font-semibold">
          <Pad value={minutes} />
        </span>
        <span className="text-xs">m</span>
      </div>
      <span className="text-on-surface-muted/60" aria-hidden="true">:</span>
      <div className="flex items-baseline gap-0.5" aria-hidden="true">
        <span className="text-on-surface font-semibold">
          <Pad value={seconds} />
        </span>
        <span className="text-xs">s</span>
      </div>
    </div>
  )
}
