/**
 * helpers/mockApp.js
 * Conforming Mock Portfolio Site application mounting on Mock DOM.
 */

const staticProjects = [
  { name: "SwiftUI-Dashboard", language: "Swift", status: "active", stars: 120, updatedAt: "2026-06-01T12:00:00Z", description: "iOS Dashboard in SwiftUI", details: "A comprehensive dashboard for monitoring system performance on iOS, built entirely using SwiftUI." },
  { name: "Swift-Audio-Engine", language: "Swift", status: "completed", stars: 85, updatedAt: "2026-05-15T12:00:00Z", description: "CoreAudio wrapper in Swift", details: "Low-latency audio playback and recording library written in Swift." },
  { name: "Swift-URLSession-Client", language: "Swift", status: "active", stars: 45, updatedAt: "2026-04-20T12:00:00Z", description: "Networking client for Swift", details: "Type-safe, async/await friendly HTTP client wrapper around URLSession." },
  { name: "Swift-Crypto-Kit", language: "Swift", status: "archived", stars: 30, updatedAt: "2025-12-10T12:00:00Z", description: "CommonCrypto helper", details: "Easy cryptography APIs for iOS/macOS developers." },
  { name: "Swift-Combine-State", language: "Swift", status: "completed", stars: 60, updatedAt: "2026-02-18T12:00:00Z", description: "State management via Combine", details: "Redux-like state management implementation using Apple's Combine framework." },
  { name: "js-router-simple", language: "JavaScript", status: "active", stars: 55, updatedAt: "2026-06-03T12:00:00Z", description: "Frontend router in JS", details: "Zero-dependency client-side router for single-page applications." },
  { name: "js-canvas-game", language: "JavaScript", status: "completed", stars: 90, updatedAt: "2026-01-05T12:00:00Z", description: "HTML5 Canvas game", details: "A simple 2D platformer game made using HTML5 Canvas API." },
  { name: "js-markdown-parser", language: "JavaScript", status: "active", stars: 40, updatedAt: "2026-05-30T12:00:00Z", description: "Simple markdown renderer", details: "Regex-based markdown compiler that converts md strings to HTML." },
  { name: "ts-graphql-server", language: "TypeScript", status: "completed", stars: 110, updatedAt: "2026-04-12T12:00:00Z", description: "GraphQL template", details: "A production-ready Apollo Server template with TypeScript." },
  { name: "ts-validator-lib", language: "TypeScript", status: "active", stars: 75, updatedAt: "2026-05-25T12:00:00Z", description: "Schema validator for TS", details: "Runtime type checking and object validation library." },
  { name: "py-cli-weather", language: "Python", status: "completed", stars: 25, updatedAt: "2026-03-01T12:00:00Z", description: "Command line weather app", details: "Fetches and displays weather information in terminal using rich formatting." },
  { name: "py-django-blog", language: "Python", status: "archived", stars: 50, updatedAt: "2025-08-14T12:00:00Z", description: "Blog platform in Django", details: "Full-featured blogging engine with admin panel and Markdown editing." },
  { name: "py-scikit-learn-model", language: "Python", status: "completed", stars: 95, updatedAt: "2026-02-28T12:00:00Z", description: "Classification model pipeline", details: "Machine learning pipeline for predicting house prices." },
  { name: "go-http-mux", language: "Go", status: "active", stars: 80, updatedAt: "2026-06-05T12:00:00Z", description: "High performance router", details: "A lightweight, high-performance HTTP multiplexer for Go." },
  { name: "go-gRPC-service", language: "Go", status: "completed", stars: 65, updatedAt: "2026-03-15T12:00:00Z", description: "Microservice template", details: "gRPC service boilerplates with Prometheus metrics." },
  { name: "rust-json-parser", language: "Rust", status: "active", stars: 150, updatedAt: "2026-05-28T12:00:00Z", description: "Fast JSON parsing library", details: "A zero-copy JSON parser built from scratch in Rust." },
  { name: "rust-key-value-store", language: "Rust", status: "completed", stars: 105, updatedAt: "2026-04-01T12:00:00Z", description: "In-memory database", details: "Simple, thread-safe in-memory key-value database written in Rust." },
  { name: "kotlin-notes-app", language: "Kotlin", status: "completed", stars: 35, updatedAt: "2026-01-20T12:00:00Z", description: "Android notes application", details: "Clean architecture notes application using Jetpack Compose." },
  { name: "html-css-resume", language: "HTML/CSS", status: "archived", stars: 20, updatedAt: "2025-05-10T12:00:00Z", description: "Printable online CV template", details: "Responsive, print-friendly CV layout built using clean HTML and CSS grid." }
];

