# Mem

> A calmer place for your memories. A modern gallery and editor for the moments that matter.

Mem is a React + TypeScript single-page app for curating, annotating, and revisiting meme templates. It pairs a fast, themable gallery with a focused editor that supports draggable text boxes, template favorites, share/copy/download flows, and a "recently used" jump-back-in workflow.

## ✨ Features

- **Gallery** — Browse the full Imgflip meme catalog with a responsive grid, lazy-loaded previews, and graceful fallbacks for unavailable images.
- **Editor** — Pick a template, add draggable text boxes, customize font size/color/outline, and export to PNG.
- **Drafts & auto-saves** — Every edit is captured to localStorage (debounced) and the editor resumes on reload; pin named drafts to revisit later from the side panel.
- **Favorites** — Heart any template to keep it in a dedicated, always-synced Favorites view. A live badge in the header tracks your count and pops on every change.
- **Recently used** — The editor remembers the last 6 templates you opened; surface them in a "Recent" rail for one-click return.
- **Share & export** — One-click image copy, link copy, native share, and PNG download, all wrapped with celebratory toast microcopy.
- **Theming** — System-aware light/dark theme with a flicker-free pre-paint script and a header toggle.
- **Addictive UX polish** — Particle burst on favorite activation, staggered card rise on lists, slide-in toasts, and a re-entry CTA on Home once you have history.
- **Accessibility** — `prefers-reduced-motion` is respected, focus rings are visible, and keyboard shortcuts (e.g. `F` to favorite) skip when you're typing in inputs.

## 🧱 Tech stack

- **Framework:** [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **Build tool:** [Vite 5](https://vitejs.dev/)
- **Routing:** [React Router 6](https://reactrouter.com/)
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/) + PostCSS + Autoprefixer
- **Data source:** [Imgflip API](https://api.imgflip.com/) (see `src/api/imgflip.ts`)

## 📁 Project structure

```
.
├── index.html              # Vite entry HTML, with pre-paint theme detection
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── IMPLEMENTATION_PLAN.md  # Engineering plan / release notes
└── src/
    ├── App.tsx             # Top-level routes
    ├── main.tsx            # React root + BrowserRouter
    ├── index.css           # Tailwind layers + custom animations
    ├── api/
    │   └── imgflip.ts      # Imgflip meme catalog fetcher
    ├── components/         # Header, Footer, MemeCard, FavoriteButton, …
    ├── editor/             # EditorStage, TemplatePicker, ShareMenu, …
    ├── hooks/              # useFavorites, useMemes, useRecentTemplates
    └── pages/              # Home, Gallery, Editor, Favorites, NotFound
```

## 🚀 Getting started

### Prerequisites

- **Node.js** 18+ (Vite 5 requires 18 or 20)
- **npm** 9+ (or another package manager of your choice)

### Install

```bash
npm install
```

### Develop

Start the Vite dev server with hot module reload:

```bash
npm run dev
```

The app is served at <http://localhost:5173> by default.

### Build

Produce a production build in `dist/`:

```bash
npm run build
```

This runs `tsc -b` (type-check) and then `vite build` (bundle).

### Preview

Serve the production build locally to sanity-check it before deploying:

```bash
npm run preview
```

## ⌨️ Keyboard shortcuts

| Key             | Action                                                |
| --------------- | ----------------------------------------------------- |
| `F`             | Toggle favorite for the template currently in the editor (suppressed while typing in inputs/textareas/contenteditable, and when modifier keys are held). |
| `Esc`           | Close any open menu/popover.                          |

## 🗺️ Routes

| Path          | Page          | Notes                                              |
| ------------- | ------------- | -------------------------------------------------- |
| `/`           | `Home`        | Hero + features + re-entry CTA when you have history |
| `/gallery`    | `Gallery`     | Full meme catalog with filters                     |
| `/favorites`  | `Favorites`   | Hearted templates                                  |
| `/editor`     | `Editor`      | Pick a template, edit text, share/download         |
| `*`           | `NotFound`    | 404 fallback                                       |

## 🧠 How it works

- **State persistence** — Favorites, recent templates, and meme drafts are stored in `localStorage` (`mem:favorites:v1`, `mem:recents:v1`, `mem:drafts:v1`, `mem:drafts:session:v1`) and kept in sync across components via `window` events. The current editor session is auto-saved on a 600ms debounce so a refresh never loses more than a fraction of a second of work.
- **Theme detection** — A small inline script in `index.html` reads the saved theme (or system preference) and applies the `dark` class before paint to avoid a flash.
- **Reduced motion** — All custom animations (`mem-rise`, `mem-pop`, `mem-toast-in`, `animate-burst`) are gated by the `prefers-reduced-motion: reduce` media query, so users with motion sensitivity get an instant experience.
- **Meme data** — `src/api/imgflip.ts` calls the public Imgflip API; the result is memoized in `useMemes` to keep the editor and gallery in sync.

## 🤝 Contributing

1. Fork the repo and create a feature branch (`git checkout -b feat/your-feature`).
2. Make your changes. Keep the diff focused.
3. Run `npm run build` and make sure the type-check + bundle succeed.
4. Commit with a clear message and open a pull request.

## 📜 License

This project is provided as-is for personal and educational use. The Imgflip meme catalog is © its respective owners and is fetched live from <https://api.imgflip.com/>.
