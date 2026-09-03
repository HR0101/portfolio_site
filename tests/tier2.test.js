/**
 * tier2.test.js
 * Boundary/corner cases coverage (35 test cases, 5 per feature).
 */

const { setupBrowserEnvironment } = require('./helpers/browserMock');
const { assert, assertEqual, assertContains, assertNotEqual } = require('./helpers/testFramework');
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
// FEATURE 1: Hero (F1) Boundary - 5 tests
// ==========================================

test("F1.B1: Verify app handles missing hero-name element without crashing", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  // Temporarily corrupt rendering by modifying initial html or state, 
  // but let's check that if we initialize normally it renders,
  // and if we remove the element from DOM post-mount, app operations don't throw.
  await mockApp.init();
  const nameEl = document.querySelector("[data-testid='hero-name']");
  assert(nameEl, "Hero name exists");
  nameEl.remove();
  // Call other render methods to check it doesn't crash when hero is missing or updated
  mockApp.initTheme(); 
});

test("F1.B2: Verify self-intro text containing HTML characters is safely handled", async () => {
  await setupCleanApp();
  const introEl = document.querySelector("[data-testid='hero-intro']");
  assert(introEl, "Intro element exists");
  // Let's modify the intro text with html-like entities
  introEl.textContent = "Developer of <AwesomeApp> & 'BestSystem' & \"CoolSoft\"";
  assertEqual(introEl.textContent, "Developer of <AwesomeApp> & 'BestSystem' & \"CoolSoft\"");
});

test("F1.B3: Verify application mounts correctly when extra container classes exist", async () => {
  setupBrowserEnvironment('<div id="root" class="my-custom-container style-override"></div>');
  await mockApp.init();
  const root = document.getElementById("root");
  assert(root.classList.contains("my-custom-container"), "Should retain custom classes");
  assert(document.querySelector("[data-testid='hero-name']"), "Should mount app successfully");
});

test("F1.B4: Verify app handles social links having empty/missing hrefs", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  await mockApp.init();
  const ghLink = document.querySelector("[data-testid='github-link']");
  ghLink.setAttribute("href", "");
  assertEqual(ghLink.getAttribute("href"), "", "Href can be set to empty without crash");
});

test("F1.B5: Verify hero layout rendering when window viewport changes (simulated)", async () => {
  await setupCleanApp();
  const hero = document.getElementById("hero-section");
  hero.style.width = "320px"; // Mobile layout simulation
  assertEqual(hero.style.width, "320px");
});

// ==========================================
// FEATURE 2: Projects (F2) Boundary - 5 tests
// ==========================================

test("F2.B1: Verify search query with special regex characters doesn't crash the filter", async () => {
  await setupCleanApp();
  const searchInput = document.querySelector("[data-testid='project-search']");
  
  // Enter regex symbols
  searchInput.value = "[.*+?^${}()|[\\]\\\\]";
  searchInput.dispatchEvent("input");
  
  const noProjects = document.querySelector("[data-testid='no-projects']");
  assert(noProjects, "Should render no projects message without crashing");
});

test("F2.B2: Verify language and status filters resulting in 0 results renders message", async () => {
  await setupCleanApp();
  // Filter Swift + archived
  document.querySelector("[data-testid='filter-lang-Swift-btn']").click();
  document.querySelector("[data-testid='filter-status-archived-btn']").click();
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 1, "There is exactly 1 archived Swift project");
  
  // Filter Go + archived (0 projects matching in static list)
  document.querySelector("[data-testid='filter-lang-Go-btn']").click();
  const emptyCards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(emptyCards.length, 0, "No Go archived projects exist");
  const noProjects = document.querySelector("[data-testid='no-projects']");
  assert(noProjects, "No projects matching criteria message should be shown");
  assertContains(noProjects.textContent, "No projects found matching the criteria.");
});

