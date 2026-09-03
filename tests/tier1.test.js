/**
 * tier1.test.js
 * Happy path features coverage (35 test cases, 5 per feature).
 */

const { setupBrowserEnvironment } = require('./helpers/browserMock');
const { assert, assertEqual, assertContains } = require('./helpers/testFramework');
const mockApp = require('./helpers/mockApp');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const fs = require('fs');
const path = require('path');

// Helper to initialize clean app
async function setupCleanApp() {
  const indexPath = path.join(__dirname, '../index.html');
  let html = '';
  if (fs.existsSync(indexPath)) {
    html = fs.readFileSync(indexPath, 'utf8');
  }
  setupBrowserEnvironment(html);
  await mockApp.init();
}

// ==========================================
// FEATURE 1: Hero (F1) - 5 tests
// ==========================================

test("F1.1: Verify hero container exists in DOM", async () => {
  await setupCleanApp();
  const hero = document.getElementById("hero-section");
  assert(hero, "Hero section container should exist");
});

test("F1.2: Verify developer name 'HR0101' is correctly rendered inside the hero", async () => {
  await setupCleanApp();
  const nameEl = document.querySelector("[data-testid='hero-name']");
  assert(nameEl, "Hero name element should exist");
  assertEqual(nameEl.textContent, "HR0101", "Developer name must be HR0101");
});

test("F1.3: Verify developer title is rendered inside the hero", async () => {
  await setupCleanApp();
  const titleEl = document.querySelector("[data-testid='hero-title']");
  assert(titleEl, "Hero title element should exist");
  assertEqual(titleEl.textContent, "Senior Swift Developer & System Architect", "Title should match developer profile");
});

test("F1.4: Verify self-intro text is populated and non-empty", async () => {
  await setupCleanApp();
  const introEl = document.querySelector("[data-testid='hero-intro']");
  assert(introEl, "Hero intro element should exist");
  assert(introEl.textContent.length > 50, "Intro text should be descriptive");
});

test("F1.5: Verify social/GitHub/LinkedIn links exist and contain correct URLs", async () => {
  await setupCleanApp();
  const ghLink = document.querySelector("[data-testid='github-link']");
  const liLink = document.querySelector("[data-testid='linkedin-link']");
  
  assert(ghLink, "GitHub link should exist");
  assert(liLink, "LinkedIn link should exist");
  assertEqual(ghLink.getAttribute("href"), "https://github.com/HR0101", "GitHub link href must match developer profile");
  assertEqual(liLink.getAttribute("href"), "https://linkedin.com/in/hr0101", "LinkedIn link href must match developer profile");
});

// ==========================================
// FEATURE 2: Projects (F2) - 5 tests
// ==========================================

test("F2.1: Verify projects section header exists and displays counts", async () => {
  await setupCleanApp();
  const projHeader = document.querySelector("#projects-section h2");
  assert(projHeader, "Projects section header should exist");
  assertContains(projHeader.textContent, "Projects (19)", "Header should display project count of 19");
});

test("F2.2: Verify that 19 projects are loaded initially (all cards rendered)", async () => {
  await setupCleanApp();
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 19, "There should be exactly 19 project cards");
});

test("F2.3: Verify that language filtering works", async () => {
  await setupCleanApp();
  const swiftFilterBtn = document.querySelector("[data-testid='filter-lang-Swift-btn']");
  assert(swiftFilterBtn, "Swift filter button should exist");
  
  // Click Swift filter
  swiftFilterBtn.click();
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  // There are 5 Swift projects in our static database
  assertEqual(cards.length, 5, "Filtered list should contain 5 projects after selecting Swift");
  for (let i = 0; i < cards.length; i++) {
    const lang = cards[i].querySelector(".card-lang");
    assertEqual(lang.textContent, "Swift", "Each project card language should be Swift");
  }
});

test("F2.4: Verify that status filtering works", async () => {
  await setupCleanApp();
  const archivedFilterBtn = document.querySelector("[data-testid='filter-status-archived-btn']");
  assert(archivedFilterBtn, "Archived filter button should exist");
  
  // Click archived filter
  archivedFilterBtn.click();
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  // There are 3 archived projects in static database
  assertEqual(cards.length, 3, "Filtered list should contain 3 projects after selecting archived status");
  for (let i = 0; i < cards.length; i++) {
    const status = cards[i].querySelector(".card-status");
    assertEqual(status.textContent, "archived", "Each project card status should be archived");
  }
});

test("F2.5: Verify project search works", async () => {
  await setupCleanApp();
  const searchInput = document.querySelector("[data-testid='project-search']");
  assert(searchInput, "Search input should exist");
  
  // Type 'Audio'
  searchInput.value = "Audio";
  searchInput.dispatchEvent("input");
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 1, "Only one project should match 'Audio'");
  const nameEl = cards[0].querySelector(".project-card-name");
  assertEqual(nameEl.textContent, "Swift-Audio-Engine", "Matched project should be Swift-Audio-Engine");
});

