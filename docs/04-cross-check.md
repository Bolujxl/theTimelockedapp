# Cross-Check Audit: Claude Code vs. Antigravity

## Methodology note

This audit was conducted **blind first**. I read every file in `src/` (all components, hooks, lib, and types) and formed my own findings before opening `docs/03-audit.md`. Only after my independent verdicts were locked in did I compare them against Antigravity's report. This document is the result of that comparison. The two reviews are genuinely independent; any agreement is convergence, not copying.

---

## Summary tally

| Category | Count |
|----------|-------|
| Agreement (including matching OK/OK verdicts) | 12 |
| Severity mismatch | 4 |
| Antigravity-only catches | 6 |
| Claude Code-only catches | 5 |
| Contested (genuine disagreement) | 0 |

There are no contested points — every disagreement resolved cleanly against the actual code. All four severity mismatches went in Antigravity's favour. Antigravity was stronger on UX and accessibility surface area; Claude Code picked up more infrastructure edge cases. Both independently flagged the two most important findings (silent save failure and unbounded textarea), which validates both passes as real independent reviews.

---

## localStorage Edge Cases (headline section)

### Silent save failure — QuotaExceededError and private mode

**Antigravity said:** HIGH — `saveLetters` swallows all write exceptions and only logs to console; user's letter appears on screen but is gone on next reload.

**Claude Code (independent):** HIGH — same finding, same reasoning.

**Classification:** AGREEMENT

**Evidence:**
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

**Verdict:** Both audits agree and are right. The `void` return type and `console.warn`-only catch mean the save failure is completely invisible to the user. React state holds the letter, the UI shows it, and the user closes the tab confident it was saved. On next visit, it's gone. This is the highest-priority fix in the codebase — it breaks the app's core contract. Fix: return `boolean` from `saveLetters`; track `saveError` state in `useLetters`; surface a banner in `App.tsx`.

---

### localStorage unavailable — silent ephemeral mode

**Antigravity said:** MEDIUM — in private browsing / sandboxed iframes, `localStorage` access itself can throw; the `try/catch` in `loadLetters` catches it and returns `[]`, so the app boots clean but is silently operating in throw-away mode.

**Claude Code (independent):** MEDIUM — same finding.

**Classification:** AGREEMENT

**Evidence:**
```ts
// src/lib/storage.ts:5-15
export function loadLetters(): Letter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)  // can throw SecurityError
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

**Verdict:** Both agree. The graceful fallback to `[]` is correct — the app stays alive. The problem is that the user has no idea their letters won't persist. Fix: on boot, attempt a test write/read cycle (`localStorage.setItem(testKey, '1'); localStorage.removeItem(testKey)`); if it throws, show a persistent "storage unavailable — letters won't be saved" banner.

---

### Corrupted JSON handling

**Antigravity said:** OK/BY-DESIGN — three-layer defence (null check → `!Array.isArray` → `catch`) is solid. No fix needed.

**Claude Code (independent):** LOW — handled by try/catch, but silently returns `[]` with no user notification; data loss without explanation.

**Classification:** SEVERITY MISMATCH — Antigravity correct.

**Evidence:**
```ts
// src/lib/storage.ts:9-15
const parsed = JSON.parse(raw)     // throws on corrupt JSON → caught below
if (!Array.isArray(parsed)) return []
return parsed as Letter[]
} catch (err) {
  console.warn('Failed to load letters from localStorage:', err)
  return []
}
```

**Verdict:** Antigravity is right. Corrupted JSON is not a scenario the app caused — it's an external event (disk error, manual tampering, another app writing to the same key). The correct response is to start fresh, which is exactly what happens. Demanding user notification for unrecoverable corruption would be noise. My LOW rating was too harsh; the three-layer defence is good design and deserves OK/BY-DESIGN. I concede this point.

---

### No per-field schema validation on loaded letters

**Antigravity said:** LOW — `as Letter[]` cast trusts the shape; missing/wrong-typed fields would render as blank UI rather than crash; only a real risk if the schema changes without bumping the version key.

**Claude Code (independent):** MEDIUM — `new Date(undefined)` when `unlockDate` is missing produces `Invalid Date`; downstream in `isUnlocked` that evaluates `Invalid Date <= now` → `false` (letter appears permanently locked); in `formatTimeRemaining` it yields `NaN` in all computed values, which `Pad` would render as `NaN`.

**Classification:** SEVERITY MISMATCH — Antigravity correct.

**Evidence:**
```ts
// src/lib/storage.ts:11
return parsed as Letter[]  // no per-field checks
```
```ts
// src/lib/time.ts:3-5
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now  // new Date(undefined) → Invalid Date → false
}
```

**Verdict:** My concern about `Invalid Date` propagation is technically valid, but Antigravity's framing is more calibrated. The corruption scenario that produces `undefined` fields requires either deliberate devtools tampering or a schema migration, neither of which is a live user path in a v1 single-version app. The consequence is blank/broken cards, not a crash or data loss. LOW is the right severity. I also mis-rated this relative to the actual harm — a broken card display is not as dangerous as a silent save failure. Concede to LOW.

---

### Version key has no migration runtime enforcement

**Antigravity said:** LOW — `'time-locked-letters:v1'` signals intent but has no migration logic; if the schema changes without bumping the key, old data gets silently misread.

**Claude Code (independent):** Folded into the schema validation finding above — not flagged as a distinct concern.

**Classification:** ANTIGRAVITY-ONLY — separate real concern.

**Evidence:**
```ts
// src/lib/storage.ts:3
const STORAGE_KEY = 'time-locked-letters:v1'
// no VERSION_KEY, no migration function, no version check anywhere
```

**Verdict:** Antigravity is right that this is a separate concern from field-level validation. The `:v1` suffix is a comment, not a guard — there is no code that reads it, no migration infrastructure if v2 ever ships. The risk is theoretical today (nothing has changed), but the moment a field is renamed or added, users updating mid-session lose their data silently. LOW is the right severity for a v1 app, and the finding is legitimate. I should have separated this from the schema validation concern.

---

## Clock and Time

### Clock tampering — bypass unlock dates

**Antigravity said:** LIMITATION — the app uses `new Date()` as sole time authority; advancing the system clock immediately unlocks letters; this is an architectural constraint of browser-only apps, not a fixable bug.

**Claude Code (independent):** OK-BY-DESIGN — same conclusion.

**Classification:** AGREEMENT (different label words; identical substance)

**Evidence:**
```ts
// src/hooks/useCountdown.ts:4,8
const [now, setNow] = useState(() => new Date())
setNow(new Date())  // fires every 1000ms

