# Implementation Plan - MEM-1
**Goal:** Scaffold a Vite + React + Tailwind app with routing (Home/Gallery/Editor), responsive layout, header/footer, hero, and dark/light theme toggle.

**Context:** Empty repo. Issue asks for Vite + Tailwind setup, modern UI shell, routing, dark/light, Lighthouse >90.

**Steps:**
1. Init Vite (React + TypeScript) project structure manually in /work.
2. Add Tailwind v3 (PostCSS) + dark mode class strategy.
3. Add React Router with Home, Gallery, Editor pages.
4. Build Header (logo + nav + theme toggle), Footer, Hero on Home.
5. Add minimal Gallery grid and Editor placeholder.
6. Update package.json scripts: dev, build, preview.
7. Verify `npm run dev` starts and `npm run build` succeeds.

**Files to change:** package.json, vite.config.ts, tsconfig.json, index.html, src/main.tsx, src/App.tsx, src/index.css, src/components/*, src/pages/*, tailwind.config.js, postcss.config.js.

**Risks/Tests:** Build must succeed. Tailwind must compile. Routes resolve. Dark/light toggle persists via class on `<html>`. No actual Lighthouse run available; ensure semantic HTML, no large deps.
