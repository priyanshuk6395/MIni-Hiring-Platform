# TALENTFLOW — Mini Hiring Platform

A high-fidelity React application that simulates a hiring platform as a portfolio piece. TALENTFLOW demonstrates advanced frontend capabilities — complex state management, persistent local storage, realistic API mocking, drag-and-drop UIs, and list virtualization — built by a developer with a backend / MLOps / cloud focus to showcase full‑stack proficiency.

---

## Table of contents
- [Overview](#overview)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Operational notes & troubleshooting](#operational-notes--troubleshooting)
- [Project purpose](#project-purpose)
- [Author](#author)

---

## Overview
TALENTFLOW is a client-side hiring platform demo that stores data locally using IndexedDB (via Dexie.js) and exposes a realistic, intercepting mock API via Mock Service Worker (MSW). The mock API simulates latency and intermittent write failures to exercise optimistic UI patterns and rollback behavior. The app includes a Jobs board, Candidate management (virtualized list + Kanban), and an Assessment Builder with conditional logic and a live preview.

---

## Key features

- Persistent local database
  - Dexie.js on top of IndexedDB stores jobs, candidates, assessments, and responses so data survives page reloads.

- Realistic mock API
  - Mock Service Worker (MSW) intercepts requests and simulates latency.
  - Write operations intentionally inject a small error rate (configurable, ~5–15%) so the UI handles failures gracefully.

- Jobs board
  - Create and list jobs with pagination and filters.
  - Drag-and-drop reordering with optimistic UI updates and rollback on server errors.

- Candidate management
  - Virtualized list (react-window) to render 1,000+ candidates smoothly.
  - Drag-and-drop Kanban board (using @dnd-kit) for moving candidates through stages.
  - Candidate creation modal with job assignment.

- Assessment builder
  - Create multi-section assessments with multiple question types (short/long text, single/multi choice, numeric, file stub).
  - Conditional logic (show/hide questions based on prior answers).
  - Live preview with client-side validation.

- Seed data
  - On first run the app seeds:
    - ~25 example jobs
    - ~1,000 candidates (modern Indian names, avatars)
    - Sample assessments for a few jobs

---

## Tech stack

- Framework: React 18 (Vite)
- Styling: Tailwind CSS (+ @tailwindcss/forms recommended)
- Local DB: Dexie.js (IndexedDB)
- API mocking: Mock Service Worker (MSW)
- Drag & drop: @dnd-kit (core, sortable, utilities)
- List virtualization: react-window
- Icons: lucide-react
- Testing & dev tooling: Vite, Node.js

---

## Getting started

Prerequisites
- Node.js v16+ (v18+ recommended)
- npm, yarn, or pnpm
- Familiarity with Vite-based React apps

Quick setup
1. Clone the repo:
   ```bash
   git clone <repo-url> talentflow
   cd talentflow
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   # yarn
   # pnpm install
   ```

3. Initialize MSW (run once to create the service worker file in `public/`):
   ```bash
   npx msw init public/
   ```

4. Tailwind CSS (if not already configured)
   ```bash
   npx tailwindcss init -p
   # then set `content` in tailwind.config.js to include ./index.html and ./src/**/*.{js,jsx,ts,tsx}
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```
   Open the Vite URL (typically http://localhost:5173).

Notes about the MSW startup
- The app expects the MSW worker to be started before React mounts. Example entry point (src/main.jsx):
  ```js
  import App, { worker } from './App.jsx';
  import './index.css';

  worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
    createRoot(document.getElementById('root')).render(<App />);
  });
  ```

---

## Project structure (overview)
A recommended folder layout (project may vary after refactor):

- src/
  - components/        — reusable UI components (buttons, inputs, modals)
  - pages/             — top-level pages (Jobs, Candidates, JobDetail)
  - api/               — MSW handlers (if separated)
  - db.js              — Dexie database schema and helpers
  - App.jsx            — main app wiring (routing, provider, MSW worker export)
  - main.jsx           — app entry (starts MSW then mounts React)
  - index.css          — Tailwind + custom CSS

---

## Operational notes & troubleshooting

- react-window "does not provide export named FixedSizeList"
  - Cause: ESM/CJS interop differences with Vite or package versions.
  - Fix: Import defensively:
    ```js
    import * as ReactWindow from 'react-window';
    const FixedSizeList = ReactWindow.FixedSizeList || ReactWindow.default?.FixedSizeList;
    ```
  - Alternative: pin a react-window version that matches your bundler.

- Dexie DataError on bulk reorder (PATCH /jobs/reorder)
  - Cause: Passing invalid keys/objects into IndexedDB (e.g., strings or malformed entries) triggers IDBKeyRange errors.
  - Fix: Validate and sanitize payload on the handler; coerce string IDs to numbers and update per-record using db.jobs.update(id, { order }) inside a transaction.

- Random 500 responses from MSW
  - The mock API intentionally simulates write errors to exercise optimistic UI and rollback handling. These are normal for testing resilience.

- React Strict Mode / double initialization
  - React 18 may run certain setup effects twice in development. Guard one-time side-effects (like DB seeding) with a ref.

- DnD measurement loops / "Maximum update depth exceeded"
  - Pass a stable numeric width to react-window (measure container once with ResizeObserver) and memoize row renderers to avoid repeated layout measurement loops that interact poorly with DnD measurement.

---

## Project purpose
TALENTFLOW was built as a portfolio project to demonstrate frontend engineering capabilities from the perspective of a backend/MLOps/cloud-focused engineer. The app intentionally exercises integration points that are common in production applications:
- local persistence and sync concerns (IndexedDB/Dexie),
- robust UI patterns for optimistic updates and rollback,
- accessibility-minded drag-and-drop interactions,
- performance under large lists (virtualization),
- and realistic API behavior (latency and intermittent failures via MSW).

---

## Author
Priyanshu Kumar  
Backend / MLOps / Cloud enthusiast. Building scalable systems and exploring advanced frontend UX to complement backend expertise.

- GitHub: https://github.com/priyanshuk6395  
- LinkedIn: https://www.linkedin.com/in/priyanshu-kumar-51452b232/

---

If you'd like, I can add a short troubleshooting script, automated dev/start scripts, or a CONTRIBUTING guide next.