// src/lib/time.ts:3-5
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}
```

**Verdict:** Both audits agree this is not a bug. The app is a promise-to-yourself tool, not a cryptographic enforcement mechanism. Any client-only time-gated app has this property. The appropriate response is a UI disclaimer, not a server-side time check that doesn't exist in this architecture.

---

### `isUnlocked` uses `<=` at the boundary moment

**Antigravity said:** OK — `<=` means the letter unlocks at the exact tick where `now` reaches the unlock time; no off-by-one.

**Claude Code (independent):** OK — same verdict.

**Classification:** AGREEMENT

**Verdict:** Both agree. The `<=` boundary is correct for this use case: "unlock at or after the moment arrives." No fix needed.

---

### Two letters with the same unlock time

**Antigravity said:** OK — `key={letter.id}` uses `crypto.randomUUID()`, unique regardless of unlock time; sort order is deterministic by array position.

**Claude Code (independent):** OK — same verdict.

**Classification:** AGREEMENT

**Verdict:** Both agree. UUID keys decouple identity from content and timing completely.

---

### Negative countdown guard

**Antigravity said:** OK — the `totalSeconds <= 0` guard in `formatTimeRemaining` prevents negative display; in practice the `Countdown` component is only rendered when `unlocked === false`, so the guard is a safety net more than an active codepath.

**Claude Code (independent):** OK — same verdict.

**Classification:** AGREEMENT

**Verdict:** Both agree. The guard is correct and the conditional rendering in `LetterCard` makes the guard's active window effectively zero in normal operation.

---

### Timezone display confusion when user travels

**Antigravity said:** MEDIUM — the letter stores the correct UTC timestamp (`new Date(unlockDate).toISOString()`), but `formatUnlockDate` calls `toLocaleDateString` with the *current* device timezone; a user who sets a letter in Lagos (UTC+1) and opens the app in New York (UTC-5) sees "2:00 AM" instead of the "8:00 AM" they intended, even though the unlock fires at the correct absolute moment.

**Claude Code (independent):** Examined the `futureMin()` calculation and the `new Date(unlockDate).toISOString()` conversion; concluded the timezone handling was technically correct. Did not flag the display confusion.

**Classification:** ANTIGRAVITY-ONLY — real; I concede.

**Evidence:**
```ts
// src/lib/time.ts:30-38
export function formatUnlockDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    // no timeZoneName here — display shifts with current locale
  })
}
```
```ts
// src/components/LetterForm.tsx:47
unlockDate: new Date(unlockDate).toISOString(),  // stored correctly as UTC
```

**Verdict:** Antigravity is right. I was evaluating whether the storage was correct (it is), but the real user-facing issue is that the *display* shifts when the device timezone changes. A user who wrote "unlocks at 8:00 AM on my birthday" and travels across timezones sees a different local time on the card, which is confusing even though the underlying unlock moment is unchanged. MEDIUM is fair. Fix: add `timeZoneName: 'short'` to `formatUnlockDate` so the display at least signals which timezone's 8:00 AM it means.

---

### DST spring-forward gap in unlock datetime

**Antigravity said:** Not flagged.

**Claude Code (independent):** LOW — if a user picks an unlock time in the "spring forward" gap (e.g., 2:30 AM on US DST transition night when 2:00–3:00 AM doesn't exist), `new Date("2024-03-10T02:30")` behaviour is implementation-defined; some browsers snap to 3:30 AM, others to 1:30 AM.

**Classification:** CLAUDE-CODE-ONLY — real but very narrow.

**Evidence:**
```ts
// src/components/LetterForm.tsx:47
unlockDate: new Date(unlockDate).toISOString()
// datetime-local value "2024-03-10T02:30" in a US browser on spring-forward night
// → ambiguous; browser-dependent whether it resolves to 01:30 or 03:30 UTC
```

**Verdict:** This is a real edge case. The `datetime-local` input does not prevent selecting times in the DST gap, and `new Date()` handles such strings differently across browsers and OS timezone databases. In practice it affects a tiny fraction of users (those who deliberately pick a time in the 1–2 hour gap on exactly two calendar days per year). The consequence is an unlock time up to 1 hour off the intended moment — annoying but not data-destroying. LOW is the right severity, and it's real enough to mention.

---

## Security and XSS

### XSS — React escaping used throughout

**Antigravity said:** OK — all user text rendered via `{value}` JSX interpolation; grep for `dangerouslySetInnerHTML`, `innerHTML`, `__html`, `eval` returned zero results.

**Claude Code (independent):** OK — same finding, same grep.

**Classification:** AGREEMENT

**Evidence:**
```tsx
// src/components/LetterCard.tsx:72
<h3 className="font-serif text-lg text-stone-800 truncate">
  {letter.recipient}
