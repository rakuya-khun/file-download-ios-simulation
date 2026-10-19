# file-download-ios-simulation

Download page for verification documents (JSON + PDF). It ships a per-platform strategy chain so the files actually land on the device — iOS, iPadOS, Android, desktop, and in-app webviews — and doubles as a QA page for previewing every strategy.

## Why this exists

iOS is the hard case: every browser on iOS uses WebKit, and WebKit behaves differently from Android/desktop:

- Text-like files (JSON) open in-tab instead of downloading.
- `blob:` URLs with the `download` attribute are ignored inside in-app webviews (WKWebView).
- PDFs are previewed inline instead of saved.
- Filenames are lost unless the server sends `Content-Disposition`.

So the page implements a strategy chain per platform:

| Platform | Strategy |
| :--- | :--- |
| Webview with native bridge (Flutter app) | JS bridge hand-off → native save + result callback |
| iOS/iPadOS browser | Web Share API ("Save to Files") → octet-stream blob download → manual guide |
| iOS/iPadOS in-app webview | bridge if present → data URI anchor → auto-opened guide |
| Android browser | blob + `download` attribute |
| Android webview | bridge if present → blob attempt → manual guide |
| Desktop | blob + `download` attribute |

**Direct link mode** is the most reliable path on iOS: a plain link to the endpoint, letting the server's `Content-Disposition: attachment` header trigger the save.

When the page runs inside an app webview with a native bridge, downloads are handed to native code — the only approach that can actually save files inside a webview. The full bridge contract (channels, payload, Flutter snippets) is in [`docs/download-flow.md`](docs/download-flow.md#4-bridge-contract-in-app-webviews).

## Usage

Each artifact exposes:

- **Download** — client-side path (backend returns JSON in the response body). If the prefetch failed, the button becomes **Retry**. On iPhone/iPad this opens the share sheet — choose **Save to Files** (the sheet is handed only the file, so exactly one item is saved).
- **Direct link** — server-side path (backend triggers the download via headers).
- **Copy link** — copies the endpoint URL for pasting into a browser.
- **Not working? Show guide** — manual save instructions (includes **Copy link** and **Open in browser**).

**Download both** runs the same strategy for JSON then PDF in sequence and reports how many files were handled. On iOS only one share sheet may be granted per gesture — if the status says files are missing, tap the remaining row directly.

Append `?simulate=ios`, `?simulate=ipados`, `?simulate=android`, `?simulate=ios-webview`, `?simulate=android-webview`, `?simulate=instagram`, or `?simulate=facebook` to preview another platform's strategy from a desktop browser (`instagram` and `facebook` preview an iOS in-app webview).

## Backend simulation

- `public/v3/verification/qr.{json,pdf}` are served at prod-like paths.
- `customHttp.yml` applies `Content-Disposition: attachment`, correct MIME types, and `no-store` as Amplify custom headers.
- The Vite dev/preview server applies the same headers locally, so `pnpm dev` mirrors prod and a real phone can test against your LAN IP (`http://<pc-ip>:5173`).

When the real API exists, set `VITE_API_BASE_URL` and all modes switch to it. For cross-origin fetches, expose `Content-Disposition` via CORS (`Access-Control-Expose-Headers`) so filenames can be read.

## Stack

React 19, Vite 8, React Router 7, TanStack Query v5, Tailwind CSS v4, TypeScript strict, Biome, Vitest + Testing Library, Playwright, pnpm, Node.js 24 LTS.

## Structure (Feature-Sliced Design)

```text
src/
├── app/            # providers, router
├── views/          # HomeView, NotFoundView
├── features/       # download-file (strategy engine, bulk action, guide UI, cards)
├── entities/       # download-artifact (types, catalog, useArtifactBlob)
├── shared/         # ui/Button, api/client, lib/platform, lib/utils
└── tests/          # vitest setup + unit tests
```

Import rule: `app → views → features → entities → shared`. No cross-slice deep imports; use slice `index.ts` public APIs.

## Scripts

```sh
pnpm dev            # local dev (simulated backend headers included)
pnpm build          # typecheck + production build
pnpm typecheck      # tsc -b (build mode, includes project refs)
pnpm lint           # biome check
pnpm test           # vitest run
pnpm test:coverage  # vitest with coverage
pnpm e2e            # playwright
```

## Manual device QA matrix

Automated tests only cover the Chromium desktop path. Before shipping behavior changes, verify on real devices:

| Scenario | Download | Direct link | Download both |
| :--- | :--- | :--- | :--- |
| iPhone Safari | | | |
| iPhone Chrome/Firefox/Edge | | | |
| Instagram/Facebook in-app browser | | | |
| iPad Safari | | | |
| Flutter app webview without bridge | | | |
| Flutter app webview with bridge | | | |
| Android Chrome | | | |
| Android webview | | | |
| Desktop Chrome/Firefox/Safari/Edge | | | |
