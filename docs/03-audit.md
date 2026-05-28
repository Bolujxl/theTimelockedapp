# Code Audit: Edge Cases, Security & Principle Violations

## Executive Summary

**Total findings: 2 HIGH, 4 MEDIUM, 6 LOW, 2 LIMITATION. No CRITICALs, no security vulnerabilities.** 

The codebase is clean for its stage. React's default text escaping eliminates XSS entirely. Every timer and interval has a cleanup function — no memory leaks. All `useEffect` dependency arrays are correct. Derived state and single-source-of-truth are consistently upheld.

The two HIGH-severity findings form a compound risk: the letter content `<textarea>` has no `maxLength` attribute, and when `localStorage` write fails (quota exceeded, private browsing), the failure is completely silent. A user who writes an unusually long letter could lose it on the next page load with no warning. **Fix the silent save failure first** — it's the root that makes the unbounded-input problem hurt.

---

## 1. Storage Failure Modes

### [HIGH] Silent localStorage write failure — user loses data on refresh

**Where:** `src/lib/storage.ts:18-24` and `src/hooks/useLetters.ts:8-10`

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
// src/hooks/useLetters.ts:8-10
useEffect(() => {
  saveLetters(letters)
}, [letters])
```

**The problem:** When `localStorage.setItem` throws — because the quota is exceeded, the browser is in private browsing mode, or the user has blocked storage — the error is caught, logged to the console, and then... nothing. The letter the user just wrote is still in React's in-memory state (it was already added via `setLetters`), so it *appears* on screen. The user sees their letter, closes the tab thinking everything is saved, and comes back to find it gone. There is zero user-facing indication that the save failed.

This is the most real-world-dangerous bug in the codebase. It's a silent failure on a critical path: the user's entire mental model of the app is "I write a letter, it stays," and the app quietly betrays that.

**Real-world consequence:** User writes a long, personal letter. `localStorage` quota is reached (common on shared devices or browsers with limited storage). The letter appears on screen — success! — but on next visit, it's gone. The user blames the app, not localStorage. Trust is broken.

**Fix:**

1. Return a success/failure indicator from `saveLetters` instead of `void`:
```ts
export function saveLetters(letters: Letter[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
    return true
  } catch (err) {
    console.warn('Failed to save letters to localStorage:', err)
    return false
  }
}
```

2. In `useLetters`, surface a `saveError` state and expose it. In `App.tsx`, show a non-blocking toast or banner when save fails:
```tsx
// In useLetters.ts
const [saveError, setSaveError] = useState(false)