</h3>

// src/components/LetterCard.tsx:89
<p className="font-serif text-stone-700 leading-relaxed whitespace-pre-wrap break-words">
  {letter.content}
</p>
```

**Verdict:** Both agree. No XSS surface. React's default escaping makes both fields safe even if a user pastes `<script>` tags. No fix needed.

---

### No dynamic attribute injection

**Antigravity said:** OK — user content never appears as an `href`, `src`, `style`, or event handler attribute.

**Claude Code (independent):** OK — same verdict.

**Classification:** AGREEMENT

**Verdict:** Both agree. User text is strictly text content, never attribute values. The `javascript:` href attack vector is irrelevant here.

---

### Plaintext letters in localStorage — "locked" is UX, not crypto

**Antigravity said:** LIMITATION — the DOM correctly omits content for locked cards, but localStorage holds all letters as plaintext JSON; devtools access bypasses the lock entirely.

**Claude Code (independent):** OK/BY-DESIGN — same conclusion; noted the code comment at `LetterCard.tsx:97` confirms this is intentional.

**Classification:** AGREEMENT (different label; identical substance)

**Evidence:**
```tsx
// src/components/LetterCard.tsx:97 — comment is self-aware
{/* Locked card — content NOT in DOM */}
```
```ts
// src/lib/storage.ts:20
localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))  // all letters, plaintext
```

**Verdict:** Both agree. The DOM-level privacy is intentional and correctly implemented. The localStorage plaintext is a fundamental constraint of a client-only app; encryption requires a user-held password and is a v2 concern. The code comment shows the author already understood this tradeoff. No bug.

---

### Control character sanitization

**Antigravity said:** LOW — inputs are `.trim()`'d but not sanitized for null bytes, zero-width characters, or bidirectional text override markers (e.g., `‮`); the latter can reverse the visual rendering direction of text.

**Claude Code (independent):** Not flagged.

**Classification:** ANTIGRAVITY-ONLY — real.

**Evidence:**
```ts
// src/components/LetterForm.tsx:45-46
recipient: recipient.trim(),
content: content.trim(),
// no Unicode control character stripping
```

**Verdict:** Antigravity is right. Bidirectional override characters (`‮`, `‭`, `‬`) are a real rendering concern — they can make recipient names display backwards or scrambled. Zero-width joiners and null bytes are less visually harmful but still worth stripping. LOW severity is appropriate: this is not a security vulnerability in a single-user local app, but it's a real rendering bug for edge-case input. A single `.replace(/[ --​-‏ - ﻿]/g, '')` on form submit would close it.

---

## Principle Adherence

### Derived state upheld throughout

**Antigravity said:** OK — `Letter` type has no derived fields; `unlocked` is computed per render; `sortedLetters` uses `useMemo`; countdown values computed on each call to `formatTimeRemaining`.

**Claude Code (independent):** OK — same verdict.

**Classification:** AGREEMENT

**Verdict:** Both agree. The codebase is clean on this principle. No cached-that-should-be-computed state anywhere.

---

### Effect dependency arrays all correct

**Antigravity said:** OK — audited every `useEffect` and `useCallback`; all dependency arrays match actual usage.

**Claude Code (independent):** OK — same verdict.

**Classification:** AGREEMENT

**Verdict:** Both agree. The table in Antigravity's doc covers every hook precisely. No stale closure, no missing dep, no unnecessary dep causing runaway re-execution.

---

### Separation of concerns — no storage in components

**Antigravity said:** OK — `localStorage` only in `storage.ts`; `loadLetters`/`saveLetters` only called from `useLetters`; no component imports from `lib/storage`.

**Claude Code (independent):** OK — same verdict.

**Classification:** AGREEMENT

**Verdict:** Both agree. The layer boundaries (component → hook → lib → browser) are clean throughout.

---

### `useLetters` redundant mount write

**Antigravity said:** Not flagged.

**Claude Code (independent):** LOW — the `useEffect([letters])` fires immediately after mount with the data that was just loaded from localStorage, writing it straight back.

**Classification:** CLAUDE-CODE-ONLY — real but benign.

**Evidence:**
```ts
// src/hooks/useLetters.ts:6-10
const [letters, setLetters] = useState<Letter[]>(() => loadLetters())

