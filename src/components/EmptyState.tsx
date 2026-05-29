import { Feather } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="rounded-full bg-primary-container p-6 mb-6">
        <Feather className="w-10 h-10 text-on-primary-container" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-serif text-on-surface mb-2">
        No letters yet
      </h2>
      <p className="text-on-surface-muted max-w-sm leading-relaxed">
        Write a letter to your future self or someone you care about.
        It will stay locked until the date you choose.
      </p>
    </div>
  )
}
