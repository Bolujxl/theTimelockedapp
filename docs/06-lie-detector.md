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

## My Guess (engineer fills this in)
- Lie is claim #: ____
- My reasoning: ____
- The line that proves it: ____

## Cross-Check (LEAVE BLANK — do not fill until I ask)
<!-- LLM: do not write anything here until I explicitly say "cross-check now". -->