useEffect(() => {
  saveLetters(letters)  // fires on mount with the data just read from localStorage
}, [letters])
```

**Verdict:** The redundant write is real — on every app load, the letters array is read from storage and then immediately written back unchanged. It's benign: no data loss, no corruption, no user impact. The cost is one extra `JSON.stringify` + `setItem` call per page load. Worth noting because it slightly amplifies the quota pressure (the write could fail, triggering the save-error path even though no data changed), but in practice the quota-safe round-trip has no consequence. LOW is appropriate; it doesn't rise to a fix priority given the other open issues.

---

### Multi-tab data loss — no `storage` event listener

**Antigravity said:** Not flagged.

**Claude Code (independent):** LOW–MEDIUM — two tabs open simultaneously; Tab B's React state is initialized from localStorage at mount and never updated again; when Tab B writes on its next state change, it overwrites Tab A's newer data with its own stale copy.

**Classification:** CLAUDE-CODE-ONLY — real.

**Evidence:**
```ts
// src/hooks/useLetters.ts:6-10
// Tab B loads letters at mount (snapshot), adds a letter, writes back —
// but it never heard about Tab A's add, so Tab A's letter is silently dropped.
const [letters, setLetters] = useState<Letter[]>(() => loadLetters())

useEffect(() => {
  saveLetters(letters)   // overwrites; no merge with what's in storage now
}, [letters])
// missing: window.addEventListener('storage', ...) to sync across tabs
```

**Verdict:** This is a real data loss scenario for multi-tab users. It's not theoretical: open the app in two tabs, write a letter in Tab A, then write a letter in Tab B — Tab B's write overwrites Tab A's letter because Tab B's state snapshot predates Tab A's write. The fix is a `window.addEventListener('storage', ...)` handler in `useLetters` that re-syncs state when another tab writes to the storage key. LOW–MEDIUM severity: multi-tab usage is uncommon for a personal letter app, but the data loss is silent and complete for that case.

---

## Accessibility

### No ESC key to close the compose modal

**Antigravity said:** MEDIUM — modal closes on backdrop click and X button but not on `Escape`; violates established web convention; keyboard-only users have no non-mouse dismissal path.

**Claude Code (independent):** Flagged modal a11y as MEDIUM (no `role="dialog"`, no `aria-modal`, no focus trap) but missed the ESC key specifically.

**Classification:** ANTIGRAVITY-ONLY — real; I concede the specific finding.

**Evidence:**
```tsx
// src/components/LetterForm.tsx:58-64
<div
  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose()
  }}
  // no onKeyDown, no useEffect for document keydown listener
