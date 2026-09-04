# Implementation Plan - MEM-5
**Goal:** Polish Mem with **addictive UX** — small, delightful touches that reward users for the actions we want them to take (favoriting, sharing, returning). Nothing here changes the product surface; it just makes the surface feel alive.

**Context:** MEM-4 shipped Share + Favorites. MEM-5 layers the polish that makes those features feel rewarding to use:
- **Favorites count badge** in the header so users always see the value they've built up, and it pops on change.
- **Particle burst** when the heart is activated on a card.
- **Staggered card rise** on gallery / favorites / recents so lists feel alive instead of popping in all at once.
- **Keyboard shortcut `F`** in the editor to toggle favorite for the current template (with a visible `F` chip).
- **Recently used templates** in the editor sidebar — last 6 templates you've opened, with one click to return.
- **Toast microcopy + slide-in animation** — share/copy/download/favorite toasts use check/error icons, slide in from the top, and the copy rewards the user.
- **Re-entry CTA on Home** — once the user has favorites or recents, the home hero shows a "Your N favorites" or "Jump back in" link so they bounce back to the editor.
- **Reduced-motion** safety net so the new animations respect the OS preference.

**Steps:**
1. Add `src/hooks/useRecentTemplates.ts` — persisted most-recent-first list of meme IDs, capped at 6, with a `mem:recents:changed` window event so multiple components stay in sync.
2. Update `src/components/Header.tsx` to read `useFavorites()`, show a rose-tinted numeric badge on the Favorites nav link (with a `mem-pop` animation on every change).
3. Update `src/components/FavoriteButton.tsx` to fire six colored particles outward when the heart goes from inactive → active (uses CSS `@keyframes burst`).
4. Update `src/components/MemeCard.tsx` to apply the `mem-rise` animation so each card rises into place.
5. Update `src/index.css` to add `mem-rise`, `mem-pop`, `mem-toast-in`, and `animate-burst` keyframes, plus a `prefers-reduced-motion` override.
6. Update `src/pages/Editor.tsx` to:
   - mount the new `useRecentTemplates` hook and call `bump(id)` whenever a template is selected or resolved from the URL/draft
   - add a window `keydown` listener so pressing `F` toggles the current template's favorite (ignored while typing in inputs/textareas)
   - show a small `F` kbd chip on the Favorite button as a discoverability hint
   - upgrade the success/error toasts to slide in, with check / alert icons, and friendlier copy ("Shared! Off it goes 🚀", "Image copied — paste it anywhere!", "Link copied — share it with a friend!", "Downloaded! Check your folder.", "Saved! Your meme is on its way to your downloads.")
7. Update `src/editor/TemplatePicker.tsx` to render a "Recent" section above the search when there are recents (skipped while searching), intersecting against the loaded `memes` list.
8. Update `src/editor/ShareMenu.tsx` microcopy so every success path is celebratory.
9. Update `src/pages/Home.tsx` so once the user has favorites or recents, the hero gains a third CTA reading "Your N favorites" (or "Jump back in" if only recents).
10. Update `IMPLEMENTATION_PLAN.md` to MEM-5 and verify with `npm run build`.

**Files to change:** IMPLEMENTATION_PLAN.md, src/hooks/useRecentTemplates.ts (new), src/components/Header.tsx, src/components/FavoriteButton.tsx, src/components/MemeCard.tsx, src/index.css, src/pages/Editor.tsx, src/editor/TemplatePicker.tsx, src/editor/ShareMenu.tsx, src/pages/Home.tsx.

**Risks/Tests:** `npm run build` must succeed. Animations are pure CSS, gated by `prefers-reduced-motion`. The recents list caps at 6 entries and uses `useMemo` to intersect against the loaded `memes` (so stale IDs disappear silently). The `F` shortcut is suppressed inside inputs/textareas/contenteditable and when modifier keys are held, so it never hijacks form typing. The badge `pop` uses a React `key` change rather than re-mounting unrelated nodes, keeping animations cheap.
