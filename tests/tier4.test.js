/**
 * tier4.test.js
 * End-to-end user scenario flows (5 test cases).
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

test("F4.S1: Recruiter Journey - Profile review, Swift specialty check, project detail read, and dark mode preview", async () => {
  await setupCleanApp();
  
  // 1. Recruiter verifies developer name
  const nameEl = document.querySelector("[data-testid='hero-name']");
  assertEqual(nameEl.textContent, "HR0101", "Developer name is HR0101");
  
  // 2. Checks skills to see if Swift is prominent
  const swiftSkill = document.querySelector("[data-testid='skill-swift']");
  assert(swiftSkill.classList.contains("prominent-skill"), "Swift must be highlighted as a prominent skill");
  
  // 3. Filters projects by Swift
  document.querySelector("[data-testid='filter-lang-Swift-btn']").click();
  const swiftCards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(swiftCards.length, 5, "Should display 5 Swift projects");
  
  // 4. Opens SwiftUI-Dashboard details
  const dashboardCard = Array.from(swiftCards).find(card => card.querySelector(".project-card-name").textContent === "SwiftUI-Dashboard");
  assert(dashboardCard, "SwiftUI-Dashboard card should be found");
  dashboardCard.click();
  
  // 5. Verifies detail page contents
  const detailName = document.querySelector("[data-testid='project-detail-name']");
  assertEqual(detailName.textContent, "SwiftUI-Dashboard");
  const detailStars = document.querySelector(".project-stars");
  assertContains(detailStars.textContent, "★ 120");
  
  // 6. Clicks back to projects list
  document.querySelector("[data-testid='project-back-btn']").click();
  assert(document.querySelector("[data-testid='project-list']"), "Should return to projects list");
  
  // 7. Toggles dark mode to preview visual styling
  document.querySelector("[data-testid='theme-toggle']").click();
  assert(document.documentElement.classList.contains("dark"), "Dark mode should be active for preview");
});

test("F4.S2: Offline Visitor - Load site while offline, verify local fallback data, read project details, and read blog", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  // 1. Simulating offline visitor
  global.fetch.isOffline = true;
  await mockApp.init();
  
  // 2. Verify offline status banner is displayed
  const banner = document.querySelector("[data-testid='api-status']");
  assert(banner, "Offline banner must be rendered");
  assertContains(banner.textContent, "Offline");
  
  // 3. Verify all 19 projects are loaded from static database fallback
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 19, "All 19 fallback projects should render offline");
  
  // 4. Filter by Rust
  document.querySelector("[data-testid='filter-lang-Rust-btn']").click();
  const rustCards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(rustCards.length, 2, "Should filter Rust projects (2 projects) offline");
  
  // 5. Clicks a Rust project detail and goes back
  rustCards[0].click();
  assert(document.querySelector("[data-testid='project-detail']"));
  document.querySelector("[data-testid='project-back-btn']").click();
  
  // 6. Navigate to blog and read post
  document.querySelector("[data-testid='blog-post-0']").click();
  const blogDetail = document.querySelector("[data-testid='blog-post-detail']");
  assert(blogDetail, "Blog post detail should render offline");
  assertContains(blogDetail.querySelector("[data-testid='blog-content']").innerHTML, "Getting Started with Swift");
  
  global.fetch.isOffline = false;
});

test("F4.S3: Project Discovery - Search, filter, and detail drill down flow", async () => {
  await setupCleanApp();
  
  // 1. User wants to search for 'Engine' projects
  const searchInput = document.querySelector("[data-testid='project-search']");
  searchInput.value = "Engine";
  searchInput.dispatchEvent("input");
  
  let cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 1, "Only 1 project should match 'Engine'");
  assertEqual(cards[0].querySelector(".project-card-name").textContent, "Swift-Audio-Engine");
  
  // 2. Clear search and filter by JavaScript + completed
  searchInput.value = "";
  searchInput.dispatchEvent("input");
  
  document.querySelector("[data-testid='filter-lang-JavaScript-btn']").click();
  document.querySelector("[data-testid='filter-status-completed-btn']").click();
  
  cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 1, "Only 1 completed JavaScript project should match");
  assertEqual(cards[0].querySelector(".project-card-name").textContent, "js-canvas-game");
  
  // 3. Open details to view stargazers and full description
  cards[0].click();
  const starsEl = document.querySelector(".project-stars");
  assertContains(starsEl.textContent, "★ 90");
  const detailsEl = document.querySelector(".project-long-details");
  assertContains(detailsEl.textContent, "2D platformer game");
});

test("F4.S4: Blog Reader - Read blog lists, select XSS article, verify sanitization, read in dark mode", async () => {
  await setupCleanApp();
  
  // 1. Reader scrolls to blog posts list and clicks the XSS post
  const xssPostCard = document.querySelector("[data-testid='blog-post-2']");
  assert(xssPostCard, "XSS post card should be found");
  xssPostCard.click();
  
  // 2. Verify that markdown renders headings and text safely
  const blogContent = document.querySelector("[data-testid='blog-content']");
  assert(blogContent, "Blog content container should render");
  
  // 3. Verify sanitization: script tag text is escaped and no script element is present in DOM
  const scriptElement = blogContent.querySelector("script");
  assertEqual(scriptElement, null, "No script element should exist in rendered markdown HTML");
  assertContains(blogContent.innerHTML, "&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;", "Payload script text must be escaped in HTML");
  
  // 4. Reader toggles dark mode to read comfortably
  document.querySelector("[data-testid='theme-toggle']").click();
  assert(document.documentElement.classList.contains("dark"), "Dark mode is enabled while reading post");
  
  // 5. Clicks back to return to blog home list
  document.getElementById("blog-back-btn").click();
  assert(document.querySelector("[data-testid='blog-list']"), "Returned to blog listing page");
});

test("F4.S5: GitHub Cache Refresh - Cache fill, cache read (offline), cache expiration check, online refresh", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  // 1. Initial online load - fills cache
  await mockApp.init();
  const initialCache = localStorage.getItem("github_repos_cache");
  assert(initialCache, "Cache should be written on first load");
  
  // 2. Go offline, re-initialize - loads from cache without offline banner
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("github_repos_cache", initialCache);
  global.fetch.isOffline = true;
  
  await mockApp.init();
  const banner = document.querySelector("[data-testid='api-status']");
  assertEqual(banner, null, "Should load from valid cache without displaying offline banner");
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 19, "Loaded from cache successfully");
  
  // 3. Simulate cache expiration (2 hours ago)
  const expiredTime = Date.now() - (2 * 60 * 60 * 1000);
  const cacheObj = JSON.parse(initialCache);
  cacheObj.timestamp = expiredTime;
  localStorage.setItem("github_repos_cache", JSON.stringify(cacheObj));
  
  // 4. Go online, re-initialize - triggers a fetch, updates cache
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("github_repos_cache", JSON.stringify(cacheObj));
  global.fetch.isOffline = false;
  
  let fetchCalled = false;
  const originalFetch = global.fetch;
  global.fetch = function(...args) {
    fetchCalled = true;
    return originalFetch(...args);
  };
  
  await mockApp.init();
  assert(fetchCalled, "Fetch should be triggered since cached data is expired");
  
  const newCache = localStorage.getItem("github_repos_cache");
  assert(newCache, "New cache must be written");
  const newCacheObj = JSON.parse(newCache);
  assert(newCacheObj.timestamp > expiredTime, "New cache timestamp should be updated to current time");
});

module.exports = tests;
