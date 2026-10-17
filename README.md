# Abrar Apt Store

Abrar Apt Store is a desktop app-store front-end for Debian/Ubuntu's `apt` package system, built by Syed Abrar Ali with Next.js (React, TypeScript, Tailwind CSS) for the interface and Electron for the desktop shell. It gives the familiar "software store" experience (search, featured apps, cards with description and size, one-click Install/Uninstall) on top of the command-line tools that are already on every Debian-based machine, with no extra package database or daemon.

## Where it is used

Abrar built it as the graphical package manager for his own Ubuntu laptop and for the custom Arch/Debian-flavoured desktop images he experiments with, where a lightweight store that shells out to `apt` is preferable to a heavier distribution-specific one. It is distributed as a Linux AppImage produced by `electron-builder`.

## How it works

The app is a static Next.js export rendered inside an Electron `BrowserWindow`; all privileged work happens in the Electron main process and is reached from the page through IPC.

### Electron main process (`main.js`)

| IPC channel | Implementation |
|-------------|----------------|
| `search-packages(query)` | `apt-cache search "<query>" \| head -n 50`, then for each result name `getPackageDetails()` |
| `install-package(name)` | `sudo apt-get install -y <name>` |
| `uninstall-package(name)` | `sudo apt-get remove -y <name>` |

`getPackageDetails(name)` runs `apt-cache show <name>` and picks `Version`, `Description-en`/`Description`, `Size` (formatted to KB/MB) and `Section`, then runs `dpkg -s <name>` to set `installed: true/false`. All commands use synchronous `execSync`.

The window is 1200x800 with `nodeIntegration: true` and `contextIsolation: false` so the renderer can `window.require('electron')`. In development (`electron-is-dev`) it loads `http://localhost:3000` (the Next.js dev server); otherwise it loads `../out/index.html` relative to `main.js`, i.e. the static export.

### Renderer (`src/app/page.tsx`)

A single client component:

- On mount it fetches details for five featured packages (`firefox`, `vlc`, `gimp`, `code`, `nodejs`) via `search-packages` and shows them as "Discover Featured Apps".
- The search form calls `search-packages` and shows up to 50 results in an animated card grid (framer-motion, lucide-react icons). Each card shows name, description, size or an "Installed" badge, and an Install/Uninstall button that invokes the matching IPC channel and flips the badge on success.
- When not running inside Electron (`window.require` undefined) it falls back to `fetch('/api/search?q=...')`; that route does not exist in this repository, so the browser-only mode shows no results.
- A category sidebar (`All, Editors, Graphics, Utilities, Development, Video`) is rendered and highlights the selection but does not filter results yet.

`src/lib/apt.ts` contains the same `apt-cache`/`dpkg` helpers written in TypeScript (`searchAptPackages`, `getPackageDetails`, `installPackage`, `uninstallPackage`) intended for a server-side API route; the page currently uses the IPC path instead.

### Build configuration

- `next.config.ts`: `output: 'export'` (static HTML into `out/`), unoptimised images.
- `package.json` `build` block: appId `com.abrar.aptstore`, product name "Abrar Apt Store", Linux AppImage target, category System, icon `build/icon.png`, output `dist_electron/`, bundling `main.js`, `out/**`, `package.json`, `node_modules/**`.
- Tooling: Next.js 16, React 19, Tailwind CSS 4 via `@tailwindcss/postcss`, ESLint 9 (`eslint-config-next`), TypeScript 5, Electron 42, electron-builder 26.

| Path | Role |
|------|------|
| `main.js` | Electron entry, IPC handlers wrapping apt/dpkg |
| `src/app/page.tsx` | Store UI (search, featured, cards, install/uninstall) |
| `src/app/layout.tsx` | Root layout, Geist fonts, global CSS |
| `src/app/globals.css` | Tailwind import and theme tokens |
| `src/lib/apt.ts` | TypeScript apt helpers (unused by the current page) |
| `public/logo.png`, `build/icon.png` | Store logo and AppImage icon |
| `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` | Framework configuration |

## Setup

Requirements: a Debian/Ubuntu-based Linux with `apt-cache`, `apt-get` and `dpkg`; Node.js 20 or newer and npm. Installing/removing packages needs `sudo` that does not prompt for a password in the Electron process (passwordless sudo for `apt-get`, or running the app as root); otherwise those two actions fail with the sudo error shown in an alert.

```bash
git clone <repo-url> ~/projects/apt-store
cd ~/projects/apt-store
npm install
```

No environment variables or config files are required. Featured package names are the `defaults` array in `src/app/page.tsx`; the result limit is the `head -n 50` in `main.js`.

## Usage

Development (two terminals):

```bash
npm run dev          # Next.js dev server on http://localhost:3000
npm run electron     # Electron window that loads the dev server
```

Production build and AppImage:

```bash
npm run dist         # next build (static export to out/) + electron-builder -> dist_electron/*.AppImage
chmod +x dist_electron/*.AppImage && ./dist_electron/*.AppImage
```

Lint: `npm run lint`.

In the app: type `vlc` in the search box and press Enter; click **Install** on a card; the badge switches to **Installed** when `apt-get` finishes.

## Project structure

```
apt-store/
├── main.js                 # Electron main process + IPC
├── package.json            # scripts, deps, electron-builder config
├── next.config.ts          # static export
├── tsconfig.json
├── eslint.config.mjs
├── postcss.config.mjs
├── build/
│   └── icon.png
├── public/
│   └── logo.png            # (plus default Next.js SVGs)
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx        # the store UI
    │   ├── globals.css
    │   └── favicon.ico
    └── lib/
        └── apt.ts
```

Ignored build artefacts: `node_modules/`, `.next/`, `out/`, `dist_electron/`.

## Limitations and notes

- Debian/Ubuntu only; it shells out to `apt-cache`, `apt-get` and `dpkg`.
- `execSync` blocks the Electron main process while `apt-get` runs, so the window can appear frozen during long installs; there is no progress output.
- Package names from `apt-cache search` are interpolated into shell commands without escaping. Names from the apt index are safe in practice, but the search query typed by the user is passed to the shell inside double quotes.
- `nodeIntegration: true` / `contextIsolation: false` is convenient but gives the page full Node access; a preload script with a restricted bridge would be the hardened alternative.
- Category filtering, the external-link button and the filter icon are UI placeholders.
- The web fallback (`/api/search`) has no server implementation, so the app is only functional inside Electron.
- `main.js` resolves the production page as `../out/index.html` relative to its own location; verify this path matches the packaged layout (`out/` is bundled next to `main.js`) when building the AppImage.
- `layout.tsx` still carries the default "Create Next App" metadata title.
- `@tauri-apps/*` packages are listed in dependencies but not used.
