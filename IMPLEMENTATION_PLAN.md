# Implementation Plan - MEM-2
**Goal:** Replace the placeholder Gallery with a live Imgflip API integration — gallery grid, search/filter, skeleton loaders, error/empty states, and localStorage caching.

**Context:** Issue MEM-2. Fetch from `https://api.imgflip.com/get_memes`, render a responsive meme gallery with search/filter, handle loading/error/empty, and cache the result in localStorage.

**Steps:**
1. Add `src/api/imgflip.ts` with `fetchMemes()` (network + localStorage cache with TTL).
2. Build a `useMemes` hook (`src/hooks/useMemes.ts`) returning `{ memes, status, error, reload }`.
3. Create `MemeCard`, `MemeGridSkeleton`, and `EmptyState` / `ErrorState` components.
4. Rewrite `src/pages/Gallery.tsx` to fetch, render the grid, and host the search input + status UI.
5. Update `IMPLEMENTATION_PLAN.md` to MEM-2 and verify `npm run build`.

**Files to change:** IMPLEMENTATION_PLAN.md, src/api/imgflip.ts (new), src/hooks/useMemes.ts (new), src/components/MemeCard.tsx (new), src/components/MemeGridSkeleton.tsx (new), src/components/EmptyState.tsx (new), src/pages/Gallery.tsx.

**Risks/Tests:** Build must succeed. Manual check of empty/error/loading states by toggling network/cache. Skeleton shown while request is in flight; cached payload used on subsequent loads.