const staticBlogs = [
  { id: "blog-1", title: "Getting Started with Swift", date: "2026-06-05", content: "# Getting Started with Swift\nSwift is an amazing language.\nHere is some code:\n```swift\nprint(\"Hello, Swift!\")\n```" },
  { id: "blog-2", title: "Writing a Custom DOM Mock", date: "2026-05-20", content: "# Writing a Custom DOM Mock\nWhy write a mock when you can... write one!\n- Element\n- Document\n- Event" },
  { id: "blog-3", title: "XSS Protection in Blog Parsers", date: "2026-04-10", content: "# XSS Protection\nCheck this out: `<script>alert('XSS')</script>` is escaped!" }
];

const achievements = [
  { year: "2026", title: "Released SwiftUI-Dashboard and go-http-mux" },
  { year: "2025", title: "Built Swift-Crypto-Kit and py-django-blog" },
  { year: "2024", title: "Started studying iOS development and built portfolio site" },
  { year: "2023", title: "Graduated with Computer Science Degree" }
];

const appState = {
  projects: [],
  selectedLanguageFilter: "All",
  selectedStatusFilter: "All",
  searchQuery: "",
  selectedProject: null,
  selectedBlog: null,
  apiStatus: "loading",
  theme: "light"
};

function renderMarkdown(md) {
  if (!md) return '';

  // 1. Escape HTML entities to protect against XSS
  let escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 2. Multiline code blocks
  let text = escaped.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // 3. Tokenize/extract all inline code blocks
  const inlineBlocks = [];
  text = text.replace(/`([^`]+)`/g, (_match, codeContent) => {
    const placeholder = `__INLINE_CODE_PLACEHOLDER_${inlineBlocks.length}__`;
    inlineBlocks.push(codeContent);
    return placeholder;
  });

  // 4. Parse headings and lists
  text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  text = text.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');

  // 5. Paragraphs (split by lines and wrap non-header/non-list/non-code block lines in <p> tags)
  const lines = text.split('\n');
  let inCodeBlock = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';

    const containsPre = line.includes('<pre');
    const containsPreEnd = line.includes('</pre');

    const shouldNotWrap = inCodeBlock ||
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<li') ||
      containsPre ||
      containsPreEnd ||
      trimmed.startsWith('__INLINE_CODE_PLACEHOLDER_');

    if (containsPre && !containsPreEnd) {
      inCodeBlock = true;
    } else if (containsPreEnd) {
      inCodeBlock = false;
    }

    if (shouldNotWrap) {
      return line;
    }
    return `<p>${line}</p>`;
  });

  let joined = processedLines.filter(Boolean).join('\n');

  // 6. Re-inject the formatted inline code contents
  for (let i = 0; i < inlineBlocks.length; i++) {
    joined = joined.replace(`__INLINE_CODE_PLACEHOLDER_${i}__`, `<code>${inlineBlocks[i]}</code>`);
  }

  return joined;
}


function safeGetItem(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

function safeSetItem(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    // Ignore
  }
}

function safeRemoveItem(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // Ignore
  }
}

function fallbackToOffline() {
  const CACHE_KEY = "github_repos_cache";
  const cached = safeGetItem(CACHE_KEY);
  if (cached) {
    try {
      const parsedCache = JSON.parse(cached);
      if (parsedCache && Array.isArray(parsedCache.data)) {
        appState.projects = parsedCache.data;
        return;
      }
    } catch (e) {
      // Ignore corrupted cache
    }
  }
  appState.projects = staticProjects;
}

async function fetchGitHubRepos() {
  const CACHE_KEY = "github_repos_cache";
  const CACHE_LIMIT = 60 * 60 * 1000; // 1 hour
  
  const cached = safeGetItem(CACHE_KEY);
  if (cached) {
    try {
      const parsedCache = JSON.parse(cached);
      const now = Date.now();
      if (parsedCache && parsedCache.timestamp && Array.isArray(parsedCache.data) && (now - parsedCache.timestamp < CACHE_LIMIT)) {
        appState.projects = parsedCache.data;
        appState.apiStatus = "success";
        return;
      }
    } catch (e) {
      safeRemoveItem(CACHE_KEY);
    }
  }
  
  try {
    const response = await fetch("https://api.github.com/users/HR0101/repos");
    if (response.status === 403) {
      appState.apiStatus = "rate_limited";
      fallbackToOffline();
      return;
    }
    
    if (response.status !== 200) {
      throw new Error("HTTP Error");
    }
    
    const repos = await response.json();
    const mapped = repos.map(repo => {
      const sp = staticProjects.find(item => item.name === repo.name);
      return {
        name: repo.name,
        language: repo.language || "Unknown",
        status: sp ? sp.status : "active",
        stars: repo.stargazers_count || 0,
        updatedAt: repo.updated_at || new Date().toISOString(),
        description: repo.description || "",
        details: sp ? sp.details : (repo.description || "No details provided.")
      };
    });
    
    safeSetItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: mapped
    }));
    
    appState.projects = mapped;
    appState.apiStatus = "success";
  } catch (err) {
    appState.apiStatus = "offline";
    fallbackToOffline();
  }
}

function initTheme() {
  const theme = safeGetItem("theme") || "light";
  appState.theme = theme;
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function renderHero() {
  const container = document.getElementById("hero-section");
  if (!container) return;
  container.innerHTML = `
    <h1 class="hero-name" data-testid="hero-name">HR0101</h1>
    <h2 class="hero-title" data-testid="hero-title">Senior Swift Developer & System Architect</h2>
    <p class="hero-intro" data-testid="hero-intro">Welcome! I design clean, high-performance applications with Swift, JavaScript, Go, and Rust. Take a look at my projects and blog posts below.</p>
    <div class="hero-links">
      <a class="hero-link" href="https://github.com/HR0101" target="_blank" data-testid="github-link">GitHub</a>
      <a class="hero-link" href="https://linkedin.com/in/hr0101" target="_blank" data-testid="linkedin-link">LinkedIn</a>
    </div>
  `;
}

function renderProjects() {
  const container = document.getElementById("projects-section");
  if (!container) return;
  
  if (appState.selectedProject) {
    const p = appState.selectedProject;
    container.innerHTML = `
      <div class="project-detail" data-testid="project-detail">
        <button id="project-back-btn" data-testid="project-back-btn">← Back to Projects</button>
        <h2 class="project-detail-name" data-testid="project-detail-name">${p.name}</h2>
        <div class="project-meta">
          <span class="project-lang">Language: ${p.language}</span>
          <span class="project-status">Status: ${p.status}</span>
          <span class="project-stars">★ ${p.stars}</span>
          <span class="project-updated">Updated: ${new Date(p.updatedAt).toLocaleDateString()}</span>
        </div>
        <p class="project-description">${p.description}</p>
        <div class="project-long-details">${p.details}</div>
      </div>
    `;
    
    document.getElementById("project-back-btn").addEventListener("click", () => {
      appState.selectedProject = null;
      renderProjects();
    });
    return;
  }
  
  const filtered = appState.projects.filter(p => {
    const matchesLang = appState.selectedLanguageFilter === "All" || p.language === appState.selectedLanguageFilter;
    const matchesStatus = appState.selectedStatusFilter === "All" || p.status === appState.selectedStatusFilter;
    const q = appState.searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchesLang && matchesStatus && matchesSearch;
  });
  
  let banner = '';
  if (appState.apiStatus === "offline") {
    banner = `<div class="api-status-banner offline" data-testid="api-status">Offline. Showing cached/offline data.</div>`;
  } else if (appState.apiStatus === "rate_limited") {
    banner = `<div class="api-status-banner rate-limited" data-testid="api-status">Rate limit exceeded. Showing cached/offline data.</div>`;
  }
  
  const languages = ["All", "Swift", "JavaScript", "TypeScript", "Python", "Go", "Rust", "Kotlin", "HTML/CSS"];
  const statuses = ["All", "active", "completed", "archived"];
  
  const langBtns = languages.map(l => 
    `<button class="lang-filter-btn ${appState.selectedLanguageFilter === l ? 'active' : ''}" data-lang="${l}" data-testid="filter-lang-${l.replace('/', '-')}-btn" aria-pressed="${appState.selectedLanguageFilter === l}">${l}</button>`
  ).join(" ");
  
  const statusBtns = statuses.map(s => 
    `<button class="status-filter-btn ${appState.selectedStatusFilter === s ? 'active' : ''}" data-status="${s}" data-testid="filter-status-${s}-btn" aria-pressed="${appState.selectedStatusFilter === s}">${s}</button>`
  ).join(" ");
  
  const cards = filtered.map((p, idx) => `
    <div class="project-card" data-name="${p.name}" data-testid="project-card-${idx}">
      <h3 class="project-card-name" data-testid="project-name-${p.name}">${p.name}</h3>
      <p class="project-card-desc">${p.description}</p>
      <div class="project-card-meta">
        <span class="card-lang">${p.language}</span>
        <span class="card-status">${p.status}</span>
        <span class="card-stars">★ ${p.stars}</span>
      </div>
    </div>
  `).join("");
  
  container.innerHTML = `
    <h2>Projects (${filtered.length})</h2>
    ${banner}
    <div class="projects-filters">
      <input type="text" id="project-search" data-testid="project-search" placeholder="Search projects..." aria-label="Search projects" value="${appState.searchQuery}" />
      <div class="filter-group">
        <span>Language: </span>
        ${langBtns}
      </div>
      <div class="filter-group">
        <span>Status: </span>
        ${statusBtns}
      </div>
    </div>
    <div class="project-list" data-testid="project-list">
      ${cards ? cards : '<p class="no-projects" data-testid="no-projects">No projects found matching the criteria.</p>'}
    </div>
  `;
  
  const searchInput = document.getElementById("project-search");
  searchInput.addEventListener("input", (e) => {
    appState.searchQuery = e.target.value;
    const start = searchInput.selectionStart;
    const end = searchInput.selectionEnd;
    renderProjects();
    const newInp = document.getElementById("project-search");
    if (newInp) {
      newInp.focus();
      newInp.selectionStart = start;
      newInp.selectionEnd = end;
    }
  });
  
  container.querySelectorAll(".lang-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      appState.selectedLanguageFilter = btn.getAttribute("data-lang");
      renderProjects();
    });
  });
  
  container.querySelectorAll(".status-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      appState.selectedStatusFilter = btn.getAttribute("data-status");
      renderProjects();
    });
  });
  
  container.querySelectorAll(".project-card").forEach(card => {
    card.addEventListener("click", () => {
      const name = card.getAttribute("data-name");
      const p = appState.projects.find(item => item.name === name);
      if (p) {
        appState.selectedProject = p;
        renderProjects();
      }
    });
  });
}

function renderSkills() {
  const container = document.getElementById("skills-section");
  if (!container) return;
  container.innerHTML = `
    <h2>Technical Skills</h2>
    <div class="skills-container">
      <div class="skills-category" data-testid="skills-mobile">
        <h3>iOS & Mobile</h3>
        <ul>
          <li class="skill prominent-skill bg-slate-800 dark:bg-slate-950 px-2 py-1 rounded border border-slate-700 inline-block" data-testid="skill-swift" style="font-weight: bold; color: #f05138;">Swift (Expert / Specialty)</li>
          <li class="skill" data-testid="skill-objc">Objective-C</li>
          <li class="skill" data-testid="skill-flutter">Flutter</li>
        </ul>
      </div>
      <div class="skills-category" data-testid="skills-frontend">
        <h3>Frontend Web</h3>
        <ul>
          <li class="skill" data-testid="skill-js">JavaScript</li>
          <li class="skill" data-testid="skill-ts">TypeScript</li>
          <li class="skill" data-testid="skill-html">HTML/CSS</li>
        </ul>
      </div>
      <div class="skills-category" data-testid="skills-backend">
        <h3>Backend Systems</h3>
        <ul>
          <li class="skill" data-testid="skill-go">Go</li>
          <li class="skill" data-testid="skill-rust">Rust</li>
          <li class="skill" data-testid="skill-py">Python</li>
        </ul>
      </div>
    </div>
  `;
}

function renderTimeline() {
  const container = document.getElementById("timeline-section");
  if (!container) return;
  
  const items = achievements.map((item, idx) => `
    <div class="timeline-item" data-testid="timeline-item-${idx}">
      <span class="timeline-year" data-testid="timeline-year-${idx}">${item.year}</span>
      <p class="timeline-title" data-testid="timeline-title-${idx}">${item.title}</p>
    </div>
  `).join("");
  
  container.innerHTML = `
    <h2>Career Timeline</h2>
    <div class="timeline-list" data-testid="timeline-list">
      ${items}
    </div>
  `;
}

function renderBlog() {
  const container = document.getElementById("blog-section");
  if (!container) return;
  
  if (appState.selectedBlog) {
    const post = appState.selectedBlog;
    const parsed = renderMarkdown(post.content);
    container.innerHTML = `
      <div class="blog-post-detail" data-testid="blog-post-detail">
        <button id="blog-back-btn" data-testid="blog-back-btn">← Back to Blog</button>
        <h2 class="blog-detail-title" data-testid="blog-detail-title">${post.title}</h2>
        <span class="blog-date">${post.date}</span>
        <div class="blog-content" data-testid="blog-content">${parsed}</div>
      </div>
    `;
    
    document.getElementById("blog-back-btn").addEventListener("click", () => {
      appState.selectedBlog = null;
      renderBlog();
    });
    return;
  }
  
  const items = staticBlogs.map((b, idx) => `
    <div class="blog-post-card" data-id="${b.id}" data-testid="blog-post-${idx}">
      <h3 class="blog-post-title" data-testid="blog-title-${b.id}">${b.title}</h3>
      <span class="blog-post-date">${b.date}</span>
      <p class="blog-post-summary">Click to read this article...</p>
    </div>
  `).join("");
  
  container.innerHTML = `
    <h2>Recent Blog Posts</h2>
    <div class="blog-list" data-testid="blog-list">
      ${items}
    </div>
  `;
  
  container.querySelectorAll(".blog-post-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const post = staticBlogs.find(item => item.id === id);
      if (post) {
        appState.selectedBlog = post;
        renderBlog();
      }
    });
  });
}

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark");
    appState.theme = isDark ? "dark" : "light";
    safeSetItem("theme", appState.theme);
  });
}

async function init() {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element #root not found");
  }

  // Reset appState variables to prevent leak across tests
  appState.projects = [];
  appState.selectedLanguageFilter = "All";
  appState.selectedStatusFilter = "All";
  appState.searchQuery = "";
  appState.selectedProject = null;
  appState.selectedBlog = null;
  appState.apiStatus = "loading";
  appState.theme = "light";

  // Restore potentially mutated static databases
  staticBlogs[0].content = "# Getting Started with Swift\nSwift is an amazing language.\nHere is some code:\n```swift\nprint(\"Hello, Swift!\")\n```";
  achievements[0].title = "Released SwiftUI-Dashboard and go-http-mux";
  root.innerHTML = `
    <div id="app-shell">
      <header class="app-header">
        <div class="header-top">
          <button id="theme-toggle" data-testid="theme-toggle">Toggle Dark Mode</button>
        </div>
        <div id="hero-section" class="section"></div>
      </header>
      <main>
        <section id="projects-section" class="section"></section>
        <section id="skills-section" class="section"></section>
        <section id="timeline-section" class="section"></section>
        <section id="blog-section" class="section"></section>
      </main>
    </div>
  `;
  
  initTheme();
  setupThemeToggle();
  renderHero();
  renderSkills();
  renderTimeline();
  renderBlog();
  
  // Asynchronously fetch projects, rendering loading state initially
  const projSection = document.getElementById("projects-section");
  if (projSection) {
    projSection.innerHTML = `<h2>Projects</h2><p data-testid="projects-loading">Loading projects from GitHub...</p>`;
  }
  
  await fetchGitHubRepos();
  renderProjects();
}

module.exports = {
  appState,
  init,
  staticProjects,
  staticBlogs,
  achievements,
  renderMarkdown,
  initTheme,
  renderProjects,
  renderHero,
  renderSkills,
  renderTimeline,
  renderBlog
};
