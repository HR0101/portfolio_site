# Portfolio Site Migration to Next.js (App Router)

This document outlines the architecture, layout, interface contracts, and implementation plan for migrating the current React/Vite portfolio site to Next.js 14.x (App Router) with TypeScript.

---

## 1. Architecture

The migrated application will utilize **Next.js 14 (App Router)** as its core framework. The architecture focuses on maximizing performance and SEO by using Server Components where possible, while keeping interactive parts as Client Components.

```
┌────────────────────────────────────────────────────────┐
│                      app/layout                        │
│   (HTML/Body, Globals, ThemeToggle, Navbar, Footer)    │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
      app/page.tsx                  app/blog/[id]/page.tsx
  (Main Landing Page)               (Static/Dynamic Post)
  ├── Hero (Server)                 ├── Back Button (Client)
  ├── Projects (Client)             └── Markdown Content (Server)
  ├── Skills (Server)
  ├── Timeline (Server)
  └── Blog (Server)
```

### Server vs. Client Component Boundaries
- **Root Layout (`src/app/layout.tsx`)**: Server Component. Renders base HTML, injects the initial dark mode blocker script (to avoid visual flash on load), and wraps pages in the client-side navbar, footer, and theme shell.
- **Home Page (`src/app/page.tsx`)**: Server Component. It coordinates the static rendering of the main page sections.
- **Hero, Skills, Timeline, Blog list**: Server Components by default. They contain static metadata and can render directly to HTML on the server.
- **Projects Section (`src/sections/Projects.tsx`)**: Client Component (`"use client"`). Requires client-side state for search query text, category and status filtering, project selection, and client-side REST fetching.
- **Theme Toggle (`src/components/ThemeToggle.tsx`)**: Client Component (`"use client"`). Reads and writes to `localStorage` and toggles CSS class on `document.documentElement`.
- **Blog Detail (`src/app/blog/[id]/page.tsx`)**: Server Component. Extracts the static blog content on the server, parses Markdown to HTML, and renders static markup. A simple client-side back button is embedded.

### Routing Scheme
To align with Next.js best practices and improve indexability, the application will transition from Vite's **client-side hash routing** (`#about`, `#projects`, `#blog/blog-1`) to **Next.js file-system routing**.
- `/` -> Renders the unified landing page containing all sections: Hero, Projects, Skills, Timeline, and Blog. Hash links in the Navbar (e.g. `#projects`) will act as standard anchor links that scroll to sections.
- `/blog/[id]` -> A dedicated dynamic page rendering the blog post details. This replaces the inline hash view `#blog/blog-1`.
- *Fallback/Compatibility*: To ensure compatibility with the existing E2E test suite (which interacts with specific section wrappers on a single page), we will render the five sections with their corresponding IDs (`hero-section`, `projects-section`, `skills-section`, `timeline-section`, `blog-section`) directly on the home page `/`.

### GitHub API & Offline Mock Design
The portfolio displays repository data from GitHub for user `HR0101`. To comply with `CODE_ONLY` network restrictions and provide a resilient user experience:
1. **API Route Proxy**: Next.js will serve a local API Route Handler at `/api/github`.
2. **Server-Side Fetching with Fallback**: The Route Handler tries to fetch from `https://api.github.com/users/HR0101/repos`.
3. **Graceful Fallbacks**:
   - If the fetch fails (due to offline environments like the local agent running `CODE_ONLY`), it catches the error and serves the mock database `staticProjects` with a custom HTTP header or JSON metadata indicating the API status is `offline`.
   - If the fetch returns a `403` status (GitHub Rate Limit exceeded), it returns `staticProjects` with a status of `rate_limited`.
4. **Client Caching**: The client page calling `/api/github` caches successful responses in `localStorage` with a 1-hour expiration timestamp. If the local storage contains a valid unexpired cache, the client bypasses the API call entirely.

### Tailwind v4 Setup in Next.js
Next.js will compile Tailwind CSS v4 using PostCSS.
- `@tailwindcss/postcss` and `tailwindcss` will be configured in `postcss.config.js`.
- The global stylesheet `/src/app/globals.css` will import Tailwind via `@import "tailwindcss";` or `@theme` declarations.

---

## 2. Interface Contracts

To enforce type-safety across components and services, the following TypeScript interfaces are defined:

```typescript
// src/services/githubService.ts or src/types/index.ts

export interface Project {
  name: string;
  language: string;
  status: 'active' | 'completed' | 'archived';
  stars: number;
  updatedAt: string;
  description: string;
  details: string;
}

export type ApiStatus = 'success' | 'offline' | 'rate_limited' | 'loading';

export interface GitHubApiResponse {
  projects: Project[];
  apiStatus: ApiStatus;
}

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  content: string;
}

export interface CareerAchievement {
  year: string;
  title: string;
}
```