useEffect(() => {
  const ok = saveLetters(letters)
  setSaveError(!ok)
  if (ok) setSaveError(false) // clear on first successful save after a failure
}, [letters])
```

3. As a low-effort quick-win: estimate the JSON size before saving and warn if it's approaching the limit (~5MB).

---

### [MEDIUM] No graceful degradation when localStorage is unavailable

**Where:** `src/lib/storage.ts:5-15` and `src/hooks/useLetters.ts:6`

```ts
// src/lib/storage.ts:5-8
export function loadLetters(): Letter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
```

```ts
// src/hooks/useLetters.ts:6
const [letters, setLetters] = useState<Letter[]>(() => loadLetters())
```

**The problem:** In some environments (private browsing in older Safari, sandboxed iframes, browser privacy settings that block DOM storage), `localStorage.getItem` itself can throw a `SecurityError` or return `null` for every access. The `try/catch` around `JSON.parse` catches this because any error in the `try` block — including one from `getItem` — falls into `catch` and returns `[]`. So the app boots with an empty list, which is good.

But the user has *no way to know* their letters won't survive a refresh. They see the empty state "No letters yet," write one, see it appear... and it never gets saved. The app is operating in "ephemeral mode" without telling the user.

**Real-world consequence:** A user in private browsing writes a letter to their future self, closes the tab, reopens — letter is gone. They assume the app is broken.

**Fix:** After `loadLetters()` returns `[]`, attempt a test write/read cycle to detect if storage is actually working:
```ts
function isStorageAvailable(): boolean {
  try {
    const testKey = STORAGE_KEY + ':test'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}
```
If unavailable, render a dismissible banner: "Your browser is in private mode or has storage disabled. Letters won't be saved after you close this tab." This turns a silent failure into an informed choice.

---

### [OK / BY DESIGN] Corrupted JSON caught by try/catch

**Where:** `src/lib/storage.ts:6-15`

```ts
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
```

**Verdict:** The three-layer defense (no data → `null` check, wrong type → `!Array.isArray`, corrupt JSON → `catch`) is solid. If someone opens devtools and scribbles `"not json"` into the localStorage key, `JSON.parse` throws, the `catch` block returns `[]`, and the app starts fresh. The old data is gone (that's the cost of not keeping a backup), but the app stays alive. **No fix needed.**

---

### [LOW] No per-field validation on loaded letters

**Where:** `src/lib/storage.ts:11`

```ts
return parsed as Letter[]
```

**The problem:** The type assertion `as Letter[]` tells TypeScript "trust me, this is an array of well-formed letters." But if a future version of the app writes letters with different fields (a `category: string` added in v2, or a renamed field), and the storage key hasn't been bumped, the loaded data might have missing or unexpected fields. React won't crash — `{letter.recipient}` renders nothing if recipient is `undefined` — but the UI would show blank cards with no explanation.

**Real-world consequence:** Low risk in a single-version app, but in a deployed app with auto-updates, a user updates from one version to another and sees blank names or missing dates on their old letters.

**Fix:** Add a lightweight schema validator on load:
```ts
function isValidLetter(obj: unknown): obj is Letter {
  if (typeof obj !== 'object' || obj === null) return false
  const l = obj as Record<string, unknown>
  return (
    typeof l.id === 'string' &&
    typeof l.recipient === 'string' &&
    typeof l.content === 'string' &&
    typeof l.unlockDate === 'string' &&
    typeof l.createdAt === 'string'
  )
}

// In loadLetters:
return parsed.filter(isValidLetter)
```

---

### [LOW] Storage key has version suffix but no runtime enforcement

**Where:** `src/lib/storage.ts:3`

```ts
const STORAGE_KEY = 'time-locked-letters:v1'
```

**The problem:** The `:v1` suffix is a convention that signals intent ("we version our storage format"), but there's no code that actually checks the version or migrates old data. If the storage format changes, the code will try to parse v2 data as v1 and either crash or silently misinterpret it. The suffix is a comment, not a guard.

**Real-world consequence:** In practice, this codebase hasn't changed formats yet, so the risk is theoretical. In a production app, the first schema change would be painful because no migration infrastructure exists.

**Fix:** This is acceptable for a v1 codebase. Add the validation from the previous finding, and when you actually need a v2 format, introduce a migration function:
```ts
const STORAGE_KEY = 'time-locked-letters'
const VERSION_KEY = 'time-locked-letters:version'

function loadWithMigration(): Letter[] {
  const version = localStorage.getItem(VERSION_KEY)
  const raw = localStorage.getItem(STORAGE_KEY)
  // ... parse, check version, apply migration functions as needed
}
```
This is future work, not a bug.

---

## 2. Clock & Time Edge Cases

### [LIMITATION] Trusts the local system clock — users can bypass unlock dates

**Where:** `src/hooks/useCountdown.ts:4,8` and `src/lib/time.ts:3-5`

```ts
// src/hooks/useCountdown.ts:4,8
const [now, setNow] = useState(() => new Date())

setNow(new Date())
```

```ts
// src/lib/time.ts:3-5
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}
```

**The problem:** The app uses `new Date()` — the user's computer clock — as its sole authority on what time it is. If a user sets their system clock forward by a year, every "locked" letter immediately unlocks. If they set it backward, letters that just unlocked re-lock themselves. There is no server-side time authority to compare against.

**Real-world consequence:** Any determined user can read any letter at any time by changing their system date. The "time lock" is a UX convention — an intention-setting tool — not a security mechanism. This is inherent to any purely client-side time-based app.

**Verdict:** This is not a bug you "fix" — it's a fundamental architectural constraint of a browser-only app. The `README.md` or UI should acknowledge it: "Letters are locked by your device's clock. This is a promise to yourself, not a cryptographic guarantee." Labeled as LIMITATION, not a bug.

---

### [OK / BY DESIGN] Exact unlock moment uses `<=`

**Where:** `src/lib/time.ts:3-5`

```ts
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}
```

**The problem examined:** Does the letter unlock *at* its set time or *after* it? `<=` means "at or after." The very first tick where `now` is equal to or past the unlock date triggers the unlock. There's no one-tick delay and no premature unlocking. This is intentional and consistent.

**Verdict:** No fix needed.

---

### [OK / BY DESIGN] Two letters with the same unlock time don't collide

**Where:** `src/App.tsx:60-61`

```tsx
{sortedLetters.map((letter) => (
  <LetterCard key={letter.id} ...
```

**The problem examined:** Could two letters unlocking at the same second cause React key collisions or render glitches? No. The `key` is `letter.id` — a `crypto.randomUUID()` generated at creation time in `LetterForm.tsx:44`. UUIDs are unique regardless of unlock time, content, or recipient. Even if two letters are created in the same millisecond with the same content, they'll have different keys. The sort order between two letters with the same unlock time is arbitrary but stable (determined by array position), which is fine.

**Verdict:** No fix needed.

---

### [MEDIUM] Timezone confusion: `datetime-local` stores local time as ISO

**Where:** `src/components/LetterForm.tsx:47,119-122`

```ts
// src/components/LetterForm.tsx:47
unlockDate: new Date(unlockDate).toISOString(),
```

```tsx
// src/components/LetterForm.tsx:119-122
<input
  type="datetime-local"
  value={unlockDate}
  min={futureMin()}
  onChange={(e) => setUnlockDate(e.target.value)}
```

**The problem:** `<input type="datetime-local">` captures the user's local time (e.g., "December 25, 2026 at 8:00 AM" in Lagos, UTC+1). When the form submits, `new Date(unlockDate).toISOString()` converts this to an ISO 8601 string. The browser interprets the `datetime-local` value as local time and converts it to UTC for the ISO string. So "8:00 AM Lagos" becomes `"2026-12-25T07:00:00.000Z"`.

Now imagine the user travels from Lagos (UTC+1) to New York (UTC-5) and opens the app. The unlock date reads as "2:00 AM" — not the "8:00 AM" they expected because `formatUnlockDate` calls `toLocaleDateString` which uses the *current* local timezone. The letter still unlocks at the correct *absolute moment* (the UTC timestamp is correct), but the *displayed* unlock time shifts to the new timezone.

**Real-world consequence:** A user sets a letter to unlock at "8:00 AM on my birthday." They travel, open the app, and it says "Unlocks on Dec 25 at 2:00 AM." Confusion, but the letter actually unlocks at the right absolute time (midnight Lagos time in this example... wait, no, the ISO timestamp is correct for the moment they picked, so it unlocks at 7:00 AM UTC, which is 8:00 AM Lagos time, which is 2:00 AM New York time). The letter unlocks at the right universal moment, but the user sees a different local time. That's arguably correct behavior for a timezone-aware world, but the UI doesn't explain it.

**Fix:** Display the timezone alongside the formatted date in `formatUnlockDate`:
```ts
return date.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short', // adds "EST", "WAT", etc.
})
```
This at least tells the user *which* timezone's 8:00 AM they meant. A more complete fix would store the user's timezone at creation time and display relative to that — but that's a v2 feature. For now, the display is misleading; the actual unlock moment is correct.

---

### [OK / BY DESIGN] Negative countdown is guarded

**Where:** `src/lib/time.ts:16-18`

```ts
if (totalSeconds <= 0) {
  return { days: 0, hours: 0, minutes: 0, seconds: 0 }
}
```

**The problem examined:** In the one-second tick where the countdown crosses zero, `differenceInSeconds` could return a small negative number. Without this guard, the subsequent math (`Math.floor(negative / 3600)`) would produce negative days/hours. The guard clamps everything to zero. The `Countdown` component (`src/components/Countdown.tsx`) will display `00d:00h:00m:00s` for one second before `LetterCard` re-renders, sees `isUnlocked` returns `true`, and switches to the unlocked content view.

**Verdict:** The guard works correctly. In practice, `LetterCard`'s condition check (`LetterCard.tsx:85`) means the `Countdown` component is only rendered when `unlocked` is `false`, so the zero-guard is a safety net more than an active codepath. But safety nets are good. No fix needed.

---

## 3. Security — XSS and Rendering

### [OK / BY DESIGN] No XSS vectors — React's default escaping is used throughout

**Where:** `src/components/LetterCard.tsx:72,89`

```tsx
// src/components/LetterCard.tsx:72
<h3 className="font-serif text-lg text-stone-800 truncate">
  {letter.recipient}
</h3>
```

```tsx
// src/components/LetterCard.tsx:89
<p className="font-serif text-stone-700 leading-relaxed whitespace-pre-wrap break-words">
  {letter.content}
</p>
```

**The problem examined:** Both the recipient name and letter content are user-controlled strings. If a user types `<script>alert('xss')</script>` as their recipient name, does it execute? No. React's JSX expressions (`{value}`) automatically escape HTML — the `<` becomes `&lt;`, `>` becomes `&gt;` — and the browser renders the literal text, not an interpreted script tag. A grep for `dangerouslySetInnerHTML`, `innerHTML`, `__html`, and `eval` returned zero results across the entire codebase.

**Verdict:** No XSS vulnerability. React's default behavior is the correct and safe choice here. No fix needed.

---

### [OK / BY DESIGN] Content rendered as text only — no dynamic attributes

**Where:** `src/components/LetterCard.tsx:72,89` (same lines as above)

**The problem examined:** Is user content ever used as an HTML attribute value (`href`, `src`, `style`, `onClick` string)? No. The recipient only appears as text content of an `<h3>`. The letter body only appears as text content of a `<p>`. Neither is used to construct URLs, image sources, inline styles, or event handlers. Even React's auto-escaping doesn't protect against `href="javascript:..."` — but that's irrelevant here because user input never touches an attribute.

**Verdict:** No fix needed.

---

### [LIMITATION] Locked letters are plain text in localStorage — "locked" is UI, not security

**Where:** `src/lib/storage.ts:20` and `src/components/LetterCard.tsx:85-108`

```ts
// src/lib/storage.ts:20
localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
```

```tsx
// src/components/LetterCard.tsx:85-108 — content NOT in DOM when locked
{unlocked ? (
  <div>...{letter.content}...</div>  // content IS rendered
) : (
  <>
    <Countdown ... />                  // content NOT rendered
    <p>This letter is sealed...</p>
  </>
)}
```

**The problem:** The app correctly excludes locked letter content from the DOM — inspecting the page shows only a countdown, not the actual message. This is good UX-level privacy (someone glancing at your screen won't see it). However, every letter — locked or unlocked — sits in localStorage as plain JSON text. Anyone who opens the browser's devtools (Application → Local Storage → the `time-locked-letters:v1` key) can read every letter ever written, regardless of unlock date.

**Real-world consequence:** This is a local-only app with no encryption. The "lock" is a promise-to-yourself mechanism, not a security feature. Someone with physical access to your computer can always read your letters.

**Verdict:** This is a fundamental limitation of a client-side-only app. Encryption would require a password at minimum (encrypt before `JSON.stringify`, decrypt after `JSON.parse`), which is a v2 feature. The UI hint "This letter is sealed until the unlock date" (`LetterCard.tsx:105-107`) is honest but could be more explicit: "sealed in the UI" vs. "encrypted." No bug here, but consider a README note about this limitation.

---

### [LOW] Loaded letters trusted without re-validation

**Where:** `src/lib/storage.ts:11`

```ts
return parsed as Letter[]
```

**The problem:** After `JSON.parse` succeeds and we confirm it's an array, we cast it as `Letter[]` with no per-field checks. If someone manually edits localStorage and adds a letter object with `"content": 42` (a number) or a missing `recipient` field, the UI would render `42` as text (React converts it) or render blanks. This won't crash the app, but it could show garbled data.

**Real-world consequence:** Very low — requires the user to deliberately tamper with localStorage via devtools. The app degrades to showing blank cards or unexpected text, not to crashing.

**Fix:** Same as the schema validation fix from section 1 (the `isValidLetter` guard). Low priority.

---

## 4. Principle Violations

### [LOW] Transient single-source-of-truth gap on save failure

**Where:** `src/hooks/useLetters.ts:8-10`

```ts
useEffect(() => {
  saveLetters(letters)
}, [letters])
```

**The problem:** When `saveLetters` fails (quota exceeded, etc.), the React state holds letters that localStorage does not. For the lifespan of the current session, the screen is right. But if the user refreshes, the in-memory truth is lost and the stale localStorage truth takes over. This is a temporary fork of the single source of truth — the `letters` array and localStorage disagree.

This is the same problem as the HIGH finding in section 1, viewed through the lens of our principles doc. The principle says "one canonical place the data lives," but in the failure case, there are two contradictory places.

**Real-world consequence:** Same as the HIGH finding — silent data loss on refresh.

**Fix:** Same as the HIGH finding — surface the save error and warn the user.

---

### [OK / BY DESIGN] Derived state — nothing stored that should be computed

**Audit scope:** I checked every field on the `Letter` type and every piece of local component state against the derived-state principle.

- `Letter` type (`src/types.ts:1-7`): `id`, `recipient`, `content`, `unlockDate`, `createdAt` — all are true source data, nothing derived. No `status`, `isLocked`, or `remainingTime` field. ✓
- `LetterCard` state (`src/components/LetterCard.tsx:14,16-18`): `unlocked` is computed from props (`isUnlocked(letter.unlockDate, now)`), not stored. `showReveal` and `confirmDelete` are genuine UI state (animation play state, confirmation mode), not derived from source data. ✓
- `App.tsx` state (`src/App.tsx:15-29`): `sortedLetters` is computed via `useMemo` — it's derived, not stored. ✓
- `Countdown.tsx` state (`src/components/Countdown.tsx:14-15`): `{ days, hours, minutes, seconds }` is computed by calling `formatTimeRemaining` — derived, not stored. ✓

**Verdict:** The derived-state principle is upheld consistently throughout the codebase. No violation.

---

### [OK / BY DESIGN] Side-effect management — all dependency arrays are correct

**Audit scope:** I checked every `useEffect` and `useCallback` against its actual internal usage.

| Location | Hook | Dependency Array | Verdict |
|---|---|---|---|
| `useCountdown.ts:6-11` | `useEffect` | `[]` | Correct — starts interval once on mount. Cleanup clears it. |
| `useLetters.ts:8-10` | `useEffect` | `[letters]` | Correct — saves when the list changes. Uses `letters` in body; `saveLetters` is stable (imported function). |
| `useLetters.ts:12-14` | `useCallback` | `[]` | Correct — `setLetters` is React-guaranteed stable. No changing deps. |
| `useLetters.ts:16-18` | `useCallback` | `[]` | Correct — same reasoning. |
| `LetterCard.tsx:20-27` | `useEffect` | `[unlocked]` | Correct — `unlocked` is the only value from the effect body that can change. Uses `prevUnlocked` ref (not a dep, refs never are). |
| `LetterCard.tsx:38-42` | `useEffect` | `[]` | Correct — runs only on unmount cleanup. No dependencies. |
| `LetterForm.tsx:23-25` | `useEffect` | `[]` | Correct — focuses input once on mount. |

**Verdict:** Every effect's dependency array matches its actual usage. No missing deps, no unnecessary deps that would cause runaway re-execution. The auto-save effect (`[letters]`) correctly lists the only value it reads. No violation.

---

### [OK / BY DESIGN] Separation of concerns — no component reaches into storage

**Audit scope:** I searched for `localStorage` usage, `loadLetters`, and `saveLetters` calls across the codebase.

- `localStorage.getItem` / `localStorage.setItem` — only appears in `src/lib/storage.ts`. ✓
- `loadLetters` / `saveLetters` — only called from `src/hooks/useLetters.ts`. ✓
- Components (`LetterCard.tsx`, `LetterForm.tsx`, `EmptyState.tsx`, `Countdown.tsx`, `App.tsx`) — none import from `lib/storage` and none use localStorage directly. ✓

**Verdict:** The layer boundaries are clean. Components talk to hooks; hooks talk to lib; lib talks to the browser. No leakage. No violation.

---

## 5. Other Findings

### [HIGH] Letter content textarea has no maxLength — quota blowout risk

**Where:** `src/components/LetterForm.tsx:102-111`

```tsx
// src/components/LetterForm.tsx:102-111
<textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="Dear future me..."
  rows={6}
  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50
             text-stone-800 placeholder:text-stone-400 font-serif
             focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
             transition-shadow resize-none"
/>
```

**The problem:** The `<textarea>` has no `maxLength` attribute. A user can paste an arbitrarily large block of text — a novel chapter, a 3MB essay, a base64-encoded image. When submitted, this text enters React state (fine), gets saved to localStorage (not fine — localStorage has a ~5–10MB limit per origin), and will fail silently (as documented in the first HIGH finding). The user writes a long letter, hits submit, sees it appear, and loses it on the next page load.

Contrast this with the recipient field, which *does* have `maxLength={60}` (`LetterForm.tsx:86`). The inconsistency makes this feel like an oversight rather than an intentional choice.

**Real-world consequence:** A user using the app as a journal writes several paragraphs (or pastes a long document), and it silently fails to persist. Combined with the silent save failure, this produces the worst user experience: "I wrote a lot and the app ate it."

**Fix:**
1. **Immediate:** Add a reasonable `maxLength` to the textarea (e.g., `maxLength={10000}` for ~10KB of text, which is about 1,500 words — plenty for a letter). This prevents the quota edge case for 99% of usage.
2. **Better:** Combine with the save-error feedback from the first HIGH finding so that even if a user hits the limit, they know *why* their letter wasn't saved.
3. **Best (v2):** Estimate the JSON size before save: `new Blob([JSON.stringify(letters)]).size`. If it exceeds a threshold (say 3MB out of the 5MB quota), show a warning before the user even submits the form.

---

### [MEDIUM] No ESC key to close the compose modal

**Where:** `src/components/LetterForm.tsx:58-64`

```tsx
// src/components/LetterForm.tsx:58-64
<div
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose()
  }}
