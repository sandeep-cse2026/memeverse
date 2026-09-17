# Implementation Plan - MEM-6
**Goal:** Add **Meme History & Version Management** — users can save their edited memes (template + custom text) to a personal history, view them later, and load any entry back into the editor for further edits. This turns one-off creations into a revisitable library.

**Context:** MEM-5 shipped addictive UX polish (favorites badge, particle burst, staggered rise, `F` shortcut, recents rail, celebratory toasts, re-entry CTA). MEM-6 adds the missing piece: a durable, cross-session history of *completed* memes — not just template bookmarks.

---

## Feature Overview

| Capability | Description |
|------------|-------------|
| **Save to History** | One-click button in the Editor stores the current template + all text boxes (position, styling, content) as a dated entry. |
| **History Page** | New `/history` route shows a grid of saved memes with thumbnails, creation date, template name, and box count. |
| **Load from History** | Clicking a history card opens the Editor with that exact template and all text boxes restored. |
| **Delete / Clear** | Per-entry delete button + "Clear all" with confirmation. |
| **Header Badge** | History count badge on the "History" nav link (indigo, pops on change like Favorites). |
| **Home Re-entry** | Home hero shows "Your N saved memes" CTA when history is non-empty. |
| **Persistence** | `localStorage` key `mem:history:v1`, capped at 50 entries, survives reloads and syncs across tabs via `mem:history:changed` event. |
| **Stale Template Handling** | History entries whose templates vanished from the Imgflip API are hidden from the UI but retained in storage (in case the API recovers). |

---

## Steps

1. **Create `src/hooks/useMemeHistory.ts`** — persisted history list with `save(template, boxes, title?)`, `load(id)`, `remove(id)`, `clear()`. Capped at 50, most-recent-first, `localStorage` + custom event for cross-tab sync.
2. **Create `src/pages/History.tsx`** — grid of `HistoryCard` components; each shows template thumbnail, custom/fallback title, creation timestamp, template name, box count. Actions: "Open in editor" (primary click) and delete (icon button). Empty state with CTA to Editor.
3. **Update `src/pages/Editor.tsx`**:
   - Import `useMemeHistory` and call `saveToHistory(template, boxes)` from a new "Save to History" button (shown only when a template is selected and there's at least one text box).
   - Read `historyBoxes` from `location.state` when navigating from History; use those boxes instead of defaults when the template resolves.
   - Show a success toast ("Saved to history!") after saving.
4. **Update `src/App.tsx`** — add `/history` route pointing to the new `History` page.
5. **Update `src/components/Header.tsx`** — add "History" `NavLink` with an indigo count badge that pops via the same `popKey` mechanism as Favorites.
6. **Update `src/pages/Home.tsx`** — import `useMemeHistory`; when `history.length > 0`, show a third CTA "Your N saved memes" linking to `/history`.
7. **Update `IMPLEMENTATION_PLAN.md`** to MEM-6 and verify with `npm run build`.

---

## Files to Change

- `src/hooks/useMemeHistory.ts` (new)
- `src/pages/History.tsx` (new)
- `src/pages/Editor.tsx`
- `src/App.tsx`
- `src/components/Header.tsx`
- `src/pages/Home.tsx`
- `IMPLEMENTATION_PLAN.md`

---

## Risks / Tests

- `npm run build` must succeed (type-check + bundle).
- History entries store the full `Meme` object + `TextBox[]`; localStorage quota is respected (cap at 50, each entry ≈ 2–5 KB).
- Cross-tab sync works via `storage` event + custom `mem:history:changed` event.
- Stale templates (removed from Imgflip) are filtered in the History page but preserved in storage.
- Loading from history: `location.state` carries `historyBoxes`; the Editor's template resolution effect uses them when present.
- The "Save to History" button is only enabled when there's a template and at least one text box (prevents saving empty blanks).
- Reduced-motion: the `mem-pop` badge animation and `mem-rise` card animation respect `prefers-reduced-motion` via existing CSS.
- Keyboard accessibility: all interactive elements are native `<button>` or `<a>` with proper focus styles.

---

## Future Enhancements (Not in MEM-6)

- **Versioning per template** — group history by template, show a timeline of edits.
- **Rename / Title** — inline edit of the `title` field on the History page.
- **Export history entry** — one-click PNG download directly from the History card.
- **Search / Filter** — text search across titles + template names, filter by date range.
- **Cloud Sync** — optional account-backed sync via Firebase / Supabase / etc.