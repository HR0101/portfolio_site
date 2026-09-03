/**
 * helpers/testFramework.js
 * Basic assertion library for pure Node.js E2E testing.
 */

function assert(value, message) {
  if (!value) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(`${message || "Assertion failed"}: expected value not to equal ${JSON.stringify(expected)}`);
  }
}

function assertContains(str, substr, message) {
  const s = String(str);
  if (!s.includes(substr)) {
    throw new Error(`${message || "Assertion failed"}: expected string to contain "${substr}", but got "${s}"`);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (err) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message || "Expected function to throw an error");
  }
}

module.exports = {
  assert,
  assertEqual,
  assertNotEqual,
  assertContains,
  assertThrows
};
