# Engineering Principles at Work in Time-Locked Letters

This document steps back from the line-by-line explanations and looks at the bigger ideas running through the codebase. Where `docs/01-explanation.md` answers "what does this line do?", this doc answers "what thinking produced that line?".

A "principle" here just means a design decision that solves a recurring problem in software — a rule of thumb that experienced developers reach for because they've seen what goes wrong without it. Each principle below is tied to the exact lines where it shows up, with no abstract hand-waving.

We'll start with the principles most central to this app and work outward to the supporting ones.

---

## 1. Persistence

**In plain words:** Data that survives closing the tab — the app remembers your letters even after you walk away and come back.

**Where it lives:** `src/lib/storage.ts:5-24` and `src/hooks/useLetters.ts:6,8-10`

```ts
// src/lib/storage.ts:5-15
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
```

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

```ts
// src/hooks/useLetters.ts:6,8-10
const [letters, setLetters] = useState<Letter[]>(() => loadLetters())

useEffect(() => {
  saveLetters(letters)
}, [letters])
```

**What's happening:** Two things in lockstep: on startup, the app reads every saved letter from the browser's `localStorage` notebook and loads them into memory as its starting state. Then, every time the list changes (a letter is added or removed), a `useEffect` automatically writes the entire updated list back to the notebook. The notebook survives page refreshes, tab closes, and even computer restarts — it outlives the running app.

**Why this app needed it:** Without persistence, every letter you wrote would vanish the moment you refreshed the page or closed the tab. An app where your data doesn't survive a browser refresh is effectively broken — you'd feel like the app "ate" your letters. The `STORY_KEY` constant with its `:v1` suffix (`src/lib/storage.ts:3`) also sets up future-proofing: if the data format ever changes, we can switch to `:v2` without breaking old saved letters.

---

## 2. Single Source of Truth

**In plain words:** Every piece of data lives in exactly one place; everything else reads from that place or writes back to it — never holds its own competing copy.

**Where it lives:** `src/hooks/useLetters.ts:6` and `src/App.tsx:11,60-67`

```ts
// src/hooks/useLetters.ts:6
const [letters, setLetters] = useState<Letter[]>(() => loadLetters())
```

```ts
// src/App.tsx:11,60-67
const { letters, addLetter, removeLetter } = useLetters()

// ...
{sortedLetters.map((letter) => (
  <LetterCard
    key={letter.id}
    letter={letter}
    now={now}
    onDelete={removeLetter}
  />
))}
```

**What's happening:** The `letters` array inside `useLetters` is the one and only real copy of the letters in the entire application. `App.tsx` reads it, but never stores its own copy. `LetterCard` receives a single letter via props, but never duplicates it into local state. `localStorage` reflects it (via the save effect), but never drives it — the in-memory array is the boss. There's exactly one place to look to answer "what letters exist right now?"

**Why this app needed it:** If `App.tsx` kept its own `lettersCopy` array and synced it manually, you'd eventually get drift — add a letter in one place, forget to update the other, and the screen shows stale data while localStorage has something different. This is one of the most common bug classes in UI programming. The single-source pattern eliminates the "which copy is the real one?" question entirely.

---

## 3. Derived State

**In plain words:** Don't store what you can calculate — compute values on the fly from the source of truth rather than storing them as separate fields that can fall out of sync.

**Where it lives:** `src/lib/time.ts:3-5`, `src/components/LetterCard.tsx:14`, and `src/App.tsx:15-29`

```ts
// src/lib/time.ts:3-5
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}
```

```ts
// src/components/LetterCard.tsx:14
const unlocked = isUnlocked(letter.unlockDate, now)
```

```ts
// src/App.tsx:15-29
const sortedLetters = useMemo(() => {
  const unlocked = letters
    .filter((l) => isUnlocked(l.unlockDate, now))
    .sort(
      (a, b) =>
        new Date(b.unlockDate).getTime() - new Date(a.unlockDate).getTime(),
    )
  const locked = letters
    .filter((l) => !isUnlocked(l.unlockDate, now))
    .sort(
      (a, b) =>
        new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime(),
    )
  return [...unlocked, ...locked]
}, [letters, now])
```