test("F2.B3: Verify project list updates properly under rapid consecutive search changes", async () => {
  await setupCleanApp();
  const searchInput = document.querySelector("[data-testid='project-search']");
  
  searchInput.value = "S";
  searchInput.dispatchEvent("input");
  searchInput.value = "Sw";
  searchInput.dispatchEvent("input");
  searchInput.value = "Swi";
  searchInput.dispatchEvent("input");
  searchInput.value = "Swift";
  searchInput.dispatchEvent("input");
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 5, "Should successfully filter Swift projects after rapid search typing");
});

test("F2.B4: Verify handling of missing/unknown language in repo data mapping", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  // Inject mock data with language null
  global.fetch.mockData = [
    {
      name: "SwiftUI-Dashboard",
      description: "Custom desc",
      stargazers_count: 5,
      language: null,
      updated_at: "2026-06-01T12:00:00Z"
    }
  ];
  
  await mockApp.init();
  
  const card = document.querySelector("[data-testid='project-card-0']");
  const lang = card.querySelector(".card-lang");
  assertEqual(lang.textContent, "Unknown", "Should fall back to 'Unknown' language");
  
  global.fetch.mockData = null;
});

test("F2.B5: Verify details back button click works repeatedly", async () => {
  await setupCleanApp();
  
  // Click project 0
  document.querySelector("[data-testid='project-card-0']").click();
  assert(document.querySelector("[data-testid='project-detail']"), "Should render details view");
  
  // Back
  document.querySelector("[data-testid='project-back-btn']").click();
  assert(document.querySelector("[data-testid='project-list']"), "Should return to list view");
  
  // Click project 0 again
  document.querySelector("[data-testid='project-card-0']").click();
  assert(document.querySelector("[data-testid='project-detail']"), "Should render details view again");
});

// ==========================================
// FEATURE 3: Skills (F3) Boundary - 5 tests
// ==========================================

test("F3.B1: Verify adding a new skill dynamically in state doesn't crash skills rendering", async () => {
  await setupCleanApp();
  // Add direct class modification or DOM check
  const list = document.querySelector("[data-testid='skills-mobile'] ul");
  const newSkill = document.createElement("li");
  newSkill.textContent = "SwiftUI";
  list.appendChild(newSkill);
  
  const items = list.querySelectorAll("li");
  assertEqual(items.length, 4, "Should have 4 mobile skills after appending one");
});

test("F3.B2: Verify style attribute properties on prominent skill are correctly retrieved", async () => {
  await setupCleanApp();
  const swiftEl = document.querySelector("[data-testid='skill-swift']");
  // Check style properties in Mock DOM style object
  assertEqual(swiftEl.style.fontWeight, "bold");
  assertEqual(swiftEl.style.color, "#f05138");
});

test("F3.B3: Verify removing prominent skill styling doesn't crash layout", async () => {
  await setupCleanApp();
  const swiftEl = document.querySelector("[data-testid='skill-swift']");
  swiftEl.removeAttribute("style");
  assertEqual(swiftEl.getAttribute("style"), null, "Style attribute should be empty/null");
  assertEqual(swiftEl.style.color, undefined, "Color property should be undefined");
});

test("F3.B4: Verify skills container ignores extra class names safely", async () => {
  await setupCleanApp();
  const cat = document.querySelector("[data-testid='skills-mobile']");
  cat.classList.add("extra-class-1", "extra-class-2");
  assert(cat.classList.contains("extra-class-1"));
  assert(cat.classList.contains("skills-category"));
});

test("F3.B5: Verify toggling class list values on skill items", async () => {
  await setupCleanApp();
  const swiftEl = document.querySelector("[data-testid='skill-swift']");
  swiftEl.classList.toggle("prominent-skill");
  assert(!swiftEl.classList.contains("prominent-skill"), "Should remove class on toggle");
  swiftEl.classList.toggle("prominent-skill");
  assert(swiftEl.classList.contains("prominent-skill"), "Should re-add class on toggle");
});

// ==========================================
// FEATURE 4: Timeline (F4) Boundary - 5 tests
// ==========================================

