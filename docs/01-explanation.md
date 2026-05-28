# Time-Locked Letters — A Line-by-Line Walkthrough

This document walks through every file in the `src/` folder of the Time-Locked Letters app. It's written for someone who's curious about how a real React app works, even if you're brand new to programming. We'll go file by file, in the order the code actually runs — starting where React first wakes up and ending where everything gets glued together.

Read it from top to bottom like a story. Every code snippet is followed by a plain-English explanation. If something doesn't click, keep going — the later sections often make the earlier ones clearer.

---

## `src/main.tsx` — React's Front Door

**What this file's job is:** It's the very first piece of our code that runs. It tells React "go paint yourself into that `<div>` in the HTML page, and while you're at it, start the whole app."

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
```

These are **imports** — like opening a toolbox and taking out just the tools we need.

- `StrictMode` is a helper from React that double-checks our work during development (it runs some things twice on purpose to catch mistakes). In production — when real people use the app — it does nothing.
- `createRoot` is the tool that attaches React to the HTML page.
- `'./index.css'` is our global stylesheet. Importing it here makes sure Tailwind and our custom CSS load before anything paints on screen.
- `App` is the main component — the thing that holds all the other things. Think of it as the box that contains every other box.

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>, 
)
```

`document.getElementById('root')` reaches into the HTML page and grabs the `<div id="root"></div>` that's sitting in `index.html`. The `!` at the end tells TypeScript "I promise this element exists, don't worry about it being missing."

`createRoot(...)` turns that empty `<div>` into a React **root** — a special container that knows how to grow a React tree inside it.

`.render(...)` says "here's what goes inside." We pass it an HTML-like tag called JSX:

```tsx
<StrictMode>
  <App />
</StrictMode>
```

`<App />` is our entire application, wrapped in `<StrictMode>` for safety. From this one line, React will build out the whole interface — the header, the letter cards, the form, everything.

**A real-world dev note:** You'll see `StrictMode` in almost every new React project. It's like training wheels that yell at you when you're doing something sloppy — it catches side-effects that run when they shouldn't, old APIs that are going away, and other gotchas. It doesn't slow down your app; it only runs in development mode.

---

## `src/types.ts` — The Shape of a Letter

**What this file's job is:** It defines what a "letter" looks like in our code — its name, its parts, and what type of thing each part is. Think of it as the blueprint for every letter we'll ever create.

```tsx
export type Letter = {
  id: string;
  recipient: string;
  content: string;
  unlockDate: string;
  createdAt: string;
};
```

`export` means "other files can use this." Without it, this type would stay locked inside this file and nobody else could see it.

`type Letter = { ... }` creates a **type alias** — a nickname for a specific shape of object. Whenever we say `Letter` anywhere in our code, TypeScript knows we mean an object that has exactly these five properties, nothing more, nothing less.

Let's look at each property:

| Property | Type | What it holds | Example |
|---|---|---|---|
| `id` | `string` | A unique fingerprint for this letter, generated once and never changed | `"a1b2c3d4-..."` |
| `recipient` | `string` | Who the letter is addressed to | `"Future Me"` |
| `content` | `string` | The actual message — could be one word or many paragraphs | `"Dear future me, I hope you..."` |
| `unlockDate` | `string` | The date and time when the letter becomes readable, stored as an ISO string | `"2026-12-25T08:00:00.000Z"` |
| `createdAt` | `string` | When the letter was written, also an ISO string | `"2026-05-28T14:30:00.000Z"` |

**Why are the dates stored as `string` and not `Date`?** That's a great question and it trips up a lot of beginners. JavaScript's `Date` object is a tricky thing — it's a snapshot of a moment, but it can't be stored directly in localStorage (which only keeps text). So we write dates as text (ISO 8601 format like `"2026-12-25T08:00:00.000Z"`) and convert them back to `Date` objects only when we need to do math with them. More on that when we get to `lib/time.ts`.

**The `id` field uses `crypto.randomUUID()`** — a browser tool that generates strings like `"550e8400-e29b-41d4-a716-446655440000"`. These are mathematically guaranteed to be unique, even if a million people generated IDs at the exact same time. That's important because we use the `id` to tell letters apart when deleting one (you don't want to delete the wrong letter).

---

## `src/index.css` — Global Styles & Animations

**What this file's job is:** It sets up Tailwind CSS, defines the fonts and background color for the whole app, and creates two custom animations (the "reveal" when a letter unlocks, and the "pulse" on the lock icon).

```css
@import "tailwindcss";
```

This line pulls in all of Tailwind — thousands of utility classes like `bg-white`, `text-stone-800`, `rounded-2xl`, etc. Without this, none of the `className="..."` strings in our components would do anything.

```css
@theme {
  --font-serif: "Lora", Georgia, serif;
  --font-sans: ui-sans-serif, system-ui, -apple-system, sans-serif;
}
```

This is Tailwind v4's way of customizing the design tokens. We're telling Tailwind: "when someone uses `font-serif`, use the Lora font we loaded in `index.html`; if that doesn't work, fall back to Georgia, then any serif font the computer has." The `font-sans` line sets up a similar stack for the default text font.

The Lora font is loaded in `index.html` from Google Fonts. It's a warm, literary serif — it makes the letters feel like they're on paper.

```css
@layer base {
  body {
    @apply bg-[#FAF7F2] text-stone-800 font-sans;
  }
}
```

`@layer base` means "these are the ground-floor styles." Everything else builds on top.

`@apply` is a Tailwind shortcut that lets us use utility classes inside regular CSS. This line says: "make the whole page a warm cream color (`#FAF7F2`), use dark brown text (`text-stone-800`), and default to the sans-serif font stack." The `#FAF7F2` color is like aged paper — slightly warm off-white.

```css
@keyframes reveal {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-reveal {
  animation: reveal 600ms ease-out forwards;
}
```

This creates an animation called `reveal`. Here's what it does, frame by frame:

- **0% (start):** The element is invisible (`opacity: 0`) and sitting 12 pixels below where it should be (`translateY(12px)`).
- **100% (end):** The element is fully visible (`opacity: 1`) and in its natural position (`translateY(0)`).
- **600ms:** The whole thing takes just over half a second.
- **ease-out:** It starts fast and slows down at the end — like a letter gently landing on a desk.
- **forwards:** When the animation finishes, the element stays at its end position instead of snapping back.

We apply this animation to letters the moment they unlock, so it looks like the content fades up into view. A real-world dev would call this a "fade-in + slide-up entrance animation."

```css
@keyframes seal-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

.animate-seal {
  animation: seal-pulse 2s ease-in-out infinite;
}
```

This creates a gentle breathing effect for the lock icon on sealed letters:

- The icon starts at normal size.
- Halfway through (50%), it grows to 108% of its size (barely noticeable — like a heartbeat).
- Then it shrinks back.
- **2s** means one full breath takes two seconds.
- **ease-in-out** means it accelerates into the pulse and decelerates out of it — smooth in both directions.
- **infinite** means it loops forever (or until the letter unlocks and the lock disappears).

This animation gives a tiny bit of life to the locked letters — a subtle reminder that time is passing and the letter is waiting.

---

## `src/lib/storage.ts` — Saving Letters to the Browser's Notebook

**What this file's job is:** It reads and writes our list of letters to `localStorage` — a little notebook the browser keeps for each website, like a drawer that stays on the shelf even after you close the tab and walk away.

### The big idea: what is localStorage?

Imagine the browser gives every website a little notebook. You can write text in it, and that text survives:
- Refreshing the page
- Closing the tab
- Restarting the computer

It's not unlimited (usually about 5MB per website), and it can only store **text** — strings of characters. It cannot store objects, arrays, numbers, or dates directly. If you want to save a JavaScript object (like our list of letters), you have to turn it into a string first, and turn it back into an object when you read it out.

This is where `JSON.stringify()` and `JSON.parse()` come in. Think of them as translators:

- `JSON.stringify(letter)` → "Describe this object as a text sentence" (for storage).
- `JSON.parse(text)` → "Take this text sentence and rebuild the object from it" (for reading back).

```ts
import type { Letter } from '../types'
```

We import the `Letter` type so TypeScript knows what shape of data we're working with. The `type` keyword before `{ Letter }` is a TypeScript thing — it says "this is only a type, not a value that exists when the code runs." After compilation, this import disappears completely.

