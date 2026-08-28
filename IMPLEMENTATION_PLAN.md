# Implementation Plan - MEM-3
**Goal:** Replace the placeholder Editor with a working canvas-based meme editor backed by Imgflip templates.

**Context:** Issue MEM-3. Build a real-time meme editor: pick a template from the Imgflip API, add draggable top/bottom/custom text boxes with font/size/color/stroke controls, and export the result as a PNG (Canvas API — no extra deps).

**Steps:**
1. Create `src/editor/types.ts` with shared `TextBox` types and helper utilities (id, defaults, sample data).
2. Add `src/editor/useDraggable.ts` — pointer-driven drag hook (no deps) to position text boxes.
3. Add `src/editor/canvasExport.ts` — render an off-screen Canvas with the template image + each text box (Impact-style fill + stroke) and trigger a PNG download.
4. Build `src/editor/EditorStage.tsx` (live preview: relative-positioned image, absolutely positioned text boxes with drag handles, selection highlight).
5. Build `src/editor/TextBoxControls.tsx` (text, font, size, color, stroke, position, delete, add).
6. Build `src/editor/TemplatePicker.tsx` (searchable, scrollable Imgflip template list reusing `useMemes`).
7. Rewrite `src/pages/Editor.tsx` to compose the picker, stage, and controls; keep a "Start blank" option when no template is loaded.
8. Update `IMPLEMENTATION_PLAN.md` to MEM-3 and verify with `npm run build`.

**Files to change:** IMPLEMENTATION_PLAN.md, src/pages/Editor.tsx, src/editor/types.ts (new), src/editor/useDraggable.ts (new), src/editor/canvasExport.ts (new), src/editor/EditorStage.tsx (new), src/editor/TextBoxControls.tsx (new), src/editor/TemplatePicker.tsx (new).

**Risks/Tests:** `npm run build` must succeed. Cross-origin template images need `crossOrigin="anonymous"` for canvas export (Imgflip CDN supports CORS; if blocked we surface a clear error instead of a blank download). Live preview re-renders on every control change; drag updates state without lag.