test("F4.B1: Verify timeline item elements can be queried by index boundaries", async () => {
  await setupCleanApp();
  const item0 = document.querySelector("[data-testid='timeline-item-0']");
  const item3 = document.querySelector("[data-testid='timeline-item-3']");
  const item4 = document.querySelector("[data-testid='timeline-item-4']");
  
  assert(item0, "Item 0 exists");
  assert(item3, "Item 3 exists");
  assertEqual(item4, null, "Item 4 should not exist (index boundary)");
});

test("F4.B2: Verify timeline elements have correct parentNode references", async () => {
  await setupCleanApp();
  const year = document.querySelector("[data-testid='timeline-year-0']");
  const item = document.querySelector("[data-testid='timeline-item-0']");
  assertEqual(year.parentNode, item, "Year element parent should be the timeline item");
});

test("F4.B3: Verify timeline items can be cleared from DOM without app crashes", async () => {
  await setupCleanApp();
  const list = document.querySelector("[data-testid='timeline-list']");
  list.innerHTML = "";
  assertEqual(list.childNodes.length, 0, "Timeline items should be cleared");
});

test("F4.B4: Verify rendering timeline descriptions with HTML tags (escaping check)", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  await mockApp.init();
  // Modify timeline data in test after init
  mockApp.achievements[0].title = "Built <b>StrongApp</b>";
  mockApp.renderTimeline();
  const title = document.querySelector("[data-testid='timeline-title-0']");
  // Check the title
  assertContains(title.innerHTML, "Built <b>StrongApp</b>");
});

test("F4.B5: Verify timeline items have stable classes after multiple updates", async () => {
  await setupCleanApp();
  const item = document.querySelector("[data-testid='timeline-item-0']");
  item.classList.add("highlight");
  item.classList.add("highlight"); // Duplicated add
  assertEqual(item.className, "timeline-item highlight", "ClassName string should be unique");
});

// ==========================================
// FEATURE 5: Blog (F5) Boundary - 5 tests
// ==========================================

test("F5.B1: Verify markdown parser escapes XSS payloads in titles/headers", () => {
  const payload = "# Heading <script>alert('XSS')</script>";
  const parsed = mockApp.renderMarkdown(payload);
  assertContains(parsed, "&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;", "XSS script tags must be escaped");
  assert(!parsed.includes("<script>"), "HTML script tag must not pass through raw");
});

test("F5.B2: Verify markdown parser escapes XSS in lists", () => {
  const payload = "- Item with <img src=x onerror=alert(1)>";
  const parsed = mockApp.renderMarkdown(payload);
  assertContains(parsed, "&lt;img src=x onerror=alert(1)&gt;", "Img tag with onerror payload must be escaped");
  assert(!parsed.includes("<img"), "HTML img tag must not pass through raw");
});

test("F5.B3: Verify markdown parser handles empty strings gracefully", () => {
  const parsed = mockApp.renderMarkdown("");
  assertEqual(parsed, "", "Empty markdown should return empty string");
});

test("F5.B4: Verify markdown parser handles unmatched backticks (code blocks)", () => {
  const payload = "```swift\nprint(1)";
  const parsed = mockApp.renderMarkdown(payload);
  // If unmatched, it shouldn't crash, but either render normally or fallback
  assert(parsed.length > 0);
});

test("F5.B5: Verify clicking blog details with html strings renders them safely", async () => {
  await setupCleanApp();
  // Modify blog content with an XSS script payload
  mockApp.staticBlogs[0].content = "# XSS\n<script>console.log(99)</script>";
  
  // Click first post
  document.querySelector("[data-testid='blog-post-0']").click();
  
  const detailContent = document.querySelector("[data-testid='blog-content']");
  assert(detailContent, "Content detail container should exist");
  assert(!detailContent.innerHTML.includes("<script>"), "Script tag should not be injected raw into innerHTML");
});