**What's happening:** The code never stores "this letter is locked" or "this letter is unlocked" as a field on the `Letter` object (look at `src/types.ts:1-7` — there's no `status` field). Instead, `isUnlocked` is a pure function: you give it a date and the current time, and it tells you the answer. The `LetterCard` calls it on every render, recalculating from the ground up. The `sortedLetters` in `App.tsx` are never saved — they're computed fresh from `letters` and `now` every second (smoothed by `useMemo`). No stored value can ever disagree with the current time.

**Why this app needed it:** If you stored `status: "locked"` as a field, you'd need to somehow detect the exact moment the clock passes the deadline and update the field — a whole additional mechanism. But the real killer is bugs: what if the update fails? What if the user's clock changes? With derived state, there's one question ("is `unlockDate` before `now`?") asked fresh every time. The answer is always correct for the current moment, with no synchronization required. The guard clause in `formatTimeRemaining` (`src/lib/time.ts:16-18`) is another example — if the computed time goes negative, it clamps to zero rather than storing a separate "already counted down" flag.

---

## 4. Side-Effect Management

**In plain words:** The "messy outside-world stuff" (timers, storage, the DOM) lives in quarantine — separated from the rendering logic so the UI stays predictable.

**Where it lives:** `src/hooks/useCountdown.ts:6-11`, `src/hooks/useLetters.ts:8-10`, and `src/components/LetterCard.tsx:20-27,38-42`

```ts
// src/hooks/useCountdown.ts:6-11
useEffect(() => {
  const id = setInterval(() => {
    setNow(new Date())
  }, 1000)
  return () => clearInterval(id)
}, [])
```

```ts
// src/hooks/useLetters.ts:8-10
useEffect(() => {
  saveLetters(letters)
}, [letters])
```

```ts
// src/components/LetterCard.tsx:20-27
useEffect(() => {
  if (!prevUnlocked.current && unlocked) {
    setShowReveal(true)
    const timer = setTimeout(() => setShowReveal(false), 700)
    return () => clearTimeout(timer)
  }
  prevUnlocked.current = unlocked
}, [unlocked])
```

```ts
// src/components/LetterCard.tsx:38-42
useEffect(() => {
  return () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
  }
}, [])
```

**What's happening:** React's `useEffect` is the quarantine zone. Every piece of code that talks to the outside world — starting a ticking interval, writing to localStorage, setting a timeout for an animation, setting a timer for the delete confirmation — goes inside a `useEffect`, never directly in the render path. The render function itself (the JSX) stays pure: given the same props and state, it always produces the same description of the UI. Effects run *after* the UI is committed to the screen, never during.

**Why this app needed it:** If you started `setInterval` directly in the render body, you'd create a new interval every single time the component rendered — that's 60 new timers per minute in strict mode, all ticking simultaneously, all calling `setNow`, causing exponential re-renders. The app would grind to a halt. Equally important: each effect declares what it depends on (`[letters]`, `[unlocked]`, `[]`) so React can skip the work when nothing relevant changed. Without this, you'd be writing to localStorage or starting timers on every keystroke — wasteful and bug-prone.

---

## 5. Unidirectional Data Flow

**In plain words:** Data only flows one way — down from parent to child through props; changes only flow up through callbacks; no component reaches sideways into another component's state.

**Where it lives:** `src/App.tsx:60-76` and `src/components/LetterForm.tsx:43-51`

```tsx
// src/App.tsx:60-67 — data flows down
<LetterCard
  key={letter.id}
  letter={letter}
  now={now}
  onDelete={removeLetter}
/>
```

```tsx
// src/App.tsx:72-76 — actions flow up
{showForm && (
  <LetterForm
    onSubmit={addLetter}
    onClose={() => setShowForm(false)}
  />
)}
```

```tsx
// src/components/LetterForm.tsx:43-51 — calling a callback to send data up
const letter: Letter = {
  id: crypto.randomUUID(),
  recipient: recipient.trim(),
  content: content.trim(),
  unlockDate: new Date(unlockDate).toISOString(),
  createdAt: new Date().toISOString(),
}

onSubmit(letter)
```

**What's happening:** `App.tsx` owns the letters state (via `useLetters`). It passes individual letters *down* to `LetterCard` as props — `letter`, `now`, `onDelete`. When `LetterCard` needs to delete a letter, it doesn't modify the state directly (it *can't* — it doesn't own it). Instead, it calls the `onDelete` callback, which flows *up* to `App`, which calls `removeLetter`, which updates the single source of truth. Same pattern with `LetterForm`: it builds a new letter object, then calls `onSubmit(letter)`, handing it up to `App`'s `addLetter`. The circular flow is: state lives at the top → flows down as props → children call callbacks → state updates at the top → flows back down.