>
```

**The problem:** The modal can be closed by clicking the backdrop or the X button, but pressing the Escape key does nothing. This violates a well-established web convention — modal dialogs should close on ESC. Keyboard-only users and power users (who reach for ESC instinctively) have no way to dismiss the modal without using the mouse.

**Real-world consequence:** A keyboard-heavy user opens the compose modal, changes their mind, and has to reach for the mouse to close it — or worse, a screen reader user has no straightforward dismissal mechanism (the backdrop click target is not keyboard-focusable).

**Fix:** Add a `keydown` event listener in a `useEffect`:
```tsx
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [onClose])
```
This is the standard pattern for ESC-to-close. The cleanup removes the listener when the modal unmounts.

---

### [MEDIUM] Delete button has no accessible label (icon-only button)

**Where:** `src/components/LetterCard.tsx:113-124`

```tsx
<button
  onClick={handleDeleteClick}
  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ...`}
>
  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
  {confirmDelete ? 'Confirm delete' : 'Delete'}
</button>
```

**The problem:** The button does have visible text ("Delete" / "Confirm delete"), which is good — it's not a purely icon-only button. However, the icon itself (`<Trash2>`) has no accessible label. In this case, since the button already has visible text, the icon is decorative. Screen readers will announce the button text. This is actually *mostly fine* for this specific case.