>
```

**Verdict:** Antigravity is right. ESC-to-close is the universal modal contract. The backdrop `onClick` is also mouse-only — keyboard users can't focus the backdrop to trigger it. I caught the structural a11y gap (`role`, `aria-modal`, focus trap) but missed this specific, user-facing failure mode. Antigravity's finding is more actionable. Fix: `document.addEventListener('keydown', e => { if (e.key === 'Escape') onClose() })` in a `useEffect` with cleanup.

---

### Delete confirm — aria-live for state change

**Antigravity said:** MEDIUM — when `confirmDelete` flips `true`, the button text changes from "Delete" to "Confirm delete" and turns rose-coloured; the colour change is colour-only; a screen reader may not re-announce the button text change because there's no `aria-live` region.

**Claude Code (independent):** LOW — flagged the confirm pattern as having a tight 3-second window but focused on the timer race rather than the a11y gap.

**Classification:** SEVERITY MISMATCH — Antigravity correct.

**Evidence:**
```tsx
// src/components/LetterCard.tsx:113-124
<button
  onClick={handleDeleteClick}
  className={`... ${
    confirmDelete
      ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
      : 'text-stone-400 hover:text-rose-500 hover:bg-rose-50'
  }`}
>
  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
  {confirmDelete ? 'Confirm delete' : 'Delete'}
  {/* no aria-live, no aria-label, colour change is only non-text cue */}
</button>
```

**Verdict:** Antigravity's MEDIUM rating is correct. A screen reader user who clicks "Delete" and hears no announcement of the state change may click again thinking nothing happened — and accidentally confirm a deletion. Or they may never realise they need to click twice. The urgency shift (grey → rose) is colour-only, which also fails WCAG 1.4.1. My LOW was too relaxed. Fix: `aria-live="polite"` region announcing the confirmation prompt; `aria-label` on the button reflecting current state.

---

### Color-only cues for locked vs. unlocked card state

**Antigravity said:** LOW — unlocked cards are bright white with amber accents; locked cards are grey-tinted with reduced saturation; a colour-blind user may not perceive the difference; icon swap (Mail ↔ MailOpen) and Lock icon help but don't fully substitute.

**Claude Code (independent):** Not flagged — focused on structural a11y (modal role/aria) rather than visual differentiation.

**Classification:** ANTIGRAVITY-ONLY — real; I concede.

**Evidence:**
```tsx
// src/components/LetterCard.tsx:46-50
className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 ${
  unlocked
    ? 'bg-white border-stone-100'
    : 'bg-stone-50/80 border-stone-200/60 saturate-[0.85]'  // saturation as lock cue
}`}
```

**Verdict:** Antigravity is right. `saturate-[0.85]` is a subtle cue that fails entirely for users with monochromacy or on e-ink displays. The Mail/MailOpen icon swap and the Lock icon are non-colour differentiators, which is good — they partially mitigate the issue. But a visible text badge ("Sealed" / "Unlocked") on each card would make the state unambiguous at a glance for all users. LOW is the right severity; the icon cues prevent this from being a complete failure, but it's still a real gap.

---

### Form error message not in `aria-live` region

**Antigravity said:** Not flagged.

**Claude Code (independent):** LOW — the validation error `{error && <p>Please fill all fields...</p>}` is a plain `p` element; screen readers won't announce it when it appears.

**Classification:** CLAUDE-CODE-ONLY — real.

**Evidence:**
```tsx
// src/components/LetterForm.tsx:133-136
{error && (
  <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">
    {error}
  </p>
  // no aria-live, no role="alert"
)}
```

**Verdict:** Real LOW finding. A screen reader user submitting an incomplete form will hear no feedback — the error appears visually but is never announced. Fix: `role="alert"` on the `p` tag (or wrap it in `aria-live="assertive"`). One attribute change.

---

### Countdown labels not screen-reader-friendly

**Antigravity said:** Not flagged.

**Claude Code (independent):** LOW — the countdown renders as `<span>00</span><span>d</span>` etc.; a screen reader reads this as "zero zero d zero zero h zero zero m zero zero s" with no semantic context.

**Classification:** CLAUDE-CODE-ONLY — real.

