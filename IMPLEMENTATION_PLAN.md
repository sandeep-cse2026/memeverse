# Implementation Plan - MEM-4
**Goal:** Extend the meme editor with **Share** and **Favorites** so users can spread their creations and keep a personal shortlist.

**Context:** MEM-3 shipped the canvas editor + PNG download. MEM-4 layers two user-facing features on top:
- **Share** — give the user multiple ways to send a meme to a friend without downloading first: native share (mobile + supported desktops), copy-image to clipboard, copy-link to the editor pre-loaded with that template, with download as a fallback.
- **Favorites** — a heart button on every `MemeCard` and a "Favorite" toggle in the editor header. Favorites are persisted in `localStorage` and exposed at `/favorites`, with a clear-all action and empty states.

**Steps:**
1. Add `src/hooks/useFavorites.ts` — persisted `Set<string>` of meme IDs with `isFavorite`, `toggle`, `add`, `remove`, `clear`; uses a `mem:favorites:changed` window event so multiple components stay in sync without prop drilling.
2. Add `src/components/FavoriteButton.tsx` — heart button that stops click propagation (so it can sit inside a `Link`), with a brief pop animation on add.
3. Add a heart button overlay to `src/components/MemeCard.tsx` (top-right of the thumbnail).
4. Add `src/pages/Favorites.tsx` — read favorites from the hook, intersect with the loaded `memes` list, render with `MemeCard`; show empty state, clear-all, and a "Browse gallery" CTA.
5. Wire `/favorites` into `src/App.tsx` and add a nav link in `src/components/Header.tsx`.
6. Extend `src/editor/canvasExport.ts` to also return a `Blob`, plus `buildEditorShareUrl`, `copyTextToClipboard`, `copyImageBlobToClipboard`, `detectShareSupport`, and `nativeShare` helpers.
7. Add `src/editor/ShareMenu.tsx` — accessible dropdown exposing: native share → copy image → copy link → download. Uses feature detection to hide options the browser can't run.
8. Update `src/pages/Editor.tsx` to mount the `ShareMenu`, add an in-editor "Favorite" toggle for the current template, and show toast-style success/error banners.
9. Update `IMPLEMENTATION_PLAN.md` to MEM-4 and verify with `npm run build`.

**Files to change:** IMPLEMENTATION_PLAN.md, src/App.tsx, src/components/Header.tsx, src/components/MemeCard.tsx, src/components/FavoriteButton.tsx (new), src/hooks/useFavorites.ts (new), src/pages/Favorites.tsx (new), src/pages/Editor.tsx, src/editor/canvasExport.ts, src/editor/ShareMenu.tsx (new).

**Risks/Tests:** `npm run build` must succeed. Web Share API is feature-detected — buttons that can't work are hidden, not disabled-and-broken. `ClipboardItem` is required for image copy; older browsers get the link + download path. `localStorage` is wrapped in try/catch to survive private modes. `MemeCard` heart stops propagation so clicking it doesn't open the editor. The favorites page filters against the loaded `memes` so stale IDs (templates no longer in the API) are silently dropped.
