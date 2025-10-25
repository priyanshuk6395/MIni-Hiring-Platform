# TALENTFLOW - Mini Hiring Platform

TALENTFLOW is a high-fidelity, single-file React application that simulates a mini hiring platform. It is fully persistent in your browser using **IndexedDB (via Dexie.js)** and features a complete mock API powered by **Mock Service Worker (MSW)**.

The entire application—including all components, database logic, API mocks, and state management—is contained within `App.jsx`.

## ✨ Key Features

  * **Persistent Local Database:** All data (jobs, candidates, assessments) is stored in IndexedDB, so your state persists across page loads.
  * **Realistic Mock API:** MSW intercepts all network requests, simulating real-world API behavior, including artificial latency and random 500-level errors.
  * **Jobs Board:**
      * Create, list, and filter jobs.
      * Drag-and-drop reordering of jobs with optimistic updates and error rollback.
  * **Candidate Management:**
      * **Create Candidates:** Add new candidates via a modal form and assign them to active jobs.
      * **Virtualized List:** Smoothly renders a list of 1,000+ candidates using `react-window`.
      * **Kanban Board:** A fully functional drag-and-drop Kanban board to move candidates between stages (Applied, Screen, Tech, etc.).
  * **Assessment Builder:**
      * Dynamically create multi-section assessments with various question types (text, single/multi-choice, numeric, file).
      * Includes a live preview pane to see the fillable form as you build it.
      * Supports conditional logic (e.g., "show Q2 only if Q1 is 'Yes'").

-----

## 🔗 Deployed Link: https://m-ini-hiring-platform.vercel.app/

## 🚀 Getting Started

### 1\. Prerequisites

  * [Node.js](https://nodejs.org/) (v18 or later)
  * A package manager (npm, yarn, or pnpm)
  * A Vite-based React project (`npm create vite@latest`)

### 2\. Dependencies

Install the required dependencies:

```bash
npm install react-dom dexie msw@^2 react-window @dnd-kit/core @dnd-kit/modifiers @dnd-kit/sortable @dnd-kit/utilities lucide-react
```

### 3\. Setup Files

You must create four specific files in your project:

**1. `tailwind 4.0 setup`**


**2. `src/index.css`** (your main CSS file)

```css
@import "tailwindcss";

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f5f9; /* coolGray-100 */
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #94a3b8; /* coolGray-400 */
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b; /* coolGray-500 */
}
```

**3. `src/App.jsx`**

  * Copy and paste the entire `App.jsx` content you were provided into this file.

**4. `src/main.jsx`** (your app's entry point)

  * This file is crucial for starting the MSW worker.

<!-- end list -->

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App, { worker } from './App.jsx'
import './index.css'

// Start the service worker
worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
```

### 4\. Initialize MSW

Run the MSW `init` command to create the Service Worker file in your `public` directory.

```bash
npx msw init public/
```

### 5\. Run the App

```bash
npm run dev
```

Open `http://localhost:5173` (or the port Vite assigns) in your browser. The app will load, seed the database, and be ready to use.

-----

## 🛠️ Tech Stack

  * **React:** Functional components, Hooks
  * **Styling:** Tailwind CSS
  * **Local Database:** Dexie.js (wrapper for IndexedDB)
  * **API Mocking:** Mock Service Worker (MSW)
  * **Drag & Drop:** `@dnd-kit`
  * **List Virtualization:** `react-window`
  * **Icons:** `lucide-react`

-----

## 🤖 Mock API Endpoints

All endpoints are defined in `App.jsx` and interact with the Dexie database.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/jobs` | Fetches jobs with pagination, search, and status filter. |
| `POST` | `/jobs` | Creates a new job. |
| `PATCH`| `/jobs/:id` | Updates a specific job. |
| `PATCH`| `/jobs/reorder` | Bulk updates job order (for D\&D). |
| `GET` | `/candidates` | Fetches candidates with pagination, search, and stage filter. |
| `POST` | `/candidates` | Creates a new candidate and assigns to a job. |
| `PATCH`| `/candidates/:id`| Updates a candidate (used for changing stages). |
| `GET` | `/candidates/:id/timeline` | Fetches a mock event timeline for a candidate. |
| `GET` | `/assessments/:jobId` | Fetches the assessment structure for a job. |
| `PUT` | `/assessments/:jobId` | Creates or replaces the assessment for a job. |
| `POST` | `/assessments/:jobId/submit` | Submits a candidate's assessment responses. |
---

## 👤 Author
I'm a developer passionate about building robust and scalable systems. My interests include backend engineering, and cloud computing. This project was a chance to dive deep into the frontend and its ecosystem.

GitHub: https://github.com/priyanshuk6395

LinkedIn: https://linkedin.com/in/priyanshu-kumar-51452b232/
