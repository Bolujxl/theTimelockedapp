import { Feather } from 'lucide-react'

export default function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="rounded-full bg-amber-100 p-6 mb-6">
        <Feather className="w-10 h-10 text-amber-700" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-serif text-stone-700 mb-2">
        No letters yet
      </h2>
      <p className="text-stone-500 max-w-sm mb-8 leading-relaxed">
        Write a letter to your future self or someone you care about.
        It will stay locked until the date you choose.
      </p>
      <button
        onClick={onCompose}
        className="px-6 py-3 bg-amber-700 text-stone-50 rounded-xl font-medium
                   hover:bg-amber-800 transition-colors duration-200 shadow-sm"
      >
        Write your first letter
      </button>
    </div>
  )
}
