---
name: verify
description: Build, run, and drive the Zyppi admin/website frontend to verify changes at the browser surface.
---

# Verifying zyppi-admin changes

Astro 5 static site + React islands + Firebase (client SDK), in `frontend/`. No server — everything renders client-side, admin auth is a client-side guard, all data I/O is Firestore from the browser.

## Build & launch

```bash
cd frontend
npm run build                 # static build; esbuild does NOT typecheck
npx tsc --noEmit              # real typecheck (one pre-existing error in VehicleDetail.tsx)
npm run dev -- --port 4399    # dev server for driving
```

## Drive the browser

No Playwright in the repo. Working recipe: `npm i puppeteer-core` in the scratchpad and drive the locally installed Chrome:

```js
puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],  // REQUIRED: Chrome hangs at launch inside the sandboxed shell without --no-sandbox
});
```

Gotchas:
- macOS has no `timeout` command.
- Don't use puppeteer `screenshot({ clip })` on elements with CSS transforms (e.g. float animations) — coordinates land wrong; take full-viewport shots instead.
- The dark pill at the bottom of dev-mode screenshots is the Astro dev toolbar, not page content.
- React islands are `client:only` — `curl` gets an empty shell; you need JS execution to see anything.

## Flows worth driving

- Public pages (`/`, `/contact`, `/privacy-policy`) need no auth.
- Any `/admin/*` page visited unauthenticated must redirect to `/admin/login` (guard in `AdminShell.tsx`) — good smoke test for new admin routes.
- Admin screens behind login can't be driven without real admin credentials (Firebase Auth + `users/{uid}.isAdmin`); note that path as unexercised rather than faking it.
- Firestore security rules can be exercised against production unauthenticated with the web SDK from `frontend/node_modules` + config from `frontend/.env.local` (`PUBLIC_FIREBASE_*`). Label any test documents clearly ("safe to resolve or delete").