However, there's a subtler issue: when `confirmDelete` is `false`, the button says "Delete" and looks like a subtle grey link. There's no `aria-describedby` or `aria-live` region to announce the state change ("Delete" → "Confirm delete") to screen readers, and the visual change (grey → rose) is color-only — users with color vision deficiency or using screen readers miss the urgency change entirely.

**Real-world consequence:** A screen reader user hears "Delete button." They click it. The button now says "Confirm delete" but the screen reader might not re-announce it (depends on the reader's live-region handling). The user might not realize they need to click again, or might accidentally click twice without understanding the confirmation step.

**Fix:**
1. Add `aria-label={confirmDelete ? 'Confirm delete this letter' : 'Delete this letter'}` to the button.
2. Wrap the state change in a live region: `<span aria-live="polite" className="sr-only">{confirmDelete ? 'Click again to confirm deletion' : ''}</span>`.
3. The 3-second auto-reset timer should also be announced.

---

### [LOW] Color-only cues for locked/unlocked state

**Where:** `src/components/LetterCard.tsx:46-50,55-58`

```tsx
// src/components/LetterCard.tsx:46-50
className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 ${
  unlocked
    ? 'bg-white border-stone-100'
    : 'bg-stone-50/80 border-stone-200/60 saturate-[0.85]'
}`}
```

```tsx
// src/components/LetterCard.tsx:55-58
className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
  unlocked ? 'bg-amber-100' : 'bg-stone-200'
}`}
```

