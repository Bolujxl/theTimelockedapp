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
    <div className="flex items-center gap-3 text-stone-500 font-mono text-sm tracking-wide">
      <div className="flex items-baseline gap-0.5">
        <span className="text-stone-700 font-semibold">
          <Pad value={days} />
        </span>
        <span className="text-xs">d</span>
      </div>
      <span className="text-stone-300">:</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-stone-700 font-semibold">
          <Pad value={hours} />
        </span>
        <span className="text-xs">h</span>
      </div>
      <span className="text-stone-300">:</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-stone-700 font-semibold">
          <Pad value={minutes} />
        </span>
        <span className="text-xs">m</span>
      </div>
      <span className="text-stone-300">:</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-stone-700 font-semibold">
          <Pad value={seconds} />
        </span>
        <span className="text-xs">s</span>
      </div>
    </div>
  )
}