```ts
const STORAGE_KEY = 'time-locked-letters:v1'
```

This is the label we use to find our data in localStorage. It's like writing `"Timelocked Letters"` at the top of the notebook page so we know which page is ours.

The `:v1` part is a **version suffix** — a little trick experienced developers use. If one day we need to change how letters are stored (say, adding a `category` field), we can change the key to `:v2`, and the old data won't clash with the new format. Otherwise, the old data might crash our app because it doesn't have the new field.

```ts
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

Let's walk this line by line — this function runs once, when the app starts up, to load whatever letters were saved from last time.

#### `export function loadLetters(): Letter[]`
We export the function so other files (specifically `useLetters.ts`) can call it. The `: Letter[]` return type means "this function promises to give back an array of letters."

#### `try { ... } catch (err) { ... }`
This is a safety net. Everything inside `try` runs first. If anything inside it throws an error (crashes), the code inside `catch` runs instead. Without this, bad data in localStorage could crash our entire app before anything even paints on screen.

#### `const raw = localStorage.getItem(STORAGE_KEY)`
We ask the browser: "Do you have anything saved under the name `'time-locked-letters:v1'`?" The answer is either a string of text or `null` (nothing there).

#### `if (!raw) return []`
If `raw` is `null` or an empty string, we return an empty array `[]`. This handles the first time someone opens the app — there's nothing saved yet, so we start with an empty list. No crash, no error, just a clean start.

#### `const parsed = JSON.parse(raw)`
We take the stored text and try to turn it back into a JavaScript object. If the text is `"[{...},{...}]"`, `JSON.parse` turns it into an actual array.

#### `if (!Array.isArray(parsed)) return []`
A safety check. If someone tampered with localStorage (or a future version of our app wrote something weird), `parsed` might be an object or a number instead of an array. If so, we bail out with an empty list. This is defensive programming — "trust nothing from outside your own code."

> **Why would `parsed` not be an array?** Imagine you upgrade your app to `:v2`, and the `:v2` code stores a single object `{ letters: [...] }`. Then you downgrade to `:v1` — the `:v1` code expects an array but gets an object. Without this check, it would crash on the next line. With this check, it just starts fresh.

#### `return parsed as Letter[]`
We tell TypeScript "trust me, this is an array of letters." The `as` keyword is a **type assertion** — we're asserting that we've done our homework and the shape is right. TypeScript takes our word for it and lets us use `parsed` as a `Letter[]` from this point forward.

#### The `catch` block
```ts
catch (err) {
  console.warn('Failed to load letters from localStorage:', err)
  return []
}
```

If `JSON.parse` explodes (because the stored text isn't valid JSON — maybe it's corrupted, or was written by a different app, or the user edited it by hand), we catch the error, log a warning so developers can debug it, and return an empty array. **The app doesn't crash.** This is the most important principle here: *never let bad stored data take down your entire application*.

> **The beginner trap here:** If we didn't wrap this in `try/catch`, and the stored JSON was `"this is not json at all"`, then `JSON.parse` would throw an error. That error would bubble up to React, and the whole page would show a blank white screen with a console error. The `try/catch` says: "if the notebook is scribbled nonsense, just throw it away and start fresh."

---

```ts
export function saveLetters(letters: Letter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
  } catch (err) {
    console.warn('Failed to save letters to localStorage:', err)
  }
}
```

#### `export function saveLetters(letters: Letter[]): void`
This function takes an array of letters and saves them. The `: void` return type means "this function doesn't give anything back — it just does its job silently."

#### `localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))`
Two things happen here:
1. `JSON.stringify(letters)` turns our array of letter objects into one long text string.
2. `localStorage.setItem(...)` writes that string into the notebook under our key.

If the key already exists, it overwrites it. We're replacing the entire saved list with the new one.

**Why save the whole array every time instead of patching just the changed letter?** Good question. Patching would be faster for huge lists, but our list is small (probably a few dozen letters at most). The simplicity of "always save everything" is worth the trade-off — fewer bugs, less code, easier to reason about. A real-world dev would call this a "simplicity vs. performance" decision, and for a list of 100 items or fewer, simplicity wins every time.

#### The `catch` block
```ts
catch (err) {
  console.warn('Failed to save letters to localStorage:', err)
}
```

`localStorage.setItem` can fail if the storage is full (remember that ~5MB limit per website) or if the browser is in private/incognito mode and blocks storage. We catch the error, log a warning, and... that's it. The app keeps running, the letters stay in memory, they just won't survive a page refresh. Better than crashing the app.

**Why don't we show the user an error?** In this app, we chose to silently fail. A more mature app would show a notification like "Couldn't save your letters — your browser storage might be full." But for a Stage 1 version, silent failure with a developer log is a reasonable choice.

---

## `src/lib/time.ts` — Date Math: Unlocking, Counting Down, and Formatting

**What this file's job is:** It answers three questions about time: "Is this letter unlocked yet?", "How much time is left until it unlocks?", and "What does that date look like in words?".

This file uses a library called `date-fns` — a collection of pre-built date tools. Using a library for date math is a near-universal convention in real-world projects, because JavaScript's built-in `Date` object is famously painful to work with.

```ts
import { differenceInSeconds, differenceInDays } from 'date-fns'
```

We import two functions from date-fns:
- `differenceInSeconds(a, b)` — how many seconds are between two dates.
- `differenceInDays(a, b)` — how many calendar days are between two dates.

We only import what we use (called "tree-shaking"), so the final bundle doesn't include the entire date-fns library.

---

### `isUnlocked` — Is the letter ready to read?

```ts
export function isUnlocked(unlockDate: string, now: Date): boolean {
  return new Date(unlockDate) <= now
}
```

This is the simplest function in the codebase, but it's worth understanding deeply because dates are sneaky.

#### What it returns
A `boolean` — either `true` (the letter is unlocked, you can read it) or `false` (still locked, go away).

#### `new Date(unlockDate)`
Remember how we store dates as text strings? Before we can compare dates, we have to turn that text back into a JavaScript `Date` object. `new Date(unlockDate)` does exactly that.

For example, if `unlockDate` is `"2026-12-25T08:00:00.000Z"`, `new Date(...)` turns it into a `Date` object representing December 25, 2026 at 8:00 AM UTC.

> **Why can't we compare the text strings directly?** Try it: `"2026-12-25" > "2026-01-01"` is `false` in JavaScript, because strings are compared character by character, left to right. `"2"` comes before `"1"` when `"2026-12-25"` hits `"2026-01-01"` at position 5 (comparing `"1"` vs `"0"`)... actually, let me show a clearer example:
> 
> `"2026-12-25" > "2026-01-01"` → At position 5, `"1"` vs `"0"`. `"1"` > `"0"`, so the result is `true`. **But December 25 is after January 1!** The string comparison and the calendar comparison agree here, but only by accident — the string's year-month-day order happens to match calendar order. But if the strings had different lengths or formats, string comparison would lie to you.
>
> Moral: never compare dates as strings. Always convert to `Date` objects first, because `Date` objects compare as **numbers** — specifically, as milliseconds since January 1, 1970.

#### `<= now`
We compare the unlock date to `now` (the current time, passed in from the countdown hook). The `<=` means:

- If the unlock date is **before** now → `<` catches it → unlocked.
- If the unlock date is **exactly** now → `=` catches it → unlocked.
- If the unlock date is **after** now → false → still locked.

**The off-by-one gotcha:** What happens at the exact millisecond the clock strikes the unlock time? The letter unlocks. What about one millisecond before? Still locked. This is correct behavior — the user set a date and time, and at that exact moment (or any moment after), the letter opens.

**Why does `isUnlocked` take `now` as a parameter instead of calculating it inside the function?** Because the countdown hook (`useCountdown`) already has a ticking clock, and we want every component to use the *same* "now" for consistency. If each component calculated its own `new Date()`, two components rendered at slightly different times could disagree about whether a letter is unlocked. Passing `now` in keeps everyone in sync.

---

### `formatTimeRemaining` — How long until I can read this?

```ts
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

This function takes the unlock date and the current time, and returns an object with four numbers — how many days, hours, minutes, and seconds are left. Let's break it down.

#### The return type
```ts
}: {
  days: number
  hours: number
  minutes: number
  seconds: number
} {
```
This is an **inline type** — we're defining the shape of the returned object right here instead of in `types.ts`. It says "this function returns an object with exactly these four number properties." It's the same idea as the `Letter` type, just written right at the function instead of in a separate file.