**The problem:** The visual difference between a locked and unlocked card is primarily color: unlocked cards are bright white with amber accents; locked cards are grey-tinted with reduced saturation. A user with color vision deficiency (deuteranopia, protanopia) or a user on a high-contrast mode might not perceive the difference. There's also the icon swap (Mail vs MailOpen) and the presence/absence of the Lock icon, which help, but the overall card appearance relies on color.

**Real-world consequence:** A color-blind user might not immediately see which letters are unlocked vs locked when scanning the grid. They'd need to read each card's text content to determine its state.

**Fix:** Add a non-color differentiator — e.g., a subtle "Sealed" badge on locked cards, or a "✓ Unlocked" label on unlocked cards, rendered as actual text that screen readers and color-blind users can perceive:
```tsx
{unlocked ? (
  <span className="text-xs text-amber-700 font-medium">Unlocked</span>
) : (
  <span className="text-xs text-stone-500 font-medium">Sealed</span>
)}
```

---

### [LOW] Every-second re-render of all LetterCards

**Where:** `src/App.tsx:60-67`

```tsx
{sortedLetters.map((letter) => (
  <LetterCard
    key={letter.id}
    letter={letter}
    now={now}
    onDelete={removeLetter}
  />
))}
```

**The problem:** `now` is passed as a prop to every `LetterCard`. Since `now` changes every second (from `useCountdown`), every `LetterCard` re-renders every second. For a small number of cards (dozens), this is completely fine — React's reconciliation is fast, and the actual DOM updates are minimal (just countdown digits and the occasional unlock transition).

