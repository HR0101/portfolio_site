/**
 * tests/m3_verification.js
 * Verification suite for Milestone 3 markdown parser correctness, XSS safety, and dynamic route robustness.
 */

const { assert, assertEqual, assertContains, assertThrows } = require('./helpers/testFramework');
const { renderMarkdown, staticBlogs } = require('./dist_test/services/blogService');

// Mock next/navigation before requiring the page component
const mockNextNavigation = {
  notFound() {
    const error = new Error("NEXT_NOT_FOUND");
    error.digest = "NEXT_NOT_FOUND";
    throw error;
  },
  useRouter() {
    return {
      push: () => {}
    };
  }
};
require.cache[require.resolve('next/navigation')] = {
  exports: mockNextNavigation
};

const BlogDetailPage = require('./dist_test/app/blog/[id]/page').default;

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ==========================================
// 1. Correctness and Edge-Case Tests for renderMarkdown
// ==========================================

test("M3.C1: Empty and undefined markdown rendering", () => {
  assertEqual(renderMarkdown(""), "", "Empty string should return empty string");
  assertEqual(renderMarkdown(undefined), "", "Undefined input should return empty string");
  assertEqual(renderMarkdown(null), "", "Null input should return empty string");
});

test("M3.C2: Standard headings rendering", () => {
  const h1 = renderMarkdown("# Heading 1");
  assertEqual(h1, "<h1>Heading 1</h1>", "H1 heading rendering");

  const h2 = renderMarkdown("## Heading 2");
  assertEqual(h2, "<h2>Heading 2</h2>", "H2 heading rendering");

  const h3 = renderMarkdown("### Heading 3");
  assertEqual(h3, "<h3>Heading 3</h3>", "H3 heading rendering");

  const mixed = renderMarkdown("# H1\n## H2\n### H3");
  assertEqual(mixed, "<h1>H1</h1>\n<h2>H2</h2>\n<h3>H3</h3>", "Multiple headings rendering");
});

test("M3.C3: Unmatched backticks and standard code blocks", () => {
  const unmatched = renderMarkdown("```swift\nprint(1)");
  // If unmatched, it should at least not crash.
  assert(unmatched.length > 0, "Should handle unmatched backticks gracefully");

  const multiline = renderMarkdown("```swift\nlet a = 10;\n```");
  assertEqual(multiline, "<pre><code>let a = 10;\n</code></pre>", "Multiline code block rendering");
});

test("M3.C4: List items with inline code blocks", () => {
  const listWithCode = renderMarkdown("- Choice of `Swift` or `TypeScript` code");
  assertEqual(listWithCode, "<li>Choice of <code>Swift</code> or <code>TypeScript</code> code</li>", "List with inline code blocks");
});

test("M3.C5: Deeply nested or consecutive elements", () => {
  // Let's test a sequence of different Markdown blocks
  const md = "# Start\n- Item 1\n- Item 2\n\nSome text\n\n```js\nconst x = 1;\n```\n## End";
  const expected = "<h1>Start</h1>\n<li>Item 1</li>\n<li>Item 2</li>\n<p>Some text</p>\n<pre><code>const x = 1;\n</code></pre>\n<h2>End</h2>";
  assertEqual(renderMarkdown(md), expected, "Complex nested sequence rendering");
});

test("M3.C6: Paragraph wrapping rules", () => {
  // Headings, list items, code blocks and inline code block placeholders should not be wrapped in <p>
  const headings = renderMarkdown("# Title\nNormal paragraph\n- List item");
  assertEqual(headings, "<h1>Title</h1>\n<p>Normal paragraph</p>\n<li>List item</li>");
});

// ==========================================
// 2. XSS Safety Validation
// ==========================================