#### `const target = new Date(unlockDate)`
Turn the stored text into a real Date object we can do math with.

#### `const totalSeconds = differenceInSeconds(target, now)`
date-fns does the heavy lifting here. It calculates how many seconds are between `now` and `target`. If `now` is 2:00 PM and `target` (unlock time) is 3:30 PM, `totalSeconds` is 5400 (90 minutes × 60 seconds).

> **Under the hood:** `differenceInSeconds` converts both dates to their millisecond representations (the number of milliseconds since January 1, 1970), subtracts them, and divides by 1000. Every `Date` object is secretly just a big number. `new Date(0)` is midnight on January 1, 1970. `new Date(1000)` is one second later. This number is called a "Unix timestamp."

#### The guard clause
```ts
if (totalSeconds <= 0) {
  return { days: 0, hours: 0, minutes: 0, seconds: 0 }
}
```

If the unlock time has already passed, we return all zeros. Without this guard, the function would try to calculate negative time remaining and produce negative numbers in the countdown display. The countdown component calls this function every second — once the deadline passes, it just shows `00:00:00:00` forever.

> **Why not just hide the countdown entirely when the time passes?** Because `LetterCard` already checks `isUnlocked` and hides the countdown component when unlocked. The countdown should never receive a past date — but the guard clause is a safety net. Defensive programming again: "assume the component above you might make a mistake."

#### Breaking down the total into days, hours, minutes, seconds

This is the part that trips up a lot of beginners. We have one big number (`totalSeconds`), and we need to split it into buckets of different sizes. Think of it like making change: you have 5,400 pennies and you need to figure out how many dollars, quarters, dimes, and pennies that is.

```ts
const days = differenceInDays(target, now)
```

`differenceInDays` from date-fns counts how many full calendar days are between two dates. 30 hours = 1 day (with 6 hours left over). Note that `differenceInDays` and `differenceInSeconds` might give slightly different results around daylight saving time boundaries — but date-fns handles that correctly.

```ts
const remainingAfterDays = totalSeconds - days * 86400
```

`86400` is the number of seconds in a day (24 × 60 × 60). We subtract the seconds accounted for by our day count to get what's left. If `totalSeconds` is 100,000 (about 1.16 days): `days` is 1, `days * 86400` is 86,400, so `remainingAfterDays` is 13,600 seconds (about 3.78 hours).

> **Why 86400 and not a variable?** A real-world dev would probably define `SECONDS_IN_A_DAY = 86400` as a constant. Hardcoding the number is a minor style choice — it's clear enough here, but in a larger codebase, a named constant makes the intent clearer.

```ts
const hours = Math.floor(remainingAfterDays / 3600)
```

`3600` is the number of seconds in an hour (60 × 60). We divide our remaining seconds by 3600 and use `Math.floor()` to round down. Why round down? Because 13,600 / 3,600 = 3.777... That's 3 full hours with a fraction left over. The fraction becomes minutes and seconds.

> **If we didn't use `Math.floor`:** We'd get `3.777...` hours, which is meaningless in a countdown. `Math.floor` gives us the number of *complete* hours.

```ts
const remainingAfterHours = remainingAfterDays - hours * 3600
```
Same pattern: subtract what the hours accounted for. 13,600 - (3 × 3,600) = 13,600 - 10,800 = 2,800 seconds left.

```ts
const minutes = Math.floor(remainingAfterHours / 60)
const seconds = remainingAfterHours - minutes * 60
```

2,800 / 60 = 46.666... → `Math.floor` gives 46 minutes. 2,800 - (46 × 60) = 2,800 - 2,760 = 40 seconds.

Final result: `{ days: 1, hours: 3, minutes: 46, seconds: 40 }`.

This calculation runs every single second (because `useCountdown` ticks every second), so the display smoothly counts down — 40, 39, 38, ... 0, then minutes drops to 45 and seconds resets to 59.

---

### `formatUnlockDate` — Turn a machine date into a human sentence

```ts
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

This takes an ugly ISO string like `"2026-12-25T08:00:00.000Z"` and turns it into something like `"Dec 25, 2026, 3:00 AM"`.

`toLocaleDateString` is a built-in JavaScript method that formats dates according to the conventions of a specific language and region. We pass `'en-US'` for American English formatting, and an options object that says:
- `year: 'numeric'` → show the full year (2026, not '26).
- `month: 'short'` → abbreviated month name (Dec, not December).
- `day: 'numeric'` → day of the month as a number (25, not 25th).
- `hour: 'numeric'` → hour without leading zero (3, not 03).
- `minute: '2-digit'` → minute with leading zero if needed (05, not 5).

---

## `src/hooks/useCountdown.ts` — A Ticking Clock

**What this file's job is:** It creates a clock that updates every second and shares the current time with anyone who asks for it.

```ts
import { useState, useEffect } from 'react'
```

We import two hooks from React:

- `useState` — gives a component a **piece of memory** (a variable that, when changed, causes the component to repaint). Think of it as a sticky note on your monitor: you can read what's written on it, and when you change it, you see the new value everywhere.
- `useEffect` — runs code at specific moments (after the component first appears, or whenever a watched value changes). Think of it as an alarm clock: you tell it what to watch and what to do, and it handles the timing.

```ts
export function useCountdown() {
  const [now, setNow] = useState(() => new Date())
```

We create a piece of state called `now` that starts as the current date and time.

The `() => new Date()` part is a **lazy initializer** — a function that only runs once, the very first time this hook runs. This is important because `new Date()` is "expensive" in the sense that it creates a new object. If we wrote `useState(new Date())`, a new `Date` would be created on *every single render*, even though only the first one matters. The arrow function `() => new Date()` tells React: "only call this once, to get the starting value."

`setNow` is the **setter** — the function we call to update `now` with a new time. Whenever we call `setNow(new Date())`, React says "the clock changed, let me repaint anything that's looking at it."

```ts
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(id)
  }, [])
