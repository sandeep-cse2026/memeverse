# Implementation Plan - MEM-7
**Goal:** Add **Advanced Meme Text Styling & Layout Controls** so the editor can produce more than just classic Impact top/bottom captions. The user can now fine-tune typography, layout, and effects on every text box, and one-click presets make the most common looks effortless.

**Context:** MEM-5 added share/favorites/recent UX. MEM-6 hasn't shipped (the repo is on MEM-5). MEM-7 is the "give the editor a proper text engine" milestone — it leaves the existing surface (font, size, color, stroke, outline) in place and layers:

- **Typography** — italic toggle, font weight picker, letter spacing, line height, rotation.
- **Layout** — 9-anchor snap grid, vertical alignment, drag-to-reposition already works, plus a "lock position" toggle.
- **Effects** — drop shadow with color/offset/blur, soft/hard/neon presets, and a text-background highlight box (color, opacity, padding, radius).
- **Stacking** — z-order with bring-forward / send-backward so overlapping boxes paint predictably.
- **Quick styles** — one-click named presets (Classic Impact, Outline only, Highlight, Subtitle, Soft glow, Tilted, Wide spaced) that apply a curated set of fields at once.
- **More fonts** — Trebuchet MS, Verdana, Palatino added to the existing family list.

The new fields are added to `TextBox` with safe defaults, so old drafts and recents load without breaking. The canvas export (`canvasExport.ts`) renders every new field, and the live preview (`EditorStage.tsx`) mirrors it 1:1.

**Steps:**
1. Extend `src/editor/types.ts`:
   - Add new fields to `TextBox` (`italic`, `letterSpacing`, `lineHeight`, `rotation`, `shadowColor`/`OffsetX`/`OffsetY`/`Blur`, `backgroundColor`/`Opacity`/`Padding`/`Radius`, `verticalAlign`, `zIndex`, `locked`).
   - Export `FONT_WEIGHTS`, `TEXT_BOX_PRESETS` (7 named looks), and `ALIGNMENT_PRESETS` (9 anchor positions).
   - Update `createTextBox` defaults to be safe (e.g. transparent shadow, no background).
2. Update `src/editor/canvasExport.ts`:
   - Add `wrapLines` and `measureLineWidth` helpers that honor letter spacing.
   - Add `drawTextBackground` for the highlight box (rounded rect with manual radius for broad support).
   - In `drawTextBox`, apply rotation, vertical alignment, letter-spaced glyph drawing, drop shadow, and skip fill/stroke when the color is transparent (`#00000000`, `rgba(...,0)`, 8-digit hex with `00`).
   - Sort boxes by `zIndex` before drawing so layering matches the live preview.
3. Update `src/editor/EditorStage.tsx`:
   - Sort boxes by `zIndex` for render order.
   - Apply `rotation` to the outer transform and `verticalAlign` to the translate offset.
   - Render the background highlight as an absolutely-positioned pseudo-element behind the text.
   - Apply `letterSpacing`, `lineHeight`, `fontStyle: italic`, and `textShadow` to the text span.
   - Honor `locked` by skipping pointerdown and using a `cursor-default` style.
4. Update `src/editor/useDraggable.ts`:
   - Add a `disabledRef` so toggling `disabled` mid-drag cancels the active drag instead of leaving stale handlers attached.
5. Update `src/editor/TextBoxControls.tsx`:
   - Add a "Quick styles" grid of preset buttons.
   - Add a 9-anchor snap grid for position.
   - Add a "Typography" section (font, weight, italic, size, letter spacing, line height, rotation).
   - Add a "Drop shadow" section with soft/hard/neon presets + color/offset/blur sliders.
   - Add a "Highlight box" section with toggle, color, opacity, padding, radius.
   - Add a "Behavior" section with ALL CAPS, lock, role, and Bring forward / Send backward buttons.
   - Reusable `Section`, `RangeField`, `SelectField`, and `ColorField` components keep the panel tidy.
6. Update `src/pages/Editor.tsx`:
   - Add `bringForward` and `sendBackward` handlers that adjust the selected box's `zIndex`.
   - Plumb them through `TextBoxControls`.
   - When duplicating a box, give the copy a `zIndex` of `maxZ + 1` so the new copy paints on top of the source.
7. Update `IMPLEMENTATION_PLAN.md` to MEM-7 and `README.md` to mention the new editor capabilities. Verify with `npm run build`.

**Files to change:** `src/editor/types.ts`, `src/editor/canvasExport.ts`, `src/editor/EditorStage.tsx`, `src/editor/useDraggable.ts`, `src/editor/TextBoxControls.tsx`, `src/pages/Editor.tsx`, `IMPLEMENTATION_PLAN.md`, `README.md`.

**Risks/Tests:** `npm run build` must succeed. The new fields are added with sensible defaults so old drafts (no `shadowColor`, no `backgroundColor`) render exactly as before. The canvas export handles transparent colors explicitly so an "Outline only" preset still draws the stroke. The zIndex sort is stable; boxes with equal z render in array order. `useDraggable` honors `disabled` reactively so toggling lock cancels an in-progress drag. Rotation is around the box's own center, so dragging a rotated box still feels intuitive.

---

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