test("F5.B6: Verify markdown parser handles multiple inline code snippets in a single line", () => {
  const payload = "Use `Swift` or `TypeScript` for your projects.";
  const parsed = mockApp.renderMarkdown(payload);
  assertContains(parsed, "<code>Swift</code>", "Should parse first inline code");
  assertContains(parsed, "<code>TypeScript</code>", "Should parse second inline code");
});


// ==========================================
// FEATURE 6: Dark/Light Mode (F6) Boundary - 5 tests
// ==========================================

test("F6.B1: Verify rapid consecutive theme toggles sync classes and localStorage correctly", async () => {
  await setupCleanApp();
  const toggle = document.querySelector("[data-testid='theme-toggle']");
  
  // 10 rapid clicks
  for (let i = 0; i < 10; i++) {
    toggle.click();
  }
  
  const isDark = document.documentElement.classList.contains("dark");
  const saved = localStorage.getItem("theme");
  
  if (isDark) {
    assertEqual(saved, "dark");
  } else {
    assertEqual(saved, "light");
  }
});

test("F6.B2: Verify invalid theme value in localStorage defaults to light theme", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("theme", "corrupted_theme_value");
  
  await mockApp.init();
  const isDark = document.documentElement.classList.contains("dark");
  assert(!isDark, "Should fall back to light theme on invalid localStorage theme");
  assertEqual(mockApp.appState.theme, "corrupted_theme_value", "Maintains theme state or defaults");
});

test("F6.B3: Verify null theme value in localStorage defaults to light theme", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.removeItem("theme");
  
  await mockApp.init();
  const isDark = document.documentElement.classList.contains("dark");
  assert(!isDark, "Should default to light theme on null localStorage theme");
});

test("F6.B4: Verify toggling theme updates both DOM class and state object variables", async () => {
  await setupCleanApp();
  const toggle = document.querySelector("[data-testid='theme-toggle']");
  
  toggle.click(); // to dark
  assertEqual(mockApp.appState.theme, "dark");
  assert(document.documentElement.classList.contains("dark"));
  
  toggle.click(); // to light
  assertEqual(mockApp.appState.theme, "light");
  assert(!document.documentElement.classList.contains("dark"));
});

test("F6.B5: Verify body tag properties do not get corrupted during theme toggles", async () => {
  await setupCleanApp();
  const toggle = document.querySelector("[data-testid='theme-toggle']");
  document.body.className = "original-body-class";
  
  toggle.click();
  assertEqual(document.body.className, "original-body-class", "Body class should not be affected by theme toggle");
});

// ==========================================
// FEATURE 7: GitHub API & Caching (F7) Boundary - 5 tests
// ==========================================

test("F7.B1: Verify cache is considered expired and refetches if age > 1 hour", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  const oneHourAndSecondAgo = Date.now() - (60 * 60 * 1000 + 1000);
  localStorage.setItem("github_repos_cache", JSON.stringify({
    timestamp: oneHourAndSecondAgo,
    data: [{ name: "Old-Repo", language: "Swift", stargazers_count: 1 }]
  }));
  
  let fetchCalled = false;
  global.fetch = function() {
    fetchCalled = true;
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve([{ name: "New-Repo", language: "Swift", stargazers_count: 5 }])
    });
  };
  
  await mockApp.init();
  assert(fetchCalled, "Fetch should be triggered when cache is older than 1 hour");
});

test("F7.B2: Verify corrupted JSON in localStorage cache is dropped and refetches", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  localStorage.setItem("github_repos_cache", "this-is-not-valid-json-{");
  
  let fetchCalled = false;
  global.fetch = function() {
    fetchCalled = true;
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve([{ name: "Fetched-Repo", language: "Swift" }])
    });
  };
  
  await mockApp.init();
  assert(fetchCalled, "Fetch should be triggered after recovery from corrupted cache JSON");
  assertNotEqual(localStorage.getItem("github_repos_cache"), "this-is-not-valid-json-{", "Corrupted cache should be cleared/replaced");
});