**Why this app needed it:** Without this pattern, you'd have two ways to understand the app: "where does this data come from?" and "who else is touching it?" With unidirectional flow, both questions have the same answer: follow the props up to the nearest hook. If `LetterCard` could directly modify `useLetters`' state, you'd have to search every component in the tree to understand when and why a letter gets deleted. This predictability is why React adopted this as its core model — it makes medium-to-large apps debuggable.

---

## 6. Separation of Concerns

**In plain words:** Each folder and file has exactly one job; logic, state management, and presentation live in different layers.

**Where it lives:** The folder structure and `src/types.ts:1-7`

```
src/
  types.ts         — data shapes only, no logic
  lib/
    storage.ts     — reading/writing the notebook
    time.ts        — date math and formatting
  hooks/
    useLetters.ts  — list state + auto-save wiring
    useCountdown.ts— ticking clock state
  components/
    Countdown.tsx  — displays a countdown timer
    EmptyState.tsx — "no letters yet" screen
    LetterCard.tsx — one letter's card (locked or unlocked)
    LetterForm.tsx — compose modal
  App.tsx          — orchestration: sorting + layout + wiring
```

```ts
// src/types.ts:1-7 — pure shape definition, no behavior attached
export type Letter = {
  id: string;
  recipient: string;
  content: string;
  unlockDate: string;
  createdAt: string;
};
```

**What's happening:** The `lib/` folder is pure logic with zero React in it — `isUnlocked` and `saveLetters` would work in any JavaScript environment. The `hooks/` folder is React-specific state management — it imports from `lib/` and `React`, but returns data and functions, never JSX. The `components/` folder is pure UI — it receives data via props, renders JSX, and calls callbacks, but has almost no business logic (one exception: `LetterCard`'s `unlocked` check is one line, delegated to `lib/time.ts`). `types.ts` defines the shape of data with no code attached — it's a contract that every other file can reference.

**Why this app needed it:** If the localStorage `try/catch`, the countdown arithmetic, and the JSX styling all lived in one file, you'd need to understand everything at once to change anything. Want to tweak the countdown display? You'd wade through storage logic to find it. Want to change the storage format? You'd risk breaking the UI. With separated concerns, you can swap the date-fns library for a different one (`lib/time.ts` changes, nothing else), redesign the cards (`components/` changes, nothing else), or migrate from localStorage to IndexedDB (`lib/storage.ts` changes, the hooks don't care as long as the function signatures stay the same).

---

## 7. Defensive Programming / Fail-Safe Defaults

**In plain words:** Never trust external input — always assume things can go wrong and have a safe fallback so one bad piece of data doesn't kill the whole app.

**Where it lives:** `src/lib/storage.ts:6-15`, `src/lib/storage.ts:18-24`, `src/lib/time.ts:16-18`, and `src/components/LetterForm.tsx:34-41`

```ts
// src/lib/storage.ts:6-15 — three layers of defense
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []               // nothing saved → empty list
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []  // wrong shape → empty list
  return parsed as Letter[]
} catch (err) {
  console.warn('Failed to load letters from localStorage:', err)
  return []                         // corrupted JSON → empty list
}
```

```ts
// src/lib/storage.ts:18-24 — writes can fail too
try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
} catch (err) {
  console.warn('Failed to save letters to localStorage:', err)
}
```

```ts
// src/lib/time.ts:16-18 — guard against negative time
if (totalSeconds <= 0) {
  return { days: 0, hours: 0, minutes: 0, seconds: 0 }
}
```

```ts
// src/components/LetterForm.tsx:34-41 — validate before acting
const isValid =
  recipient.trim().length > 0 &&
  recipient.length <= 60 &&
  content.trim().length > 0 &&
  unlockDate.length > 0 &&
  new Date(unlockDate) > new Date()

function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError('')
  if (!isValid) {
    setError('Please fill all fields with valid values.')
    return
  }
```