**Real-world consequence:** At 50 cards, every-second re-renders of the full list might be noticeable on low-end devices (older phones, budget laptops). At 500 cards, it would be sluggish.

**Fix:** This is a "don't optimize prematurely" situation for the current scale. When the app supports many letters, wrap `LetterCard` in `React.memo()` with a custom comparison that only re-renders when `letter.id` changes or the unlock state transitions:
```tsx
const MemoizedLetterCard = React.memo(LetterCard, (prev, next) => {
  // Re-render if the unlock state might change
  return (
    prev.letter.id === next.letter.id &&
    isUnlocked(prev.letter.unlockDate, prev.now) === isUnlocked(next.letter.unlockDate, next.now)
  )
})
```
This would skip re-renders for cards where the second-by-second tick doesn't affect their state. But for now, the straightforward approach is fine.

---

### [LOW] Letter content and recipient lack input sanitization for control characters

**Where:** `src/components/LetterForm.tsx:43-49`

```ts
const letter: Letter = {
  id: crypto.randomUUID(),
  recipient: recipient.trim(),
  content: content.trim(),
  unlockDate: new Date(unlockDate).toISOString(),
  createdAt: new Date().toISOString(),
}
```

**The problem:** The inputs are `.trim()`'d but not sanitized for control characters (null bytes, bidirectional text markers, zero-width characters). A user could paste text containing invisible Unicode characters that cause rendering anomalies or, in the case of bidirectional text markers, alter the visual order of the card's layout.

