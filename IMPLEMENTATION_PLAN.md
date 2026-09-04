# Implementation Plan - MEM-6
**Goal:** Add **drafts & auto-saves** to the meme editor so users never lose work — a quiet, persistent safety net that also lets them name and revisit in-progress memes.

**Context:** MEM-5 shipped the "addictive UX" polish (badge, burst, recents, toasts, etc.). MEM-6 layers the *durability* dimension on top: editing a meme should feel as safe as writing in a notes app. Every keystroke, drag, and template swap is captured (debounced) to localStorage, and the user can pin named drafts they want to come back to.

What's new:
- **Debounced auto-save** of the current editing session (template + boxes) on every change, flushed on unmount so a navigation never drops keystrokes.
- **A "Drafts" side panel** in the editor with restore, rename, delete, overwrite, and clear-all actions.
- **Inline save-status indicator** ("Saving… / Saved Xs ago") in the editor header so users know their work is being captured.
- **"+ Save"** lets users pin a named copy; same-name saves update the existing draft instead of creating duplicates.
- **Auto-resume on reload** — the most recent auto-saved session is restored on editor mount, so a refresh lands the user right back in their edit.
- **Cross-tab sync** — drafts and the active session broadcast changes via a custom `window` event so multiple tabs stay in sync.

**Steps:**
1. Add `src/hooks/useDrafts.ts` — a small, self-contained hook that owns the named-draft list (`mem:drafts:v1`) and the active auto-saved session (`mem:drafts:session:v1`). Provides `autosave`, `saveNamed`, `updateNamed`, `rename`, `remove`, `clearAll`, and `clearSession`. Auto-save is debounced at 600ms and the pending payload is ref-stored so the latest values always win. A custom `mem:drafts:changed` and `mem:drafts:session:changed` event keeps multiple components in sync, and a `storage` handler keeps tabs in sync.
2. Add `src/editor/SaveStatusIndicator.tsx` — a tiny pill that shows `Saving… / Saved Xs ago / Auto-save ready`. Uses an `aria-live="polite"` region so screen readers announce save progress.
3. Add `src/editor/DraftsPanel.tsx` — the side panel UI: list of named drafts with template thumbnails, an inline rename input, per-row delete, an inline "Save as" form, an "Overwrite this draft" CTA when the open draft has unsaved edits, and a "Clear all drafts" link.
4. Update `src/pages/Editor.tsx` to:
   - replace the previous one-shot `mem:editor:draft:v1` save with the new `useDrafts` hook (debounced auto-save on every `template` / `boxes` change; flushed on unmount)
   - track `activeDraftId` and `activeDirty` so we can show the "Overwrite" affordance
   - re-hydrate the most recent auto-saved session on mount, after the meme catalog has loaded (or fall back to URL `?template=` / nav-state templateId if those win)
   - mount the `DraftsPanel` and `SaveStatusIndicator`
   - flash a small `mem-toast-in` indigo banner when a draft is saved, restored, or updated
5. Update `src/index.css` if needed (no new keyframes required — the existing `mem-toast-in` covers the draft banner).
6. Update `IMPLEMENTATION_PLAN.md` (this file) and `README.md` to document the new feature.

**Files to change:** IMPLEMENTATION_PLAN.md, README.md, src/hooks/useDrafts.ts (new), src/editor/SaveStatusIndicator.tsx (new), src/editor/DraftsPanel.tsx (new), src/pages/Editor.tsx.

**Risks/Tests:** `npm run build` must succeed (tsc + vite build). The auto-save debounce (600ms) keeps localStorage writes cheap on long drag operations. `MAX_NAMED_DRAFTS = 50` caps total storage. The session is written separately from named drafts so a refresh always restores the latest edits even before the user picks a name. Restore gracefully degrades when a draft's template is no longer in the catalog — the user sees a "no longer available" toast and the editor stays where it was. The save-status pill is wrapped in `role="status" aria-live="polite"` for screen readers and the "Saving…" pulse is also covered by the existing `prefers-reduced-motion` rule, so users with motion sensitivity see the static "Saved" state instead.
