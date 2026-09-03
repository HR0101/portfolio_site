/**
 * run.js
 * Entry point to run the E2E test suite.
 */

const fs = require('fs');
const path = require('path');

async function runSuite() {
  const testFiles = [
    'tier1.test.js',
    'tier2.test.js',
    'tier3.test.js',
    'tier4.test.js',
    'adversarial.test.js'
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  const failures = [];
  
  for (const file of testFiles) {
    console.log(`\n========================================`);
    console.log(`Running test suite: ${file}`);
    console.log(`========================================`);
    
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Test file not found at ${filePath}`);
      process.exit(1);
    }
    
    // Delete from require cache to ensure clean import
    delete require.cache[require.resolve(filePath)];
    const tests = require(filePath);
    
    for (const t of tests) {
      try {
        await t.fn();
        console.log(`  ✓ PASS: ${t.name}`);
        totalPassed++;
      } catch (err) {
        console.log(`  ✗ FAIL: ${t.name}`);
        console.error(`    ${err.stack || err.message}`);
        totalFailed++;
        failures.push({ file, name: t.name, error: err });
      }
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Test Summary:`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`========================================\n`);
  
  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