```

This is the heart of the countdown, and it's where most beginners get tangled. Let's go through it layer by layer.

#### When does this effect run?
Look at the dependency array: `[]`. It's empty. An empty array means: **"run this code exactly once, when the component first appears on screen, and never again (unless the component disappears and comes back)."** This is called a "mount effect" — it only runs on mount.

#### What happens when it runs?
```ts
const id = setInterval(() => {
  setNow(new Date())
}, 1000)
```

`setInterval` is a browser tool that says: "run this function over and over, waiting the specified number of milliseconds between each run." Here, we're calling `setNow(new Date())` every 1000 milliseconds (1 second).

So every second, the state updates with a fresh `Date`, which triggers a re-render of every component that uses this hook. Those components then recalculate their countdowns, showing the new time remaining.

> **Why 1000ms and not something smaller?** 1000ms = one update per second. That's the right granularity for a countdown that shows seconds. If we used 100ms, we'd do 10x the work for no visible benefit. If we used 5000ms, the countdown would jump 5 seconds at a time, which feels janky.

#### The cleanup function
```ts
return () => clearInterval(id)
```

This is the function `useEffect` **returns**. It's not called right away — it's called later, when the component disappears from the screen (unmounts) or before the effect re-runs.

In this case, since the dependency array is empty, the effect never re-runs. So the cleanup only runs when the component unmounts — i.e., when the user navigates away or closes the tab.

What does `clearInterval(id)` do? It stops the timer. Without it:

> **The classic beginner trap:** If you don't clear the interval, every time the component mounts and unmounts, it leaves a running timer behind. These orphan timers keep calling `setNow(new Date())` forever — on components that no longer exist. That's a **memory leak**. In strict mode (which we use), React intentionally mounts, unmounts, and remounts every component twice during development — so without cleanup, you'd have two intervals running, then four, then eight... your app would get slower and slower.

The cleanup function says: "when this component goes away, stop the clock." It's like turning off the lights when you leave a room.

```ts
  return now
}
```

The hook returns `now` — the live, ticking `Date` object. Any component that calls `useCountdown()` gets the same thread of time updates. `App.tsx` calls it once and passes `now` down through props to every component that needs it, ensuring they all agree on what "right now" means.

> **Why return `now` instead of using a global variable?** Because React's entire model is built on **props flowing down**. A hook returning a value and a parent passing that value down as a prop is the standard pattern. Global variables bypass React's update system — if you change a global variable, React doesn't know about it and won't re-render. State and hooks keep React in the loop.

---

## `src/hooks/useLetters.ts` — Managing the List of Letters

**What this file's job is:** It holds the master list of all letters, provides functions to add and remove letters, and automatically saves every change to localStorage.

```ts
import { useState, useCallback, useEffect } from 'react'
import type { Letter } from '../types'
import { loadLetters, saveLetters } from '../lib/storage'
```

Two new imports to explain:

- `useCallback` — wraps a function so React doesn't re-create it on every render. Think of it as telling React: "this recipe hasn't changed, you can reuse the old copy." More on why this matters in a moment.
- The two functions from `lib/storage.ts` we wrote earlier: `loadLetters` (read from the notebook) and `saveLetters` (write to the notebook).

```ts
export function useLetters() {
  const [letters, setLetters] = useState<Letter[]>(() => loadLetters())
```

We create state for our list of letters. The starting value comes from localStorage — whatever was saved last time the app was open. If nothing was saved, `loadLetters()` returns an empty array `[]`.

Remember the lazy initializer pattern: `() => loadLetters()`. This reads from localStorage only once, when the hook first runs. If we wrote `useState(loadLetters())`, it would read from localStorage on *every single render*, which is wasted work (the stored value hasn't changed between renders).

> **Why read from localStorage in the initializer instead of in a useEffect?** Good instinct to ask. Some people do this with an effect:
> ```ts
> const [letters, setLetters] = useState<Letter[]>([])
> useEffect(() => { setLetters(loadLetters()) }, [])
> ```
> That would flash an empty list on the first render, then immediately replace it with the stored list on the second render — causing a visible flicker. Putting it in the initializer gives us the stored list on the very first render, no flicker.

```ts
  useEffect(() => {
    saveLetters(letters)
  }, [letters])
```

This is the **auto-save effect**. Every time `letters` changes (a letter is added or removed), this effect fires and writes the new list to localStorage.

#### The dependency array: `[letters]`
This tells React: "watch the `letters` variable. Whenever it changes to a different value, run this effect." If `letters` doesn't change between renders, the effect skips.

**What if the dependency array were empty `[]`?** The effect would only run once, on mount. It would save the initial list (maybe empty) and never save again. You'd add letters, close the tab, open it again, and they'd all be gone.

**What if we removed the dependency array entirely?** The effect would run on *every single render*, saving the same list over and over to localStorage, even when nothing changed. That's wasteful (writing to disk is slow compared to memory), but not catastrophic for a small list. Still — always use the right dependencies.

**What if we added something else to the dependency array, like `[letters, now]`?** The effect would fire every time `now` changes — that's every second. You'd be writing to localStorage 60 times a minute, 3,600 times an hour, for no reason. Correct dependencies matter.

> **The trap:** It's easy to accidentally include a dependency that changes too often. The rule is: *list every variable from inside the effect that can change, and nothing else*. Our effect only uses `letters`, so the array is `[letters]`. Simple.

```ts
  const addLetter = useCallback((letter: Letter) => {
    setLetters((prev) => [letter, ...prev])
  }, [])
```

A function for adding a new letter. When called, it does two things:
1. Takes the new letter and puts it at the *beginning* of the list (`[letter, ...prev]`).
2. This new array triggers the auto-save effect (because `letters` changed).

`useCallback` wraps the function so it's **stable across renders**. Without it, `addLetter` would be a brand-new function on every render (even if the logic hasn't changed). This matters if we pass `addLetter` down as a prop — a new function reference would cause child components to re-render unnecessarily.

The dependency array for `useCallback` is `[]` — the function never needs to be recreated because it doesn't depend on any changing values (it uses `setLetters`, which React guarantees is stable).

```ts
  const removeLetter = useCallback((id: string) => {
    setLetters((prev) => prev.filter((l) => l.id !== id))
  }, [])
```

A function for removing a letter. It takes an `id` and filters the list, keeping only letters whose `id` doesn't match.

`.filter()` creates a new array — we never modify (mutate) the old array directly. React requires immutable updates: always create a new array/object instead of changing the old one. Immutability is how React knows something changed — it compares references (`oldArray === newArray`), and since `.filter()` returns a new array, the reference is different and React re-renders.

```ts
  return { letters, addLetter, removeLetter }
}
```

The hook exposes three things to the outside world: the list of letters, a function to add one, and a function to remove one. `App.tsx` destructures these when it calls `useLetters()`.

---

## `src/components/Countdown.tsx` — Displaying `dd:hh:mm:ss`

**What this file's job is:** It takes the unlock date and current time, runs the math to figure out what's left, and displays it as a formatted countdown timer: `days : hours : minutes : seconds`.

```tsx
import { formatTimeRemaining } from '../lib/time'
```

We import the math function we already wrote. Components should be dumb about logic — do the thinking in `lib/` files and just paint the result here.

```tsx
function Pad({ value }: { value: number }) {
  return <>{String(value).padStart(2, '0')}</>
}
```

This tiny helper component makes sure numbers always show two digits. `5` becomes `"05"`, `12` stays `"12"`.

`String(value)` converts the number to text. `.padStart(2, '0')` says: "make this string at least 2 characters long; if it's shorter, add `'0'` characters at the beginning until it's 2."

The `<>...</>` wrapper is a **React Fragment** — an invisible container. You can't return two separate elements from a component without wrapping them in something, and a Fragment wraps them without adding an extra `<div>` to the DOM.

> **Why a separate component for padding?** It could be a simple function, but making it a component keeps the JSX clean. Instead of `{String(days).padStart(2, '0')}` inline (ugly), we write `<Pad value={days} />` (clean). It's a tiny abstraction, but in a file full of timers, readability compounds.

```tsx
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
```

The component receives two **props** (short for "properties" — things the parent passes down): the unlock date as text, and the current time as a `Date` object.

It immediately calls `formatTimeRemaining` to do the math, and destructures the result into four variables: `days`, `hours`, `minutes`, `seconds`. This math runs on every render (every second, because `now` changes every second), so the display updates smoothly.

```tsx
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
```

The layout is a row of four units, separated by colons. Each unit is a number (padded to 2 digits) and a label (`d`, `h`, `m`, `s`).

The result looks like: `03d : 12h : 45m : 30s`

A few Tailwind details:
- `font-mono` — monospace font, so numbers don't jitter as they change (in proportional fonts, `1` is narrower than `8`, which makes the layout dance).
- `tracking-wide` — slightly more space between characters, making it easier to read.
- `items-baseline` — aligns the big number and the small label along their text baselines, so the `d` sits at the same height as the number even though it's smaller.

---

## `src/components/EmptyState.tsx` — "Nothing here yet!"

**What this file's job is:** When the user has no letters, this shows a friendly message and a button to write their first one.

```tsx
import { Feather } from 'lucide-react'
```

`Feather` is a quill-pen icon from lucide-react — an icon library. It's a visual metaphor for writing.

```tsx
export default function EmptyState({ onCompose }: { onCompose: () => void }) {
```

The component takes one prop: `onCompose`, a function. When the user clicks the "Write your first letter" button, this function fires — which, in our app, opens the letter form modal.

The type `() => void` means "a function that takes no arguments and returns nothing." It's a **callback** — a function you hand off to someone else to call later.

```tsx
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
```

The layout is centered vertically and horizontally (`flex flex-col items-center justify-center`) with generous padding (`py-24` = 96px of vertical padding).

The feather icon sits inside a warm amber circle — it's the visual centerpiece. The heading, description, and button form a vertical stack.

The button's `onClick={onCompose}` connects the click event to the prop function. When clicked, `App.tsx`'s `setShowForm(true)` runs, which reveals the compose modal.

The `hover:bg-amber-800` class changes the button color when you mouse over it, and `transition-colors duration-200` makes that color change smooth (200 milliseconds) instead of instant.

---

## `src/components/LetterForm.tsx` — Composing a Sealed Letter

**What this file's job is:** It shows a modal (a pop-up overlay) where the user writes a letter — who it's for, what it says, and when it should unlock. On submit, it packages everything into a `Letter` object and hands it off.

This is the most complex component, so we'll take it slow.

```tsx
import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Letter } from '../types'
```

New import: `useRef` — a hook that creates a **mutable container** whose value persists across renders. Unlike state, changing a ref's value does NOT cause a re-render. Think of it as a box you can leave in the corner of the room and put things in — React doesn't care what's in the box, but you can always reach in and retrieve it.

```tsx
type Props = {
  onSubmit: (letter: Letter) => void
  onClose: () => void
}
```

Two props:
- `onSubmit` — called when the form is submitted with a valid letter. Takes the new `Letter` object.
- `onClose` — called when the modal should be dismissed (clicking the X button or the backdrop).

---

### `futureMin()` — Setting the earliest allowed unlock time

```tsx
function futureMin(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}
```

This function generates the `min` attribute for the datetime picker — the earliest date and time the user is allowed to select.

Let's break it down:

1. `new Date()` — the current moment.
2. `d.getTimezoneOffset()` — the difference in minutes between UTC and the user's local time. For someone in New York (UTC-5), this returns `300` (5 hours × 60 minutes). For Lagos (UTC+1), it returns `-60`.
3. `d.setMinutes(d.getMinutes() - d.getTimezoneOffset())` — adjusts the date to represent the local time in ISO format. This is a necessary dance because `<input type="datetime-local">` works with local time, but `toISOString()` gives UTC time. Without this adjustment, the min value would be off by your timezone offset.
4. `.toISOString()` — converts to ISO format: `"2026-05-28T14:30:00.000Z"`.
5. `.slice(0, 16)` — chops off the seconds, milliseconds, and timezone: `"2026-05-28T14:30"`. The datetime-local input expects exactly this format.

> **The timezone subtlety:** `datetime-local` inputs always work in the user's local timezone. When the user picks "December 25, 2026 at 8:00 AM" in Lagos, the input value is `"2026-12-25T08:00"`. When we convert that to an ISO string with `new Date(unlockDate).toISOString()`, JavaScript assumes the input is UTC... unless we handle the offset. This is why the `futureMin` function does the timezone dance — to make the `min` attribute match what the user sees on their clock.

> A real-world dev note: timezone handling is notoriously difficult. This implementation works for the common cases, but a production app handling users across the globe would use a library like `date-fns-tz` to be explicit about timezone conversions.

```tsx
export default function LetterForm({ onSubmit, onClose }: Props) {
  const [recipient, setRecipient] = useState('')
  const [content, setContent] = useState('')
  const [unlockDate, setUnlockDate] = useState('')
  const [error, setError] = useState('')
  const recipientRef = useRef<HTMLInputElement>(null)
```

Five pieces of state for the form:
- `recipient` — who the letter is for.
- `content` — the letter's message.
- `unlockDate` — when it should unlock.
- `error` — any validation error message to show.
- `recipientRef` — a ref to the recipient input field, so we can focus it.

---

### Auto-focus the recipient input

```tsx
  useEffect(() => {
    recipientRef.current?.focus()
  }, [])
```

This effect runs once, when the modal first appears. It moves the keyboard cursor into the recipient field so the user can start typing immediately — no clicking required.

#### The dependency array: `[]`
Empty array = run once on mount. No cleanup needed because there's nothing to tear down (focusing an input is a one-time action, not an ongoing subscription).

The `?.` (optional chaining) handles the case where `recipientRef.current` might be `null` (which it technically is on the very first render, but by the time the effect runs, the input has been painted to the screen and the ref is connected).

#### The `useRef` pattern
When we write `ref={recipientRef}` on an `<input>`, React connects that DOM element to our `recipientRef.current`. After the component mounts, `recipientRef.current` points to the actual input element in the browser. We can then call `.focus()` on it — a browser API that puts the cursor in the field.

---

### Validation: is the form ready to submit?

```tsx
  const isValid =
    recipient.trim().length > 0 &&
    recipient.length <= 60 &&
    content.trim().length > 0 &&
    unlockDate.length > 0 &&
    new Date(unlockDate) > new Date()
```

This is a computed value (recalculated every render) that checks if all fields are filled correctly:

1. `recipient.trim().length > 0` — the recipient isn't just spaces. `.trim()` removes whitespace from both ends.
2. `recipient.length <= 60` — max 60 characters (shown by the counter in the UI).
3. `content.trim().length > 0` — the message isn't empty or just whitespace.
4. `unlockDate.length > 0` — a date was picked.
5. `new Date(unlockDate) > new Date()` — the unlock date is in the **future**. If you pick a past date, the form won't submit. This is the critical check — we should never create a letter that's already unlocked.

> **Why check `new Date(unlockDate) > new Date()` instead of just relying on the `min` attribute?** The HTML `min` attribute is a suggestion — a user can bypass it by editing the HTML in devtools, or by typing directly into the input. Server-side or JavaScript-side validation is always necessary for anything that matters.

---

### Submitting the form

```tsx
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValid) {
      setError('Please fill all fields with valid values.')
      return
    }

    const letter: Letter = {
      id: crypto.randomUUID(),
      recipient: recipient.trim(),
      content: content.trim(),
      unlockDate: new Date(unlockDate).toISOString(),
      createdAt: new Date().toISOString(),
    }

    onSubmit(letter)
    setRecipient('')
    setContent('')
    setUnlockDate('')
    onClose()
  }