---

## 3. Code Layout

The project files will transition from the Vite structure to the following layout:

```
portfolio_site/
├── .agents/                              # Agent scratchpads and handoffs
├── public/                               # Static assets (favicons, images)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── github/
│   │   │       └── route.ts              # GET endpoint for GitHub repos with mock fallback
│   │   ├── blog/
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Dynamic route for blog post details
│   │   ├── globals.css                   # Global styles + Tailwind directives
│   │   ├── layout.tsx                    # Root Next.js Layout
│   │   └── page.tsx                      # Landing page (renders main sections)
│   ├── components/                       # Shared elements
│   │   ├── Footer.tsx
│   │   ├── Navbar.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ThemeProvider.tsx             # Context for managing dark mode
│   ├── hooks/                            # Custom React Hooks
│   │   └── useTheme.ts                   # Theme switcher hook
│   ├── sections/                         # Section-level content components
│   │   ├── Blog.tsx
│   │   ├── Hero.tsx
│   │   ├── Projects.tsx
│   │   ├── Skills.tsx
│   │   └── Timeline.tsx
│   └── services/                         # Data mock static files & fetch services
│       ├── blogService.ts                # Blog data & markdown parser utility
│       └── githubService.ts              # Client-side fetch helper interfacing with `/api/github`
├── tests/                                # E2E tests (unmodified, for DOM verification)
│   ├── helpers/
│   │   ├── browserMock.js
│   │   └── mockApp.js
│   └── run.js
├── index.html                            # Maintained dummy root for test suite compatibility
├── package.json                          # Next.js scripts & packages
├── postcss.config.js                     # Tailwind PostCSS configuration
├── tailwind.config.js                    # Legacy configurations/v4 compatibility if needed
└── tsconfig.json                         # Next.js TypeScript configuration
```

---

## 4. Implementation Milestones

### Milestone 1: Project Setup & Package Migration
- **Tasks**:
  1. Modify `package.json` to replace Vite scripts and dependencies with Next.js equivalents. Add `next` dependency and keep `react`, `react-dom`, `lucide-react` at current versions.
  2. Setup `tsconfig.json` for Next.js App Router rules.
  3. Configure Tailwind CSS v4 in PostCSS config (`postcss.config.js`).
- **Verification**: Run `npm install` and verify config files parse without warnings.

### Milestone 2: Root Shell, Theme & Layout
- **Tasks**:
  1. Create `/src/app/layout.tsx` incorporating the HTML structures, Google font settings, and global metadata.
  2. Implement `/src/components/ThemeProvider.tsx` and migrate `/src/hooks/useTheme.ts` to coordinate dark class lists.
  3. Set up the `ThemeToggle`, `Navbar`, and `Footer` in the layout.
  4. Create `/src/app/globals.css` with `@import "tailwindcss";` and verify styling matches.
- **Verification**: Run `npm run build` to verify layout compiles without errors. Spot-check HTML classes on server output.

### Milestone 3: Content Sections & Blog Details Dynamic Route
- **Tasks**:
  1. Port over static sections: `Hero.tsx`, `Skills.tsx`, `Timeline.tsx`, and `Blog.tsx` into `/src/sections/`.
  2. Recreate the Home page `/src/app/page.tsx` rendering all these sections sequentially inside container IDs expected by the tests.
  3. Implement the dynamic route `/src/app/blog/[id]/page.tsx`. Incorporate the XSS-safe markdown parsing utility inside `blogService.ts` to render Markdown contents dynamically.
- **Verification**: Ensure the blog post routes build statically (SSG) using `next build`.

### Milestone 4: Interactive Projects & GitHub API Integration
- **Tasks**:
  1. Implement Next.js Route Handler `/src/app/api/github/route.ts`. Add local static fallback returning `staticProjects` and state indicator when HTTP requests to GitHub fail.
  2. Port `Projects.tsx` component into a Client Component. Update `githubService.ts` to call `/api/github` and parse results, using localStorage client cache.
- **Verification**: Simulate network failure (e.g. running in offline sandbox) and verify projects list falls back to static projects with the offline banner.

### Milestone 5: E2E Suite Validation & Parity Check
- **Tasks**:
  1. Create or maintain the dummy `index.html` at the workspace root to avoid breaking the E2E mock runner environment.
  2. Execute the test command `node tests/run.js` to ensure the E2E mock runner validates all 91 test criteria successfully.
  3. Execute `npm run build` to confirm static export or optimized Next.js server bundling performs perfectly.
- **Verification**: Full test suite passes (0 failures, 91 passes) and build artifact compiles successfully.
