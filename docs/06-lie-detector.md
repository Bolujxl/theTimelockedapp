# Lie Detector — Four Truths and One Lie

## The Rules
Four of the five claims below are true. One is a lie about the code's logic.
Find the lie by reading the source. (Scope: machinery only — no cosmetic claims.)

## The Claims

**Claim 1.** The `isUnlocked` function in `lib/time.ts` returns `true` the moment `now` is equal to or past the unlock date. It compares two `Date` objects using `<=`, and since JavaScript's `Date` objects convert to numeric timestamps under comparison operators, this is a numeric check — not a string comparison against the ISO text.

**Claim 2.** The effect in `useCountdown.ts` that creates the once-per-second interval has an empty dependency array. This means the interval is set up exactly once when the hook first runs and torn down only when the hook is removed. The state update `setNow(new Date())` inside the interval callback is what triggers re-renders — the effect itself does not re-run every second.

**Claim 3.** In `LetterCard.tsx`, the component tracks whether a letter has just transitioned from locked to unlocked by storing the previous `unlocked` value in a `useRef`. Because refs do not trigger re-renders when mutated, the component can detect the transition without entering an infinite loop — updating the ref at the end of the effect does not cause the effect to re-fire.

**Claim 4.** The `saveLetters` function in `lib/storage.ts` is wrapped in a `try/catch`, but it does not return a success or failure indicator. If `localStorage.setItem` throws because the storage quota is exceeded, the error is caught, logged to the console, and the function completes silently. The letter stays in React's in-memory state and appears on screen even though it was never persisted.

**Claim 5.** The `addLetter` callback in `useLetters.ts` lists `[letters]` in its `useCallback` dependency array to ensure the function always works with the most recent list when prepending a new letter. Without that dependency, the function would capture a stale `letters` value from a previous render and could accidentally drop letters that were added in between renders.

## My Guess 
- Lie is claim #: Claim 4
- My reasoning: because we don't  have a catch err and it adds and saves  letters using useeffect as displayed in useLetters.ts anytime a change on the letters array is made. 

## Cross-Check

### Your guess: Claim 4 → Incorrect. Claim 4 is TRUE.

### The lie was Claim 5.

**Claim 5 said:** The `addLetter` callback in `useLetters.ts` lists `[letters]` in its `useCallback` dependency array.

**The code actually reads:**

```ts
// src/hooks/useLetters.ts:12-14
const addLetter = useCallback((letter: Letter) => {
  setLetters((prev) => [letter, ...prev])
}, [])
```

The dependency array is `[]` — empty. It does **not** list `[letters]`. The function uses the **functional updater** pattern: `setLetters((prev) => ...)`. React passes the latest state as `prev` to the callback, so `addLetter` always gets the current list without needing `letters` in its dependency array. This is why `addLetter` never needs to be recreated even as `letters` changes.

---

### The 4 truths confirmed:

**Claim 1 — TRUE:**
```ts
// src/lib/time.ts:3-5
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}
```
`<=` on two `Date` objects triggers numeric timestamp comparison. The letter unlocks at the exact millisecond `now` reaches or passes the unlock date.

**Claim 2 — TRUE:**
```ts
// src/hooks/useCountdown.ts:6-11
useEffect(() => {
  const id = setInterval(() => {
    setNow(new Date())
  }, 1000)
  return () => clearInterval(id)
}, [])
```
Empty `[]` dep array — the effect runs once on mount. The interval callback's `setNow` triggers re-renders. The effect itself never re-runs.

**Claim 3 — TRUE:**
```ts
// src/components/LetterCard.tsx:15,26-27
const prevUnlocked = useRef(unlocked)
// ...
prevUnlocked.current = unlocked
// ...
}, [unlocked])
```
`useRef` stores the previous `unlocked` across renders. Mutating the ref at the end of the effect doesn't cause the effect to re-fire — only changes to `[unlocked]` in the dep array do.

**Claim 4 — TRUE:**
```ts
// src/lib/storage.ts:18-24
export function saveLetters(letters: Letter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
  } catch (err) {
    console.warn('Failed to save letters to localStorage:', err)
  }
}
```
Wrapped in `try/catch`, returns `void` (no success/failure indicator), only `console.warn` on failure. The letter is already in React state from `setLetters` in `useLetters.ts:13` before the save effect runs — so it appears on screen even without persisting.

---

### Verdict

**You missed the lie.** Claim 5 was false — `addLetter`'s dependency array is `[]`, not `[letters]`. Claim 4 is true: `saveLetters` does have a `try/catch` (lines 19-23), returns `void`, and the letter stays in React memory even if the write fails. The `catch` block was there all along — it just logs silently instead of surfacing the error to the user.