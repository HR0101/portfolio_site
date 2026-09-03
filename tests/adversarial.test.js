/**
 * adversarial.test.js
 * Empirical challenge tests targeting cache corruption, rate limits, and XSS injection.
 */

const { setupBrowserEnvironment } = require('./helpers/browserMock');
const { assert, assertEqual, assertContains, assertThrows } = require('./helpers/testFramework');
const mockApp = require('./helpers/mockApp');

const fs = require('fs');
const path = require('path');

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ==========================================
// 1. LocalStorage Cache Corruption Tests
// ==========================================

test("Adversarial: Cache is valid JSON but lacks 'data' array (should fall back safely)", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("github_repos_cache", JSON.stringify({
    timestamp: Date.now(),
    data: null // not an array
  }));
  
  // Should initialize without throwing since fallbackToOffline triggers
  await mockApp.init();
  const cards = document.querySelectorAll("[data-testid^='project-card-']");
  assert(cards.length > 0, "Should fall back to static projects");
});

test("Adversarial: Cache data array contains object missing 'name' (crashes when filtering/searching)", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("github_repos_cache", JSON.stringify({
    timestamp: Date.now(),
    data: [
      {
        // missing name!
        language: "Swift",
        status: "active",
        stars: 10,
        updatedAt: new Date().toISOString(),
        description: "Test description",
        details: "Test details"
      }
    ]
  }));
  
  // 1. Initialize (does not crash immediately because searchQuery is empty and loop evaluates !q first)
  await mockApp.init();
  
  // 2. Set searchQuery and attempt to filter/render, which triggers the TypeError
  mockApp.appState.searchQuery = "swift";
  
  assertThrows(() => {
    mockApp.renderProjects();
  }, "Expected renderProjects to crash with TypeError when a cached project lacks a name during search");
});

test("Adversarial: Cache data array contains object missing 'description' (crashes when filtering/searching)", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  localStorage.setItem("github_repos_cache", JSON.stringify({
    timestamp: Date.now(),
    data: [
      {
        name: "Missing-Desc-Project",
        language: "Swift",
        status: "active",
        stars: 10,
        updatedAt: new Date().toISOString(),
        // missing description!
        details: "Test details"
      }
    ]
  }));
  
  // 1. Initialize
  await mockApp.init();
  
  // 2. Set searchQuery and attempt to filter/render, which triggers the TypeError
  mockApp.appState.searchQuery = "swift";
  
  assertThrows(() => {
    mockApp.renderProjects();
  }, "Expected renderProjects to crash with TypeError when a cached project lacks a description during search");
});

// ==========================================
// 2. HTML Injection / XSS Vulnerabilities in mockApp
// ==========================================

test("Adversarial: Project description XSS injection in mockApp", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  
  // Set up mock GitHub data with XSS payload in description
  const xssPayload = "<script>window.xssTriggeredDesc=true;</script>";
  global.fetch.mockData = [
    {
      name: "XSS-Description-Project",
      description: xssPayload,
      stargazers_count: 5,
      language: "Swift",
      updated_at: new Date().toISOString()
    }
  ];
  
  await mockApp.init();
  
  const descEl = document.querySelector(".project-card-desc");
  assert(descEl, "Project card description element should exist");
  
  // Check that mockApp renders the description directly as HTML
  assert(descEl.innerHTML.includes("<script>"), "mockApp vulnerability: Project description was rendered raw as HTML");
  
  global.fetch.mockData = null;
});

test("Adversarial: Project detail long details XSS injection in mockApp", async () => {
  setupBrowserEnvironment('<div id="root"></div>');
  
  const xssPayload = "<div id='malicious-div'>XSS</div>";
  global.fetch.mockData = [
    {
      name: "SwiftUI-Dashboard", // Match static project name to load its details
      description: "Normal desc",
      stargazers_count: 5,
      language: "Swift",
      updated_at: new Date().toISOString()
    }
  ];
  
  // Override the static project details with XSS
  const originalDetails = mockApp.staticProjects[0].details;
  mockApp.staticProjects[0].details = xssPayload;
  
  await mockApp.init();
  
  // Click project to go to detail page
  const card = document.querySelector("[data-testid='project-card-0']");
  assert(card, "Project card should exist");
  card.click();
  
  const detailEl = document.querySelector(".project-long-details");
  assert(detailEl, "Project long details element should exist");
  
  // Check that mockApp renders details directly as HTML
  assert(detailEl.innerHTML.includes("<div id=\"malicious-div\">"), "mockApp vulnerability: Project details rendered raw as HTML");
  
  // Cleanup
  mockApp.staticProjects[0].details = originalDetails;
  global.fetch.mockData = null;
});

module.exports = tests;
