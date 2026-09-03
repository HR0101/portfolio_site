/**
 * tier3.test.js
 * Cross-feature combinations (7 test cases).
 */

const { setupBrowserEnvironment } = require('./helpers/browserMock');
const { assert, assertEqual, assertContains } = require('./helpers/testFramework');
const mockApp = require('./helpers/mockApp');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const fs = require('fs');
const path = require('path');

async function setupCleanApp() {
  const indexPath = path.join(__dirname, '../index.html');
  let html = '';
  if (fs.existsSync(indexPath)) {
    html = fs.readFileSync(indexPath, 'utf8');
  }
  setupBrowserEnvironment(html);
  await mockApp.init();
}

test("F3.C1: Filter projects by language while in dark mode and verify theme persistence", async () => {
  await setupCleanApp();
  
  // 1. Enable dark mode
  const themeToggle = document.querySelector("[data-testid='theme-toggle']");
  themeToggle.click();
  assert(document.documentElement.classList.contains("dark"), "Should have dark class");
  
  // 2. Filter projects by Swift
  const swiftBtn = document.querySelector("[data-testid='filter-lang-Swift-btn']");
  swiftBtn.click();
  
  // 3. Verify project list updates, and theme is unchanged
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 5, "Should show 5 Swift projects");
  assert(document.documentElement.classList.contains("dark"), "Dark mode class must persist after filtering projects");
});

test("F3.C2: Perform project search and click details while in dark mode", async () => {
  await setupCleanApp();
  
  // 1. Enable dark mode
  document.querySelector("[data-testid='theme-toggle']").click();
  
  // 2. Search for "Audio"
  const searchInput = document.querySelector("[data-testid='project-search']");
  searchInput.value = "Audio";
  searchInput.dispatchEvent("input");
  
  // 3. Click search result
  const card = document.querySelector("[data-testid='project-card-0']");
  card.click();
  
  // 4. Verify detail page renders and theme persists
  const detailName = document.querySelector("[data-testid='project-detail-name']");
  assertEqual(detailName.textContent, "Swift-Audio-Engine", "Details must display Swift-Audio-Engine");
  assert(document.documentElement.classList.contains("dark"), "Dark mode must persist in project detail view");
  
  // 5. Click back and verify theme persists
  document.querySelector("[data-testid='project-back-btn']").click();
  assert(document.querySelector("[data-testid='project-search']"), "Should return to list");
  assert(document.documentElement.classList.contains("dark"), "Dark mode must persist after returning to list");
});

test("F3.C3: Read blog post (navigate to detail) while in dark mode", async () => {
  await setupCleanApp();
  
  // 1. Enable dark mode
  document.querySelector("[data-testid='theme-toggle']").click();
  
  // 2. Click blog post 1
  document.querySelector("[data-testid='blog-post-0']").click();
  
  // 3. Verify blog details rendered and theme persists
  const detailTitle = document.querySelector("[data-testid='blog-detail-title']");
  assertEqual(detailTitle.textContent, "Getting Started with Swift");
  assert(document.documentElement.classList.contains("dark"), "Dark mode must persist in blog post view");
  
  // 4. Go back and verify theme persists
  document.getElementById("blog-back-btn").click();
  assert(document.querySelector("[data-testid='blog-list']"));
  assert(document.documentElement.classList.contains("dark"), "Dark mode must persist after returning to blog list");
});

test("F3.C4: Verify that theme settings are preserved when repo data is fetched and updates DOM", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  // 1. Set theme in localStorage to dark
  localStorage.setItem("theme", "dark");
  
  // 2. Initialize app (which triggers fetch)
  await mockApp.init();
  
  // 3. Verify theme is dark and projects are loaded
  assert(document.documentElement.classList.contains("dark"), "Theme should load as dark on init");
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 19, "All 19 projects should be rendered");
});

test("F3.C5: Verify project filters (search) are preserved when navigating to a blog post and returning", async () => {
  await setupCleanApp();
  
  // 1. Search for "Engine"
  const searchInput = document.querySelector("[data-testid='project-search']");
  searchInput.value = "Engine";
  searchInput.dispatchEvent("input");
  
  // 2. Click blog post
  document.querySelector("[data-testid='blog-post-1']").click();
  assert(document.querySelector("[data-testid='blog-post-detail']"));
  
  // 3. Click blog back button
  document.getElementById("blog-back-btn").click();
  
  // 4. Verify search filter and cards count are preserved
  const searchInput2 = document.querySelector("[data-testid='project-search']");
  assertEqual(searchInput2.value, "Engine", "Search query should be preserved");
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 1, "Filter should still be applied");
});

test("F3.C6: Verify offline fallback renders banner and doesn't affect theme setting or list filtering", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  localStorage.setItem("theme", "dark");
  global.fetch.isOffline = true;
  
  await mockApp.init();
  
  // 1. Verify theme is dark
  assert(document.documentElement.classList.contains("dark"), "Dark mode persists in offline fallback");
  
  // 2. Verify offline banner
  const banner = document.querySelector("[data-testid='api-status']");
  assert(banner);
  assertContains(banner.textContent, "Offline");
  
  // 3. Filter by Go
  document.querySelector("[data-testid='filter-lang-Go-btn']").click();
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 2, "Should filter Go projects (2 projects) successfully while offline");
  
  global.fetch.isOffline = false;
});

test("F3.C7: Verify theme toggle, cache clearing, and new fetch lifecycle", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  // 1. Toggle to dark
  await mockApp.init();
  document.querySelector("[data-testid='theme-toggle']").click();
  assertEqual(localStorage.getItem("theme"), "dark");
  
  // 2. Clear project cache (leave theme)
  localStorage.removeItem("github_repos_cache");
  
  // 3. Re-initialize
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("theme", "dark");
  
  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = function(...args) {
    fetchCalled = true;
    return originalFetch(...args);
  };
  
  await mockApp.init();
  
  // 4. Verify dark mode is on, fetch was called, and cache was rebuilt
  assert(document.documentElement.classList.contains("dark"));
  assert(fetchCalled, "Fetch should be re-called since cache was deleted");
  assert(localStorage.getItem("github_repos_cache"), "Cache should be recreated");
});

module.exports = tests;