// ==========================================
// FEATURE 3: Skills (F3) - 5 tests
// ==========================================

test("F3.1: Verify technical skills section header exists", async () => {
  await setupCleanApp();
  const header = document.querySelector("#skills-section h2");
  assert(header, "Skills section header should exist");
  assertEqual(header.textContent, "Technical Skills", "Header text should match Technical Skills");
});

test("F3.2: Verify mobile, frontend, and backend categories are rendered", async () => {
  await setupCleanApp();
  const mobileCat = document.querySelector("[data-testid='skills-mobile']");
  const frontendCat = document.querySelector("[data-testid='skills-frontend']");
  const backendCat = document.querySelector("[data-testid='skills-backend']");
  
  assert(mobileCat, "Mobile skills category should exist");
  assert(frontendCat, "Frontend skills category should exist");
  assert(backendCat, "Backend skills category should exist");
});

test("F3.3: Verify Swift skill element is rendered in mobile category", async () => {
  await setupCleanApp();
  const swiftEl = document.querySelector("[data-testid='skill-swift']");
  assert(swiftEl, "Swift skill should be rendered");
  assertContains(swiftEl.textContent, "Swift", "Skill text should contain Swift");
});

test("F3.4: Verify Swift is rendered with prominent styling/class", async () => {
  await setupCleanApp();
  const swiftEl = document.querySelector("[data-testid='skill-swift']");
  assert(swiftEl.classList.contains("prominent-skill"), "Swift must have the 'prominent-skill' class");
});

test("F3.5: Verify other skills are correctly listed in their categories", async () => {
  await setupCleanApp();
  const objcEl = document.querySelector("[data-testid='skill-objc']");
  const jsEl = document.querySelector("[data-testid='skill-js']");
  const goEl = document.querySelector("[data-testid='skill-go']");
  
  assert(objcEl, "Objective-C should be listed");
  assert(jsEl, "JavaScript should be listed");
  assert(goEl, "Go should be listed");
});

// ==========================================
// FEATURE 4: Timeline (F4) - 5 tests
// ==========================================

test("F4.1: Verify timeline section exists", async () => {
  await setupCleanApp();
  const timeline = document.getElementById("timeline-section");
  assert(timeline, "Timeline section should exist");
});

test("F4.2: Verify timeline renders list of achievements/projects", async () => {
  await setupCleanApp();
  const items = document.querySelectorAll("[data-testid^='timeline-item-']");
  assertEqual(items.length, 4, "There should be exactly 4 achievements in timeline");
});

test("F4.3: Verify timeline list element exists", async () => {
  await setupCleanApp();
  const list = document.querySelector("[data-testid='timeline-list']");
  assert(list, "Timeline list element should exist");
});

test("F4.4: Verify years are correctly rendered in timeline", async () => {
  await setupCleanApp();
  const year0 = document.querySelector("[data-testid='timeline-year-0']");
  const year3 = document.querySelector("[data-testid='timeline-year-3']");
  
  assert(year0, "Timeline year 0 should exist");
  assert(year3, "Timeline year 3 should exist");
  assertEqual(year0.textContent, "2026", "First timeline entry year should be 2026");
  assertEqual(year3.textContent, "2023", "Fourth timeline entry year should be 2023");
});

test("F4.5: Verify timeline text descriptions match achievements data", async () => {
  await setupCleanApp();
  const title0 = document.querySelector("[data-testid='timeline-title-0']");
  assert(title0, "First achievement title should exist");
  assertContains(title0.textContent, "Released SwiftUI-Dashboard and go-http-mux", "Title must match static achievements database");
});

// ==========================================
// FEATURE 5: Blog (F5) - 5 tests
// ==========================================

test("B1.1: Verify blog section contains recent blog posts", async () => {
  await setupCleanApp();
  const blogList = document.querySelector("[data-testid='blog-list']");
  assert(blogList, "Blog list should exist");
});

test("B1.2: Verify blog titles and dates are displayed", async () => {
  await setupCleanApp();
  const firstPostTitle = document.querySelector("[data-testid='blog-title-blog-1']");
  assert(firstPostTitle, "First blog post title should be visible");
  assertEqual(firstPostTitle.textContent, "Getting Started with Swift", "Blog title must match database");
});

test("B1.3: Verify clicking a blog post opens its detail view", async () => {
  await setupCleanApp();
  const firstPostCard = document.querySelector("[data-testid='blog-post-0']");
  assert(firstPostCard, "First blog card should exist");
  
  // Click first blog post
  firstPostCard.click();
  
  const detail = document.querySelector("[data-testid='blog-post-detail']");
  assert(detail, "Blog post detail view should be rendered");
  const content = document.querySelector("[data-testid='blog-content']");
  assert(content, "Blog post content container should exist");
});

test("B1.4: Verify back button in blog detail view returns the user to the list", async () => {
  await setupCleanApp();
  // Go to detail
  document.querySelector("[data-testid='blog-post-0']").click();
  
  const backBtn = document.getElementById("blog-back-btn");
  assert(backBtn, "Back button should exist");
  backBtn.click();
  
  const blogList = document.querySelector("[data-testid='blog-list']");
  assert(blogList, "Blog list should be rendered again after clicking back");
});