```

#### `e.preventDefault()`
Forms in HTML have a default behavior: when you submit them, the browser sends the data to a server and refreshes the page. We're a single-page app — there is no server to send to, and a page refresh would destroy all our state. `preventDefault()` cancels that default behavior.

#### `setError('')`
Clear any previous error message so the user doesn't see a stale error.

#### The early return
```tsx
if (!isValid) {
  setError('Please fill all fields with valid values.')
  return
}
```
If validation fails, we set an error message and stop (`return`). The function doesn't proceed past this point.

#### Building the letter object
```tsx
const letter: Letter = {
  id: crypto.randomUUID(),
  recipient: recipient.trim(),
  content: content.trim(),
  unlockDate: new Date(unlockDate).toISOString(),
  createdAt: new Date().toISOString(),
}
```

We construct a `Letter` object matching the type we defined in `types.ts`:
- `id`: a unique fingerprint (`crypto.randomUUID()`).
- `recipient` and `content`: trimmed versions (no leading/trailing spaces).
- `unlockDate`: converted to a proper ISO string. `new Date(unlockDate).toISOString()` standardizes the format — if the user typed `"2026-12-25T08:00"`, it becomes `"2026-12-25T08:00:00.000Z"` (or the local equivalent with timezone offset applied by the browser).
- `createdAt`: the current moment, also as an ISO string.

#### Handing it off
```tsx
onSubmit(letter)
```
We call the `onSubmit` prop (which, in our app, is `addLetter` from `useLetters`). The letter goes into the list, gets saved to localStorage, and appears on screen.

#### Cleaning up
```tsx
setRecipient('')
setContent('')
setUnlockDate('')
onClose()
```
We reset all form fields to empty and close the modal. The next time the modal opens, it'll be a fresh clean form.

---

### The modal's JSX

```tsx
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
```

`fixed inset-0 z-50` — the modal covers the entire screen, sits on top of everything (z-50 = layer 50), and stays in place even if you scroll.

`bg-black/20 backdrop-blur-sm` — the background is semi-transparent black (20% opacity) with a slight blur. This is the "backdrop" — it dims and softens the content behind the modal, drawing your eye to the form.

`onClick={(e) => { if (e.target === e.currentTarget) onClose() }}` — when you click the dark backdrop area (not the white card inside it), the modal closes. The check `e.target === e.currentTarget` is important: it says "only close if the click was directly on the backdrop itself, not on the card (or any element inside it)." Without this check, clicking anywhere — even inside the form — would close the modal.

> **Why `e.target === e.currentTarget`?** `e.target` is the exact element you clicked. `e.currentTarget` is the element the event handler is attached to (the backdrop div). If you click the white card, `e.target` is the card or something inside it, but `e.currentTarget` is still the backdrop div — they're different, so the modal stays open. This is called "click outside to close" and it's a standard UI pattern.

```tsx
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
```

The white card. `max-w-lg` limits it to about 512px wide. `max-h-[90vh]` limits the height to 90% of the viewport, with `overflow-y-auto` adding a scrollbar if the content is taller.

```tsx
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-stone-800">Compose a letter</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>
```

The modal header: a title on the left, an X close button on the right. The X button calls `onClose` directly — same as clicking the backdrop.

```tsx
        <form onSubmit={handleSubmit} className="space-y-5">