test("M3.X1: Script tag escaping", () => {
  const payload = "<script>alert('XSS')</script>";
  const parsed = renderMarkdown(payload);
  assert(!parsed.includes("<script>"), "Raw script tag must not be rendered");
  assertContains(parsed, "&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
});

test("M3.X2: Img tag with onerror handler escaping", () => {
  const payload = "<img src=x onerror=alert(1)>";
  const parsed = renderMarkdown(payload);
  assert(!parsed.includes("<img"), "Raw img tag must not be rendered");
  assertContains(parsed, "&lt;img src=x onerror=alert(1)&gt;");
});

test("M3.X3: Iframe with javascript URI escaping", () => {
  const payload = '<iframe src="javascript:alert(1)"></iframe>';
  const parsed = renderMarkdown(payload);
  assert(!parsed.includes("<iframe"), "Raw iframe tag must not be rendered");
  assertContains(parsed, "&lt;iframe src=&quot;javascript:alert(1)&quot;&gt;&lt;/iframe&gt;");
});

test("M3.X4: Anchor tag with javascript: link escaping", () => {
  const payload = '<a href="javascript:alert(1)">Click me</a>';
  const parsed = renderMarkdown(payload);
  assert(!parsed.includes("<a "), "Raw anchor tag must not be rendered");
  assertContains(parsed, "&lt;a href=&quot;javascript:alert(1)&quot;&gt;Click me&lt;/a&gt;");
});

test("M3.X5: Legacy escaping parity check", () => {
  // Verify HTML special characters & < > " ' are all escaped
  const payload = `& < > " '`;
  const parsed = renderMarkdown(payload);
  assertContains(parsed, "&amp; &lt; &gt; &quot; &#039;");
});

// ==========================================
// 3. Dynamic Route /blog/[id] Behavior
// ==========================================

test("M3.R1: Valid blog ID rendering", () => {
  const result = BlogDetailPage({ params: { id: "blog-1" } });
  assert(result, "Should successfully return a JSX structure");
  // Check the title of the blog is in the children (react element tree structure traversal)
  const rootSection = result;
  assertEqual(rootSection.type, "section");
  const outerDiv = rootSection.props.children;
  assertEqual(outerDiv.type, "div");
  assertEqual(outerDiv.props.className, "blog-post-detail");

  const [backBtn, titleH2, dateSpan, contentDiv] = outerDiv.props.children;
  assertEqual(titleH2.type, "h2");
  assertEqual(titleH2.props.children, "Getting Started with Swift");

  assertEqual(contentDiv.type, "div");
  assertEqual(contentDiv.props["data-testid"], "blog-content");
  assertContains(contentDiv.props.dangerouslySetInnerHTML.__html, "<h1>Getting Started with Swift</h1>");
});

test("M3.R2: Invalid blog ID triggers notFound()", () => {
  assertThrows(() => {
    BlogDetailPage({ params: { id: "invalid-id" } });
  }, "Expected invalid blog ID to trigger Next.js notFound()");
});

test("M3.R3: Empty blog ID triggers notFound()", () => {
  assertThrows(() => {
    BlogDetailPage({ params: { id: "" } });
  }, "Expected empty blog ID to trigger Next.js notFound()");
});

test("M3.R4: Missing params or undefined id triggers notFound()", () => {
  assertThrows(() => {
    BlogDetailPage({ params: { id: undefined } });
  }, "Expected undefined blog ID to trigger Next.js notFound()");
});

// ==========================================
// 4. Adversarial Special Replacements Bug Test
// ==========================================

test("M3.A1: Special replacement characters in inline code blocks", () => {
  // Test case 1: $&
  const payload1 = "Use `$&` inside inline code.";
  const parsed1 = renderMarkdown(payload1);
  // Expect it to render: <p>Use <code>$&</code> inside inline code.</p>
  // If it's buggy, it will replace $& with the placeholder name: <p>Use <code>__INLINE_CODE_PLACEHOLDER_0__</code> inside inline code.</p>
  assertContains(parsed1, "<code>$&amp;</code>", "Dollar-ampersand should render correctly inside inline code block");
  assert(!parsed1.includes("__INLINE_CODE_PLACEHOLDER_0__"), "Inline code placeholder leaked due to JavaScript replace() special interpretation of $&!");

  // Test case 2: $`
  const payload2 = "Before `` ` `` code.";
  // Let's test a simple $` in code:
  const payload3 = "Use `$\`` in code.";
  const parsed3 = renderMarkdown(payload3);
  assertContains(parsed3, "<code>$&#039;</code>", "Dollar-quote should render correctly");
  assert(!parsed3.includes("Use"), "JavaScript replace() special interpretation of $` leaked preceding content into the code block!");
});

async function runSuite() {
  let passed = 0;
  let failed = 0;
  console.log("Running Milestone 3 Challenger tests...");
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✓ PASS: ${t.name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗ FAIL: ${t.name}`);
      console.error(`    ${err.stack || err.message}`);
      failed++;
    }
  }
  console.log(`\nMilestone 3 Challenger Summary: Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error("Unhandled error in test suite:", err);
  process.exit(1);
});