**What's happening:** Every interaction with an external system — the browser's storage, the user's input — is wrapped in a safety check. The `loadLetters` function has three layers of defense: (1) `try/catch` catches corrupt JSON, (2) the `!raw` check handles first-time visitors, (3) the `!Array.isArray` check handles data in the wrong shape. All three resolve to the same safe fallback: an empty array `[]`. The countdown function guards against negative time (a passed deadline). The form *double-checks* the unlock date is in the future with JavaScript, even though the HTML `min` attribute also restricts it — because HTML attributes are suggestions, not enforcement (anyone can edit them in browser devtools).

**Why this app needed it:** Without defensive loading, a single corrupted entry in localStorage — from a browser crash during save, a user editing devtools, or a future app version writing a different format — would crash `JSON.parse`, which would bubble up to React's render, which would replace the entire app with a blank white screen. A user would have no way to recover. With defensive loading, the app silently discards bad data and starts fresh. Better an empty list on a corrupted notebook than a dead app. Same logic with the form: the user sees a clear error message instead of a cryptic crash.

---

## 8. Write-Once Immutability

**In plain words:** Once data is created, it's never changed in-place — updates always create a new copy, and this app takes that further by design: letters can only be created or deleted, never edited.

**Where it lives:** `src/types.ts:1-7` and `src/hooks/useLetters.ts:12-18`

```ts
// src/types.ts:1-7 — no status field, no "editedAt", no mutation flags
export type Letter = {
  id: string;
  recipient: string;
  content: string;
  unlockDate: string;
  createdAt: string;
};
```

```ts
// src/hooks/useLetters.ts:12-18 — only add and remove, no update
const addLetter = useCallback((letter: Letter) => {
  setLetters((prev) => [letter, ...prev])
}, [])

const removeLetter = useCallback((id: string) => {
  setLetters((prev) => prev.filter((l) => l.id !== id))
}, [])
```

**What's happening:** There are exactly two operations on the letters list: add and delete. `addLetter` creates a new array with the new letter prepended (`[letter, ...prev]`). `removeLetter` creates a new array by filtering out the deleted letter (`prev.filter(...)`). Neither modifies the existing array — both return a fresh one. More importantly, there is *no update function*: once a letter is sealed, its recipient, content, and unlock date are permanent. This isn't a missing feature — it's the core idea of the app (time-locked letters shouldn't be tamperable).

The `Letter` type itself has no mutable fields — no `status: "unlocked"` to toggle, no `editedAt` timestamp. The `id` is generated by `crypto.randomUUID()` in `LetterForm.tsx:44` and never reassigned.

**Why this app needed it:** Immutability serves two purposes here. First, it's how React detects changes: when `setLetters` receives a new array reference, React knows to re-render; if you mutated the old array with `.push()`, React would see the same reference and skip the update. Second, the write-once design is thematic: a "sealed" letter shouldn't be editable after locking it — that would defeat the time-lock concept. Adding an edit feature would pierce the illusion. (A real-world version might add editing for *locked* letters only, since the recipient hasn't seen them yet — but that's a future design decision.)

---

## 9. Resource Cleanup & Managed Lifetimes

**In plain words:** Every timer, interval, and subscription has a clear end — when the component that started it goes away, the resource goes away too, never leaving orphan work behind.

**Where it lives:** `src/hooks/useCountdown.ts:7-10` and `src/components/LetterCard.tsx:23-24,34,38-42`

```ts
// src/hooks/useCountdown.ts:7-10 — interval starts, interval stops
useEffect(() => {
  const id = setInterval(() => {
    setNow(new Date())
  }, 1000)
  return () => clearInterval(id)     // cleanup: stop the clock
}, [])
```

```ts
// src/components/LetterCard.tsx:23-24 — animation timer with cleanup
const timer = setTimeout(() => setShowReveal(false), 700)
return () => clearTimeout(timer)     // cleanup: cancel if unmounted mid-animation
```

```ts
// src/components/LetterCard.tsx:34 — confirm-delete timer started
confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000)

// src/components/LetterCard.tsx:38-42 — cleanup on unmount
useEffect(() => {
  return () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
  }
}, [])
```