```

The `<form>` element wraps all the inputs. The `onSubmit` handler calls our `handleSubmit` function. `space-y-5` adds 20px of vertical spacing between each child element.

#### Recipient field

```tsx
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Recipient
            </label>
            <input
              ref={recipientRef}
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              maxLength={60}
              placeholder="Future Me, Mom, Best Friend..."
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50
                         text-stone-800 placeholder:text-stone-400
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                         transition-shadow"
            />
            <p className="text-xs text-stone-400 mt-1 text-right">
              {recipient.length}/60
            </p>
          </div>
```

Key details:
- `ref={recipientRef}` — connects the ref for auto-focus.
- `value={recipient}` — this is a **controlled input**. React controls what the input displays. The value always equals the `recipient` state variable.
- `onChange={(e) => setRecipient(e.target.value)}` — when the user types, we update the state. This triggers a re-render, which updates the displayed value and the character counter.
- `maxLength={60}` — the browser won't let the user type more than 60 characters.
- The character counter `{recipient.length}/60` shows live feedback. At 60, you can't type anymore.

#### Content field (the letter itself)

```tsx
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Your letter
            </label>
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
          </div>
```

A `<textarea>` (multi-line input) for the letter body. `rows={6}` sets the visible height to about 6 lines of text. `resize-none` prevents the user from dragging the corner to resize it — the height is fixed at 6 rows, but `overflow-y` is automatic (scrolls if you write more).

The `font-serif` class uses the Lora font we set up, making the letter feel handwritten-like as you type.

#### Unlock date & time picker

```tsx
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Unlock date &amp; time
            </label>
            <input
              type="datetime-local"
              value={unlockDate}
              min={futureMin()}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50
                         text-stone-800
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                         transition-shadow"
            />
            <p className="text-xs text-stone-400 mt-1">
              Must be a future date and time.
            </p>
          </div>
```

`type="datetime-local"` tells the browser to show its native date-and-time picker widget. `min={futureMin()}` sets the earliest selectable date to... well, right now (adjusted for timezone). The label uses `&amp;` which renders as `&` in HTML (the `&` character has special meaning in HTML, so we escape it).

> **The `min` attribute recalculates every render.** Since `futureMin()` is called inline in the JSX, every time the component re-renders, the min value is recalculated. In practice, this component doesn't re-render often (only when state changes), so it's fine. But if this were in a component that re-rendered 60 times per second, we'd memoize it with `useMemo`.

#### Error message

```tsx
          {error && (
            <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
```

Conditional rendering: if `error` is not empty, show a pink error box. The `&&` operator in JSX is a pattern: `{condition && <element />}` means "if condition is truthy, render the element; otherwise render nothing."

#### Submit button

```tsx
          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3 rounded-xl font-medium transition-all duration-200
                       bg-amber-700 text-stone-50 hover:bg-amber-800
                       disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed
                       shadow-sm"
          >
            Seal &amp; lock letter
          </button>
```

`type="submit"` — this button submits the form (triggers the `onSubmit` handler on the `<form>`). If you forget `type="submit"`, a button inside a form defaults to `type="submit"` anyway — but being explicit is good practice.

`disabled={!isValid}` — the button is greyed out and unclickable until all validation passes. The `disabled:` Tailwind variants style the disabled state differently: light grey background, lighter text, and a "not allowed" cursor.

---

## `src/components/LetterCard.tsx` — A Single Letter, Locked or Unlocked

**What this file's job is:** It renders one letter as a card. If the letter is still locked, it shows a countdown and a pulsing lock icon (the content is hidden). If it's unlocked, it shows the message with a reveal animation and a formatted date.

This is the most featureful component, with two `useEffect` hooks, a timed confirmation pattern, and conditional content hiding.

```tsx
import { useState, useRef, useEffect } from 'react'
import { Lock, Mail, MailOpen, Trash2 } from 'lucide-react'
import type { Letter } from '../types'
import { isUnlocked, formatUnlockDate } from '../lib/time'
import Countdown from './Countdown'
```

Four icons from lucide-react:
- `Lock` — a padlock (shown on locked letters, pulsing).
- `Mail` — a sealed envelope (shown on locked letters).
- `MailOpen` — an opened envelope (shown on unlocked letters).
- `Trash2` — a trash can (the delete button).

```tsx
type Props = {
  letter: Letter
  now: Date
  onDelete: (id: string) => void
}
```

Three props:
- `letter` — the `Letter` object to display.
- `now` — the current time (passed from `App`, kept in sync with `useCountdown`).
- `onDelete` — called when the user confirms deletion.

---

### State and refs setup

```tsx
export default function LetterCard({ letter, now, onDelete }: Props) {
  const unlocked = isUnlocked(letter.unlockDate, now)
  const prevUnlocked = useRef(unlocked)
  const [showReveal, setShowReveal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
```

#### `unlocked`
This is NOT state — it's a regular variable computed on every render. Every second, `now` changes (from the countdown hook), which causes a re-render, which recalculates `unlocked` with the fresh time. If the unlock time has passed, `unlocked` flips from `false` to `true`.

> **Why not store `unlocked` in state?** Because it's derived from props. State should be for things the component *owns*. `unlocked` is just a question asked of the props: "hey `now`, are you past `letter.unlockDate` yet?" Recalculating it on every render is cheap (one Date comparison) and avoids the bug where state and props get out of sync.

#### `prevUnlocked`
A ref that remembers the previous value of `unlocked` (locked → unlocked transition detection). We use a ref because we need to remember a value across renders without causing re-renders when it changes.

#### `showReveal`
State for the reveal animation. When a letter just unlocked, we set this to `true` briefly (700ms) to play the entrance animation, then set it back to `false`.

#### `confirmDelete` and `confirmTimer`
State and ref for the two-step delete: first click says "Delete", second click (within 3 seconds) says "Confirm delete" and actually deletes. The ref holds the timer ID so we can clear it on unmount.

---

### Effect 1: Detecting the unlock transition

```tsx
  useEffect(() => {
    if (!prevUnlocked.current && unlocked) {
      setShowReveal(true)
      const timer = setTimeout(() => setShowReveal(false), 700)
      return () => clearTimeout(timer)
    }
    prevUnlocked.current = unlocked
  }, [unlocked])
```

This effect watches the `unlocked` variable. Let's trace through it step by step.

#### When it runs
The dependency array is `[unlocked]`. This effect fires **whenever `unlocked` changes**. Since `unlocked` is recomputed every render (every second), the effect fires every time the answer to "is it unlocked?" changes.

In practice, `unlocked` only changes twice in the lifetime of a letter:
1. Never (if the letter was created unlocked — shouldn't happen, but we handle it).
2. Once, at the exact second the unlock time passes: `false` → `true`.

#### What it does
```tsx
if (!prevUnlocked.current && unlocked) {
```

This checks: "was it locked before, and now it's unlocked?" The `!prevUnlocked.current` part handles the initial render: on the very first render, `prevUnlocked.current` is `false` (the initial value from `useRef(unlocked)`). If the letter is already unlocked on first render (past date), this condition is `!false && true` = `true && true` = `true`, and the animation plays. If the letter is locked on first render, it's `!false && false` = `true && false` = `false`, and nothing happens.

> Wait — `prevUnlocked.current` starts as `unlocked` on the first render. So if `unlocked` is `false` (letter is locked), `prevUnlocked.current` is `false`, and the condition is `!false && false` = `false`. If `unlocked` is `true` (already past), `prevUnlocked.current` is `true`, and the condition is `!true && true` = `false`. So on the first render, the animation does NOT play, even if the letter is already unlocked. This is intentional — the animation is for the *moment* it unlocks, not for letters that were already unlocked when you opened the app.

```tsx
setShowReveal(true)
const timer = setTimeout(() => setShowReveal(false), 700)
```

We set `showReveal` to `true`, which applies the `animate-reveal` CSS class to the card. Then we set a timer: 700 milliseconds later, set it back to `false`.

> **Why 700ms when the CSS animation is 600ms?** The extra 100ms is a buffer — it ensures the animation fully completes before we remove the class. Without the buffer, the class could be removed at 600ms exactly, potentially cutting off the last frame.

#### The cleanup
```tsx
return () => clearTimeout(timer)
```

If the component unmounts (or the effect re-runs) before the 700ms timer fires, we cancel the timer. Without this, the timer would try to call `setShowReveal(false)` on a component that no longer exists, which React handles gracefully (it ignores state updates on unmounted components), but it's still a good practice to clean up.

#### After the condition
```tsx
prevUnlocked.current = unlocked
```

At the end of every run, we update the ref to the current value of `unlocked`. This is how we "remember" what it was for next time. Note that changing a ref does NOT cause a re-render — it's a silent update.

---

### The delete button logic

```tsx
  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(letter.id)
    } else {
      setConfirmDelete(true)
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000)
    }
  }
```

This is a two-step confirmation pattern — a lightweight alternative to a confirmation dialog.

1. **First click:** `confirmDelete` is `false`, so we go to the `else` branch. We set `confirmDelete` to `true`, which changes the button text and color. We also start a 3-second timer that resets `confirmDelete` back to `false`.

2. **Second click (within 3 seconds):** `confirmDelete` is `true`, so we go to the `if` branch. `onDelete(letter.id)` permanently deletes the letter.

3. **If you wait 3 seconds:** The timer fires, sets `confirmDelete` back to `false`, and the button goes back to "Delete" — you missed your window and have to click twice again.

This pattern prevents accidental deletions (clicking delete when you meant to click something else) without the friction of a modal dialog.

---

### Cleanup on unmount

```tsx
  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [])
```

When the component unmounts (letter is deleted), we clean up the confirmation timer. Without this, if you clicked "Delete" once (starting the 3-second timer) and then the letter was deleted by some other means, the timer would keep running and try to update state on an unmounted component.

The dependency array is `[]` — this effect runs once on mount, and its cleanup runs once on unmount. This is the standard pattern for "do something when I go away."

---

### The card's JSX

```tsx
  return (
    <div
      className={`rounded-2xl p-6 shadow-sm border transition-all duration-300 ${
        unlocked
          ? 'bg-white border-stone-100'
          : 'bg-stone-50/80 border-stone-200/60 saturate-[0.85]'
      } ${showReveal ? 'animate-reveal' : ''}`}
    >
```

The card's appearance changes based on state:
- **Unlocked:** white background, subtle border. Looks "active" and bright.
- **Locked:** slightly grey/cream background (`stone-50/80` = 80% opacity), more visible border, slightly desaturated (`saturate-[0.85]` removes 15% of color saturation). Looks "dormant" and sealed.

The `animate-reveal` class is conditionally applied — only when `showReveal` is `true`. The `transition-all duration-300` makes the background and border color changes smooth (300ms fade).

---

#### Card header

```tsx
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              unlocked ? 'bg-amber-100' : 'bg-stone-200'
            }`}
          >
            {unlocked ? (
              <MailOpen
                className={`w-5 h-5 ${showReveal ? 'animate-reveal' : ''} ${
                  unlocked ? 'text-amber-700' : ''
                }`}
                strokeWidth={1.5}
              />
            ) : (
              <Mail className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
            )}
          </div>
          <h3 className="font-serif text-lg text-stone-800 truncate">
            {letter.recipient}
          </h3>
        </div>
```

The header shows:
- A circular icon: `Mail` (sealed envelope) when locked, `MailOpen` when unlocked. The icon's background circle changes color too — amber for unlocked, grey for locked. The MailOpen icon also gets the reveal animation when a letter just unlocked.
- The recipient's name in a serif font, truncated with `...` if it's too long to fit (`truncate`).
- `min-w-0` on the name container is a CSS trick that enables text truncation inside flexbox. Without it, flex children refuse to shrink below their content's natural width.

```tsx
        {!unlocked && (
          <div className="flex-shrink-0 ml-2">
            <Lock className="w-5 h-5 text-stone-400 animate-seal" strokeWidth={1.5} />
          </div>
        )}
      </div>
```

If the letter is locked, we show a padlock icon with the `animate-seal` class (the breathing pulse animation). The icon is rendered **only** when locked — when unlocked, it simply isn't in the DOM.

---

#### Card body: unlocked state

```tsx
      {unlocked ? (
        <div className={showReveal ? 'animate-reveal' : ''}>
          <div className="w-full min-h-[80px] px-4 py-3 rounded-xl bg-stone-50 border border-stone-100 mb-4">
            <p className="font-serif text-stone-700 leading-relaxed whitespace-pre-wrap break-words">
              {letter.content}
            </p>
          </div>
          <p className="text-xs text-stone-400">
            Unlocked {formatUnlockDate(letter.unlockDate)}
          </p>
        </div>
      ) : (
```

When unlocked, the content is shown:
- The message in a cream-colored box with the Lora font.
- `whitespace-pre-wrap` — preserves line breaks (if the user typed multiple paragraphs) but still wraps long lines.
- `break-words` — breaks very long unbroken strings (like URLs) so they don't overflow the card.
- The formatted unlock date below: "Unlocked Dec 25, 2026, 8:00 AM".

The entire block gets the reveal animation when `showReveal` is `true`.

---

#### Card body: locked state

```tsx
        <>
          <div className="mb-4">
            <Countdown unlockDate={letter.unlockDate} now={now} />
          </div>
          <p className="text-xs text-stone-400 mb-1">
            Unlocks on {formatUnlockDate(letter.unlockDate)}
          </p>
          <p className="text-xs text-stone-300 italic">
            This letter is sealed until the unlock date.
          </p>
        </>
      )}
```

When locked, the letter's **content is completely absent from the DOM**. This is the privacy mechanism — if someone inspects the page, they can't see the locked content because it was never rendered. (True security requires server-side enforcement, but for a local app, this is a reasonable best-effort.)

Instead, the card shows:
- The live `Countdown` component (days:hours:minutes:seconds ticking down).
- The formatted unlock date: "Unlocks on Dec 25, 2026, 8:00 AM".
- A hint: "This letter is sealed until the unlock date."

The `<>...</>` (Fragment) wraps the three elements into a single group without adding an extra DOM node.

---

#### Delete button (common to both states)

```tsx
      <div className="mt-4 pt-4 border-t border-stone-100 flex justify-end">
        <button
          onClick={handleDeleteClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                     transition-all duration-200 ${
                       confirmDelete
                         ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                         : 'text-stone-400 hover:text-rose-500 hover:bg-rose-50'
                     }`}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