**Real-world consequence:** Very low in a personal-use app. If someone pastes text with right-to-left override characters, the recipient name might display backwards. This is a niche edge case.

**Fix:** A `.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '')` on both fields during form submission would strip invisible control characters. This is polish, not urgent.

---

## Prioritized Fix List

Here's where to start, in order of importance:

1. **Surface save errors to the user** (HIGH, section 1)
   - `saveLetters` should return success/failure. `useLetters` should track an error state. `App.tsx` should show a dismissible banner: "Couldn't save your letters. Your browser storage may be full." This single fix stops silent data loss and makes the unbounded-input problem visible when it happens.

2. **Add maxLength to the content textarea** (HIGH, section 5)
   - `maxLength={10000}` on the `<textarea>` in `LetterForm.tsx`. One attribute, immediate protection against the common "paste a huge document" case. Pair with character count display like the recipient field already has.

3. **Add ESC-to-close on the compose modal** (MEDIUM, section 5)
   - A `keydown` event listener in a `useEffect` with proper cleanup. Three lines of logic for a big usability win.

4. **Detect and announce unavailable storage** (MEDIUM, section 1)
   - On app boot, test whether localStorage is writable. If not, show a persistent banner: "Storage is unavailable — letters won't be saved." Turns a silent failure into informed consent.

5. **Add accessible labels and a live region to the delete button** (MEDIUM, section 5)
   - `aria-label` on the delete button. A visually-hidden live region announcing the confirmation state change. Makes the two-step delete work for screen readers.

Everything else (timezone display, schema validation on load, color-free state cues, memoization, control character stripping) is worth doing but lower urgency — they affect edge cases or polish, not core functionality.