**What's happening:** Three different timers, three different cleanup strategies, one consistent pattern. The countdown interval (`useCountdown.ts`) starts on mount and stops on unmount via the cleanup function returned from `useEffect`. The reveal animation timeout (`LetterCard.tsx:23-24`) starts inside an effect when a letter unlocks and cleans up if the effect re-runs or the component unmounts before the 700ms elapses. The delete-confirmation timeout (`LetterCard.tsx:34`) is stored in a ref and cleaned up in a separate unmount-only effect (`LetterCard.tsx:38-42`) — this handles the case where the card is deleted (via the first click) while the 3-second reset timer is still pending.

**Why this app needed it:** Orphan timers are silent bugs. Without cleanup, every time `useCountdown`'s component re-mounted (which React StrictMode does deliberately during development), a new interval would start while the old one kept running. After ten mounts, ten intervals are all calling `setNow(new Date())` ten times per second — needless work that grows forever. The delete-confirmation cleanup is subtler: if you clicked "Delete" once, then the letter somehow unmounted before you clicked again, the 3-second timer would fire on a dead component, trying to call `setConfirmDelete(false)`. React handles this gracefully in newer versions (it logs a warning), but in older React and other frameworks, calling `setState` on an unmounted component is a real error. Cleanup prevents it entirely.

---

## 10. Don't Repeat Yourself (DRY)

**In plain words:** If the same logic appears in two places, extract it into one shared place — so a bug fix or improvement only needs to happen once.

**Where it lives:** `src/lib/time.ts:3-5,7-28,30-38` and `src/lib/storage.ts:5-24`

```ts
// src/lib/time.ts:3-5 — used by App.tsx AND LetterCard.tsx
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}
```

```ts
// src/lib/time.ts:7-28 — used by Countdown.tsx (via formatTimeRemaining)
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
```

```ts
// src/lib/time.ts:30-38 — used by LetterCard.tsx (in two places)
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
```

**What's happening:** Three shared utility functions in `lib/time.ts`, each called from multiple places. `isUnlocked` is called by `App.tsx` (to sort letters into locked/unlocked groups) *and* by `LetterCard.tsx` (to decide whether to show the content or the countdown). If `isUnlocked` were copy-pasted into both files, any change — a timezone bug fix, a switch to a different comparison library — would need to be made in two places. `formatUnlockDate` is even cited twice in `LetterCard.tsx` alone (line 93 for unlocked cards, line 103 for locked cards), so extracting it prevents even intra-file duplication. `formatTimeRemaining` would be identical in `Countdown.tsx` if it lived there — isolating the math from the display means the countdown component stays thin.

**Why this app needed it:** This codebase is small (under 400 lines of source), so DRY might seem like overkill here. But the principle pays off in two ways even at this scale: (1) correctness — if the unlock-check logic had a subtle bug (like using `<=` when it should be `<`), having one copy means the fix applies everywhere, instantly; (2) testability — pure functions in `lib/` can be tested independently of React, without mounting components, which matters as the app grows. The `storage.ts` functions (`loadLetters`, `saveLetters`) follow the same DRY pattern — called only from `useLetters.ts`, but extracted so the hook doesn't mix localStorage details with React state logic.

---

## How These Fit Together

These ten principles aren't a checklist to memorize — they're a system that reinforces itself.

**Persistence** (1) writes to the notebook; **single source of truth** (2) ensures there's exactly one in-memory copy being written. **Derived state** (3) means the locked/unlocked status and the sort order are never persisted — they're computed fresh, so they can never disagree with the stored data or the current time.

**Side-effect management** (4) quarantines the persistence writes, the ticking clock, and the animation timers so they don't leak into the rendering path. **Resource cleanup** (9) ensures those quarantined effects don't outlive the components that started them.

**Unidirectional data flow** (5) routes every change through a single path: the state in `useLetters` → down through props → up through callbacks → back to `useLetters`. This pairs with **separation of concerns** (6) — each layer on that path (storage, hooks, components) has one narrow job.

**Defensive programming** (7) handles the cases where the notebook is corrupted, the storage is full, or the user bypasses HTML validation. **Write-once immutability** (8) reduces the surface area for data corruption — with only add and delete operations, there's less to go wrong than with full CRUD.

**DRY** (10) is the quiet one — it's what makes the other principles maintainable by keeping shared logic in exactly one place.

Together, they produce an app where the answer to "what happens if..." is usually boring: if storage fails, you get an empty list. If an interval leaks, it's cleaned up. If the clock ticks past midnight, letters unlock. No drama, no crashes, no lost data — that's what these principles buy you.