```

The delete button sits at the bottom of every card, separated by a thin line (`border-t`).

The button's appearance changes based on `confirmDelete`:
- **Normal** (`confirmDelete` is `false`): muted grey text, subtle hover effect (pink-tinted background and text on hover).
- **Confirming** (`confirmDelete` is `true`): rose (pink/red) background and text, visually signaling "this is destructive, are you sure?"

The text also changes: `"Delete"` → `"Confirm delete"`.

The `transition-all duration-200` makes the color and text changes animate smoothly (200ms).

---

## `src/App.tsx` — The Orchestrator

**What this file's job is:** It's the main component — the boss that holds the entire app together. It manages the list of letters, sorts them for display, and decides when to show the form or the empty state.

```tsx
import { useState, useMemo } from 'react'
import { PenLine } from 'lucide-react'
import { useLetters } from './hooks/useLetters'
import { useCountdown } from './hooks/useCountdown'
import LetterCard from './components/LetterCard'
import LetterForm from './components/LetterForm'
import EmptyState from './components/EmptyState'
import { isUnlocked } from './lib/time'
```

New import: `useMemo` — a hook that **remembers** (memoizes) the result of a computation so we don't redo it on every render unless the inputs change. Think of it as a notepad: "I calculated this before; if the inputs are the same, I'll just read my notes instead of recalculating."

---

```tsx
export default function App() {
  const { letters, addLetter, removeLetter } = useLetters()
  const now = useCountdown()
  const [showForm, setShowForm] = useState(false)
```

`App` is the component where everything converges:

- `useLetters()` gives us the array of letters and the add/remove functions. This hook automatically loads from localStorage on startup and saves on every change.
- `useCountdown()` gives us the ticking `now` value. It updates every second, which means `App` re-renders every second, which means every child component re-renders every second.

> **"Every component re-renders every second? Isn't that expensive?"** Yes, but React is designed for this. Re-rendering is cheap — it's just calling functions to produce new descriptions of what the UI should look like. React then compares the new description with the old one (a process called "reconciliation") and only updates the actual DOM elements that changed. A countdown digit changing from `05` to `04` is a one-character DOM update — incredibly fast. What's expensive is changing the DOM itself, and React minimizes that.

- `showForm` controls whether the compose modal is visible. Initially `false`.

---

### Sorting letters

```tsx
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

This is the sorting logic, wrapped in `useMemo` because it runs on every render (every second, when `now` changes). Without `useMemo`, we'd sort the entire array every second even when the sort order hasn't changed — the dependency array `[letters, now]` tells React "only recalculate if `letters` or `now` changed."

#### Step 1: Separate unlocked from locked
```ts
const unlocked = letters.filter((l) => isUnlocked(l.unlockDate, now))
```
Take all letters and keep only the unlocked ones. `.filter()` creates a new array.

```ts
const locked = letters.filter((l) => !isUnlocked(l.unlockDate, now))
```
Same thing, but keep only the locked ones (the `!` flips the boolean).

#### Step 2: Sort each group
```ts
.sort((a, b) => new Date(b.unlockDate).getTime() - new Date(a.unlockDate).getTime())
```

Unlocked letters are sorted **newest first** (descending by unlock date). The `b - a` pattern gives descending order in JavaScript's `.sort()` comparator:
- If `b > a`, `b - a` is positive → `b` comes before `a` → newer dates first.
- Convert string to Date, then to milliseconds with `.getTime()`, then subtract. This works because `.getTime()` returns a number (milliseconds since 1970), and numbers compare correctly.

```ts
.sort((a, b) => new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime())
```

Locked letters are sorted **soonest first** (ascending by unlock date). The `a - b` pattern gives ascending order:
- If `a < b`, `a - b` is negative → `a` comes before `b` → sooner dates first.

This makes intuitive sense: you want to see the letter that unlocks next at the top, and the most recently unlocked letter at the top of the unlocked section.

#### Step 3: Combine
```ts
return [...unlocked, ...locked]
```
Spread both arrays into a single new array. Unlocked letters appear first, locked letters after. This means newly unlocked letters "float up" from the locked section to the top of the unlocked section when their time comes.

---

### The JSX layout

```tsx
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
```

`min-h-screen` makes the page at least as tall as the browser window (so the background covers the full height even when there are few letters).

The inner div limits content to a maximum of 1024px wide (`max-w-5xl`), centers it horizontally (`mx-auto`), and adds responsive padding.

---

#### Header

```tsx
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-serif text-stone-800 tracking-tight">
              Time-Locked Letters
            </h1>
            <p className="text-stone-500 mt-1 text-sm">
              Write letters that only open when the time is right
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 text-stone-50
                       rounded-xl font-medium hover:bg-amber-800 transition-colors duration-200
                       shadow-sm"
          >
            <PenLine className="w-4 h-4" strokeWidth={2} />
            Compose
          </button>
        </header>
```

A simple header row: app name and tagline on the left, "Compose" button on the right. The compose button has a pen icon and calls `setShowForm(true)` when clicked.

---

#### Content area

```tsx
        {letters.length === 0 ? (
          <EmptyState onCompose={() => setShowForm(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedLetters.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                now={now}
                onDelete={removeLetter}
              />
            ))}
          </div>
        )}
      </div>
```

Conditional rendering: if there are zero letters, show the `EmptyState` component (with its own compose button). Otherwise, show the grid of letter cards.

The grid uses CSS Grid, responsive at three breakpoints:
- **Mobile** (`grid-cols-1`): one column.
- **Tablet** (`md:grid-cols-2`): two columns.
- **Desktop** (`lg:grid-cols-3`): three columns.

Each letter gets rendered as a `LetterCard`, receiving:
- `letter` — the letter data.
- `now` — the live ticking time.
- `onDelete` — the `removeLetter` function from the hook.

The `key={letter.id}` prop tells React "this card is uniquely identified by this ID." React uses keys to track which elements changed, were added, or were removed. Without keys (or with bad keys), React can't tell cards apart and may re-render them unnecessarily or mess up animations.

> **Why not use the array index as the key?** Index-based keys (`key={i}`) break when items are added/removed/reordered. If you delete the first card, index 0 now points to the former second card, and React thinks the first card changed rather than was deleted. Always use stable, unique IDs as keys.

---

#### The compose modal

```tsx
      {showForm && (
        <LetterForm
          onSubmit={addLetter}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
```

When `showForm` is `true`, the `LetterForm` modal is rendered. It receives:
- `onSubmit={addLetter}` — when the form submits, the new letter goes into `useLetters`, which adds it to state and auto-saves to localStorage.
- `onClose={() => setShowForm(false)}` — when the form is dismissed, hide it.

The `&&` pattern: if `showForm` is falsy, the right side (the form) is never evaluated or rendered. When `showForm` becomes `true`, React creates the form component and mounts it (triggering the auto-focus effect inside). When it becomes `false`, React unmounts and destroys it.

---

## Where Beginners Usually Get Stuck

### 1. `useEffect` Dependency Arrays

Every `useEffect` has a list in its square brackets — the "dependency array." This list tells React: "re-run this effect whenever any value in this list is different from last time."

**The most common mistake** is a missing dependency. Example: if the auto-save effect in `useLetters.ts` had an empty `[]` dependency array, it would only save once on startup and never again. You'd lose every letter you wrote after closing the tab.

**The second most common mistake** is an unnecessary dependency. If the auto-save effect included `[letters, now]`, it would write to localStorage 60 times per minute (every time `now` ticks), which is wasteful.

**The mental model:** Think of the dependency array as a list of things the effect is "watching." Whenever one of those things changes, the effect wakes up and does its job. If the array is empty `[]`, the effect wakes up exactly once (when the component is born) and never again. If there's no array at all, the effect wakes up on every single render.

**The cleanup function** (the function returned from the effect) is a separate concept: it runs when the component dies, or right before the effect re-runs. It's for tearing things down — clearing intervals, canceling timers, removing event listeners. If you forget cleanup, you get memory leaks (zombie timers running on dead components).

### 2. localStorage: Reading, Writing, and Not Crashing

localStorage is simple but treacherous. Three things to remember:

1. **It only stores strings.** If you want to store an object or array, `JSON.stringify` it going in and `JSON.parse` it coming out. Forget either step and your app breaks — you'll see `[object Object]` instead of your data.

2. **It can fail.** Storage might be full, blocked by private browsing, or corrupted by someone editing it manually. Always wrap reads AND writes in `try/catch`. If reading fails, return a sensible default (empty array). If writing fails, log it and move on — don't crash the app.

3. **Reading bad JSON will crash your app.** If the stored text is `"this is not json"`, `JSON.parse` throws an error. Without `try/catch`, that error bubbles up to React and the entire page goes white. With `try/catch`, we just start fresh with an empty list.

### 3. Dates: Strings vs. Numbers, and Timezone Gotchas

The date system in this app has three layers, and mixing them up causes bugs:

1. **Storage layer:** Dates are stored as ISO strings like `"2026-12-25T08:00:00.000Z"`. This is a universal, machine-readable format. You can't do math on these strings directly.

2. **Math layer:** To compare dates or calculate time remaining, convert strings to `Date` objects first: `new Date(isoString)`. `Date` objects compare as numbers (milliseconds). `dateA < dateB` works because JavaScript converts Date objects to their numeric value for comparison.

3. **Display layer:** To show a date to humans, use `toLocaleDateString()` with formatting options. This respects the user's language and region.

**The timezone trap:** `<input type="datetime-local">` uses local time (whatever the user's computer thinks the timezone is). When we convert the input value to an ISO string, JavaScript interprets it according to the local timezone by default. This means a user in Lagos picking "8:00 AM" and a user in New York picking "8:00 AM" are picking different moments in time. For a v1 app, this is fine — each user sets times relative to their own clock. For a future version with shared letters or server-side enforcement, you'd need explicit timezone handling.

**The off-by-one trap:** `new Date(unlockDate) <= now` means a letter unlocks at the exact moment the clock hits the set time. What if the user's computer clock is wrong? The unlock happens based on the computer's clock, not a server. For a purely local app, that's the best we can do.

---

*That's the entire codebase, line by line. If something still doesn't make sense, the best way to understand it is to change something and see what breaks — put a `console.log` in a `useEffect`, change a dependency array, or tweak a CSS class and watch what happens.*