**Evidence:**
```tsx
// src/components/Countdown.tsx:20-47
<div className="flex items-center gap-3 text-stone-500 font-mono text-sm tracking-wide">
  <div className="flex items-baseline gap-0.5">
    <span className="text-stone-700 font-semibold"><Pad value={days} /></span>
    <span className="text-xs">d</span>   {/* "d" is not announced as "days" */}
  </div>
  ...
```

**Verdict:** Real LOW finding. "00 d 00 h 00 m 00 s" is semantically meaningless to a screen reader. Fix: `aria-label` on the container (`aria-label={`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds remaining`}`), paired with `aria-hidden="true"` on all the visual child spans so the display elements don't get double-read. Two attributes.

---

## Performance

### Every-second re-render of all LetterCards

**Antigravity said:** LOW — `now` prop changes every second, causing all `LetterCard` and `Countdown` components to re-render; acceptable at small scale; `React.memo` with a custom comparator is the eventual fix.

**Claude Code (independent):** LOW — same finding, same severity.

**Classification:** AGREEMENT

**Evidence:**
```tsx
// src/App.tsx:60-67
{sortedLetters.map((letter) => (
  <LetterCard
    key={letter.id}
    letter={letter}
    now={now}        // new Date() every second
    onDelete={removeLetter}
  />
))}
```

**Verdict:** Both agree. The re-render cost is proportional to the letter count. For a personal app whose data is bounded by localStorage (~5MB), the upper bound is a few hundred letters at most — imperceptible in React's reconciler. `React.memo` with a comparator that only re-renders when `isUnlocked(letter.unlockDate, prev.now) !== isUnlocked(letter.unlockDate, next.now)` is the right eventual optimization, not an immediate fix.

---

## Input Validation

### Content textarea has no `maxLength`

**Antigravity said:** HIGH — the textarea accepts unbounded input; combined with the silent save failure, a user pasting a large document triggers the quota exception with no warning; the recipient field has `maxLength={60}` which makes this omission look like an oversight.

**Claude Code (independent):** MEDIUM — same root concern; did not escalate to HIGH.

**Classification:** SEVERITY MISMATCH — Antigravity correct.

**Evidence:**
```tsx
// src/components/LetterForm.tsx:102-111
<textarea
  value={content}
  onChange={(e) => setContent(e.target.value)}
  // no maxLength — contrast with recipient's maxLength={60} at line 86
  placeholder="Dear future me..."
  rows={6}
  className="..."
/>
```

**Verdict:** Antigravity's HIGH is correct. I underrated this because I was thinking about it in isolation. In combination with the silent save failure, the unbounded textarea creates the worst-case user experience: write a long letter, hit submit, see it appear, lose it on reload. The recipient field's existing `maxLength={60}` makes the omission on the larger and more critical field look like an oversight, not an intentional design decision. Fix: `maxLength={10000}` (approximately 1,500 words — enough for a letter, not enough to blow a 5MB quota) plus a character counter matching the recipient field's pattern.

---

## Overall Assessment

### Which audit was stronger and where

**Antigravity** was stronger on user-facing UX and accessibility issues: ESC key, colour-only state cues, timezone display confusion, the specific aria-live gap on the delete button, and the distinction between schema validation and version-key migration. It also correctly escalated the `maxLength` omission to HIGH by reasoning about the compound risk.

**Claude Code** was stronger on infrastructure edge cases: multi-tab write collision, the redundant mount write, the DST spring-forward gap, the form error aria-live gap, and the countdown screen-reader problem. These are all real findings that Antigravity missed.

The severity mismatches all went Antigravity's way (4 of 4). Antigravity's calibration was better — it correctly marked corrupted-JSON handling as OK/BY-DESIGN (I over-penalised solid defensive code), correctly kept schema validation at LOW (I over-elevated it to MEDIUM), and correctly escalated the textarea omission to HIGH.

### Most important finding either tool surfaced

**Silent save failure** (storage.ts:18-24, finding #1) — flagged HIGH by both audits. A user's letter appears in the UI but is gone on the next page load, with zero indication anything went wrong. This is the one finding that breaks the app's entire value proposition and should be fixed before anything else. The fix is small: return `boolean` from `saveLetters`, track a `saveError` state in `useLetters`, show a banner.

### Single fix to ship first

```ts
// src/lib/storage.ts — change void to boolean
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

Then in `useLetters.ts`, expose `saveError: boolean` and wire a banner in `App.tsx`. One function signature change, one state variable, one banner component — and the app stops silently losing user data.
