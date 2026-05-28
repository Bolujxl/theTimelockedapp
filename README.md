# Time-Locked Letters

Write letters that stay sealed until a date you choose. A quiet, contemplative single-page app — letters for your future self, birthday messages for friends, or time-delayed notes. All data stays in your browser via `localStorage`.

## Getting Started

```bash
npm install
npm run dev        # starts Vite dev server
npm run build      # production build to dist/
```

## How it works

- **Compose** a letter with a recipient, message, and a future unlock date.
- **Locked letters** show a live countdown. The content is hidden from the rendered DOM.
- **Unlocked letters** reveal their content with a subtle fade-in animation.
- **All data** is stored in your browser's `localStorage`. No backend, no accounts.

## Important note on "locking"

The "lock" is a **UX convention**, not real cryptographic security. Locked letter content is stored as plain text in `localStorage` and is viewable through browser DevTools. This app is designed for personal reflection and gentle self-discipline — not for protecting sensitive secrets.