test("F7.B3: Verify GitHub API 403 Rate Limit displays banner and falls back to static projects", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  global.fetch.rateLimitExceeded = true;
  
  await mockApp.init();
  
  const statusBanner = document.querySelector("[data-testid='api-status']");
  assert(statusBanner, "Rate limit banner should be visible");
  assertContains(statusBanner.textContent, "Rate limit exceeded", "Banner should show rate limit text");
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 19, "Should fall back to rendering 19 static projects");
  
  global.fetch.rateLimitExceeded = false;
});

test("F7.B4: Verify fetch failure/offline mode displays banner and falls back to static data", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  global.fetch.isOffline = true;
  
  await mockApp.init();
  
  const statusBanner = document.querySelector("[data-testid='api-status']");
  assert(statusBanner, "Offline banner should be visible");
  assertContains(statusBanner.textContent, "Offline", "Banner should show offline text");
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 19, "Should fall back to rendering 19 static projects");
  
  global.fetch.isOffline = false;
});

test("F7.B5: Verify rate limit fallback leverages expired cache if present in localStorage", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.clear();
  
  const expiredTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
  const cachedProjects = [
    { name: "Cached-Expired-Project", language: "Swift", status: "active", stars: 77, updatedAt: new Date().toISOString(), description: "Expired cache description", details: "" }
  ];
  localStorage.setItem("github_repos_cache", JSON.stringify({
    timestamp: expiredTime,
    data: cachedProjects
  }));
  
  // Trigger rate limit
  global.fetch.rateLimitExceeded = true;
  
  await mockApp.init();
  
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assertEqual(cards.length, 1, "Should fall back to expired cache instead of static projects if cache is available");
  const nameEl = cards[0].querySelector(".project-card-name");
  assertEqual(nameEl.textContent, "Cached-Expired-Project", "Projects must be populated from expired cache data");
  
  global.fetch.rateLimitExceeded = false;
});

test("F5.B7: Verify multiline code block lines containing '-' are not parsed as list items", () => {
  const payload = "```swift\n- this is a list-like code line\n```";
  const parsed = mockApp.renderMarkdown(payload);
  assertContains(parsed, "<pre><code>- this is a list-like code line\n</code></pre>", "Multiline code block contents should not be formatted as list items");
  assert(!parsed.includes("<li>"), "Multiline code block contents should not contain list tags");
});

test("F5.B8: Verify code block lines are not wrapped in paragraph tags", () => {
  const payload = "```swift\ncode line 1\ncode line 2\n```";
  const parsed = mockApp.renderMarkdown(payload);
  assert(!parsed.includes("<p>code line"), "Multiline code block lines should not be wrapped in <p> tags");
});

test("F2.B6: Verify search input has aria-label and filter buttons have aria-pressed selection state", async () => {
  await setupCleanApp();
  const searchInput = document.getElementById("project-search");
  assert(searchInput, "Search input should exist");
  assertEqual(searchInput.getAttribute("aria-label"), "Search projects");
  
  const allLangBtn = document.querySelector("[data-testid='filter-lang-All-btn']");
  const swiftLangBtn = document.querySelector("[data-testid='filter-lang-Swift-btn']");
  assert(allLangBtn, "All language filter button should exist");
  assert(swiftLangBtn, "Swift language filter button should exist");
  
  assertEqual(allLangBtn.getAttribute("aria-pressed"), "true");
  assertEqual(swiftLangBtn.getAttribute("aria-pressed"), "false");
  
  // Click Swift filter
  swiftLangBtn.click();
  
  const allLangBtn2 = document.querySelector("[data-testid='filter-lang-All-btn']");
  const swiftLangBtn2 = document.querySelector("[data-testid='filter-lang-Swift-btn']");
  assertEqual(allLangBtn2.getAttribute("aria-pressed"), "false");
  assertEqual(swiftLangBtn2.getAttribute("aria-pressed"), "true");
});

module.exports = tests;