test("B1.5: Verify simple markdown heading rendering", async () => {
  await setupCleanApp();
  // Click first blog post
  document.querySelector("[data-testid='blog-post-0']").click();
  
  const h1 = document.querySelector("[data-testid='blog-content'] h1");
  assert(h1, "Markdown header should be rendered as an h1 tag");
  assertEqual(h1.textContent, "Getting Started with Swift", "H1 text must match markdown header");
});

// ==========================================
// FEATURE 6: Dark/Light mode (F6) - 5 tests
// ==========================================

test("D1.1: Verify theme toggle button exists in DOM", async () => {
  await setupCleanApp();
  const toggle = document.querySelector("[data-testid='theme-toggle']");
  assert(toggle, "Theme toggle button should exist");
});

test("D1.2: Verify default theme is light mode", async () => {
  await setupCleanApp();
  const isDark = document.documentElement.classList.contains("dark");
  assert(!isDark, "Default theme should be light (documentElement should not have class 'dark')");
});

test("D1.3: Verify clicking the toggle button adds the 'dark' class", async () => {
  await setupCleanApp();
  const toggle = document.querySelector("[data-testid='theme-toggle']");
  toggle.click();
  
  const isDark = document.documentElement.classList.contains("dark");
  assert(isDark, "Theme should become dark (documentElement should have class 'dark')");
});

test("D1.4: Verify theme state is saved to localStorage as 'dark'", async () => {
  await setupCleanApp();
  const toggle = document.querySelector("[data-testid='theme-toggle']");
  toggle.click();
  
  const saved = localStorage.getItem("theme");
  assertEqual(saved, "dark", "Theme should be saved to localStorage as 'dark'");
});

test("D1.5: Verify clicking the toggle button again removes the 'dark' class", async () => {
  await setupCleanApp();
  const toggle = document.querySelector("[data-testid='theme-toggle']");
  // Click 1: light -> dark
  toggle.click();
  // Click 2: dark -> light
  toggle.click();
  
  const isDark = document.documentElement.classList.contains("dark");
  assert(!isDark, "documentElement class 'dark' should be removed after double click");
  assertEqual(localStorage.getItem("theme"), "light", "Theme in localStorage should be updated to 'light'");
});

// ==========================================
// FEATURE 7: GitHub API & caching (F7) - 5 tests
// ==========================================

test("G1.1: Verify fetch is called on mount if localStorage is empty", async () => {
  // Clear localStorage and setup new env
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  let fetchCalledCount = 0;
  const originalFetch = global.fetch;
  global.fetch = function(...args) {
    fetchCalledCount++;
    return originalFetch(...args);
  };
  
  await mockApp.init();
  assert(fetchCalledCount > 0, "Fetch must be called on initialization when cache is empty");
});

test("G1.2: Verify API response is cached in localStorage with current timestamp", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  await mockApp.init();
  const cacheStr = localStorage.getItem("github_repos_cache");
  assert(cacheStr, "Cache should be stored in localStorage");
  
  const cacheObj = JSON.parse(cacheStr);
  assert(cacheObj.timestamp, "Cache object must have timestamp");
  assert(Array.isArray(cacheObj.data), "Cache object data must be an array");
  assertEqual(cacheObj.data.length, 19, "Cached data should contain 19 repositories");
});

test("G1.3: Verify cached data is loaded directly from localStorage on subsequent initializations without fetch", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  // Initialize once to populate cache
  await mockApp.init();
  
  const cacheStr = localStorage.getItem("github_repos_cache");
  
  // Set up second run
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("github_repos_cache", cacheStr);
  
  let fetchCalled = false;
  global.fetch = function() {
    fetchCalled = true;
    return Promise.resolve({ status: 500 });
  };
  
  await mockApp.init();
  assert(!fetchCalled, "Fetch should not be called if a valid cache exists in localStorage");
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 19, "Projects should still be rendered from cache");
});

test("G1.4: Verify project list updates with stars and details returned from fetch", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  // Custom mock repo data returning high stargazers
  global.fetch.mockData = [
    {
      name: "SwiftUI-Dashboard",
      description: "Custom stars desc",
      stargazers_count: 9999,
      language: "Swift",
      updated_at: "2026-06-01T12:00:00Z"
    }
  ];
  
  await mockApp.init();
  
  const card = document.querySelector("[data-testid='project-card-0']");
  assert(card, "First project card should be rendered");
  const stars = card.querySelector(".card-stars");
  assertEqual(stars.textContent, "★ 9999", "Stargazers count should reflect API return");
  
  // Clean mockData
  global.fetch.mockData = null;
});

test("G1.5: Verify api status is set to success after a successful fetch", async () => {
  await setupCleanApp();
  assertEqual(mockApp.appState.apiStatus, "success", "API status should be success");
});

module.exports = tests;
