# Implementation Plan - MEM-3
**Goal:** Add meme generation, download, share, and favorites — turning Mem from a browse-only gallery into a usable editor.

**Context:** Issue MEM-3. Build on MEM-2's Imgflip integration. The Editor becomes a real captioning tool, and a `useFavorites` hook powers a heart toggle on every `MemeCard`. Generation, download, and share are all client-side (canvas + Web Share API) so the app stays keyless.

**Steps:**
1. Add `src/hooks/useFavorites.ts` — `useFavorites()` returning `{ ids, has, toggle, clear }` backed by `localStorage` (`mem:favorites:v1`).
2. Extend `src/api/imgflip.ts` with helpers for the generate pipeline (load image, render captions to canvas, export PNG) and a `shareMeme` helper using the Web Share API with a download fallback.
3. Build `src/components/FavoriteButton.tsx` (heart toggle, accessible, used in `MemeCard` and `Editor`).
4. Add a "Favorites" filter chip in `src/pages/Gallery.tsx` so users can narrow the grid to their picks.
5. Rewrite `src/pages/Editor.tsx` to:
   - pick a template (all memes or favorites),
   - show the meme preview with overlaid caption boxes,
   - render captions to canvas on `Generate`,
   - expose `Download` (PNG) and `Share` (Web Share API → copy link → download fallback) buttons,
   - show a `Favorite` toggle for the active template.
6. Update `IMPLEMENTATION_PLAN.md` (this file) and verify `npm run build`.

**Files to change:** IMPLEMENTATION_PLAN.md, src/hooks/useFavorites.ts (new), src/api/imgflip.ts, src/components/FavoriteButton.tsx (new), src/components/MemeCard.tsx, src/pages/Gallery.tsx, src/pages/Editor.tsx.

**Risks/Tests:** Build must succeed. Generation must handle CORS-tainted images (fall back to proxy via `crossOrigin: 'anonymous'`; if the template can't be loaded, show a clear error). Favorites survive page reloads. Share button gracefully degrades when the Web Share API is unavailable.
