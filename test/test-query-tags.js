/**
 * Manual test for query_omnifocus tags functionality
 *
 * Prerequisites:
 * 1. OmniFocus must be running
 * 2. Run: npm run build
 * 3. Run: node test/test-query-tags.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { queryOmnifocus } from '../dist/tools/primitives/queryOmnifocus.js';

const execAsync = promisify(exec);

// Test configuration
const TEST_TAG_1 = 'MCP Test Tag Alpha';
const TEST_TAG_2 = 'MCP Test Tag Beta';
const TEST_PARENT_TAG = 'MCP Test Parent Tag';
const TEST_CHILD_TAG = 'MCP Test Child Tag';

async function runAppleScript(script) {
  try {
    const { stdout, stderr } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    if (stderr) console.error('AppleScript stderr:', stderr);
    return stdout.trim();
  } catch (error) {
    console.error('AppleScript error:', error.message);
    throw error;
  }
}

async function setup() {
  console.log('\n=== SETUP ===');

  const setupScript = `
    tell application "OmniFocus"
      tell front document
        -- Create test tag 1
        set tag1 to missing value
        try
          set tag1 to first flattened tag where name = "${TEST_TAG_1}"
        end try
        if tag1 is missing value then
          set tag1 to make new tag with properties {name:"${TEST_TAG_1}"}
        end if

        -- Create test tag 2
        set tag2 to missing value
        try
          set tag2 to first flattened tag where name = "${TEST_TAG_2}"
        end try
        if tag2 is missing value then
          set tag2 to make new tag with properties {name:"${TEST_TAG_2}"}
        end if

        -- Create parent tag
        set parentTag to missing value
        try
          set parentTag to first flattened tag where name = "${TEST_PARENT_TAG}"
        end try
        if parentTag is missing value then
          set parentTag to make new tag with properties {name:"${TEST_PARENT_TAG}"}
        end if

        -- Create child tag under parent
        set childTag to missing value
        try
          set childTag to first flattened tag where name = "${TEST_CHILD_TAG}"
        end try
        if childTag is missing value then
          set childTag to make new tag with properties {name:"${TEST_CHILD_TAG}"} at end of tags of parentTag
        end if

        -- Return IDs
        return (id of tag1 as string) & "|" & (id of tag2 as string) & "|" & (id of parentTag as string) & "|" & (id of childTag as string)
      end tell
    end tell
  `;

  const result = await runAppleScript(setupScript);
  const [tag1Id, tag2Id, parentTagId, childTagId] = result.split('|');

  console.log(`Created Tag 1: ${TEST_TAG_1} (${tag1Id})`);
  console.log(`Created Tag 2: ${TEST_TAG_2} (${tag2Id})`);
  console.log(`Created Parent Tag: ${TEST_PARENT_TAG} (${parentTagId})`);
  console.log(`Created Child Tag: ${TEST_CHILD_TAG} (${childTagId})`);

  return { tag1Id, tag2Id, parentTagId, childTagId };
}

// ============================================
// Query Tests
// ============================================

async function testGetAllTags() {
  console.log('\n=== TEST: Get all tags ===');

  try {
    const result = await queryOmnifocus({ entity: 'tags' });

    if (result.success && result.items && result.items.length > 0) {
      console.log(`SUCCESS: Retrieved ${result.count} tags`);
      console.log(`Sample tag: ${JSON.stringify(result.items[0])}`);
      return true;
    } else {
      console.log(`FAILED: ${result.error || 'No tags returned'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testGetTagsWithLimit() {
  console.log('\n=== TEST: Get tags with limit ===');

  try {
    const result = await queryOmnifocus({ entity: 'tags', limit: 3 });

    if (result.success && result.items && result.items.length <= 3) {
      console.log(`SUCCESS: Retrieved ${result.count} tags (limit: 3)`);
      return true;
    } else {
      console.log(`FAILED: ${result.error || 'Unexpected result'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testFilterTagsByName() {
  console.log('\n=== TEST: Filter tags by name ===');

  try {
    const result = await queryOmnifocus({
      entity: 'tags',
      filters: { name: 'MCP Test' }
    });

    if (result.success && result.items) {
      const hasTestTags = result.items.some(t => t.name.includes('MCP Test'));
      if (hasTestTags) {
        console.log(`SUCCESS: Found ${result.count} tags matching "MCP Test"`);
        result.items.forEach(t => console.log(`  - ${t.name}`));
        return true;
      } else {
        console.log('FAILED: No matching tags found');
        return false;
      }
    } else {
      console.log(`FAILED: ${result.error || 'No tags returned'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testFilterTagsByParentId(parentTagId) {
  console.log('\n=== TEST: Filter tags by parent tag ID ===');

  try {
    const result = await queryOmnifocus({
      entity: 'tags',
      filters: { parentTagId: parentTagId }
    });

    if (result.success && result.items) {
      const hasChildTag = result.items.some(t => t.name === TEST_CHILD_TAG);
      if (hasChildTag) {
        console.log(`SUCCESS: Found child tag under parent`);
        result.items.forEach(t => console.log(`  - ${t.name} (parent: ${t.parentTagName})`));
        return true;
      } else {
        console.log('FAILED: Child tag not found');
        return false;
      }
    } else {
      console.log(`FAILED: ${result.error || 'No tags returned'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testGetTagsWithSpecificFields() {
  console.log('\n=== TEST: Get tags with specific fields ===');

  try {
    const result = await queryOmnifocus({
      entity: 'tags',
      fields: ['id', 'name', 'allowsNextAction'],
      limit: 3
    });

    if (result.success && result.items && result.items.length > 0) {
      const tag = result.items[0];
      const hasExpectedFields = 'id' in tag && 'name' in tag && 'allowsNextAction' in tag;
      const hasNoExtraFields = !('availableTaskCount' in tag);

      if (hasExpectedFields && hasNoExtraFields) {
        console.log(`SUCCESS: Retrieved tags with specific fields`);
        console.log(`Sample: ${JSON.stringify(tag)}`);
        return true;
      } else {
        console.log(`FAILED: Unexpected fields in result`);
        console.log(`Got: ${JSON.stringify(tag)}`);
        return false;
      }
    } else {
      console.log(`FAILED: ${result.error || 'No tags returned'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testGetTagsSummary() {
  console.log('\n=== TEST: Get tags summary (count only) ===');

  try {
    const result = await queryOmnifocus({
      entity: 'tags',
      summary: true
    });

    if (result.success && result.count !== undefined && result.items === undefined) {
      console.log(`SUCCESS: Got summary count: ${result.count} tags`);
      return true;
    } else {
      console.log(`FAILED: ${result.error || 'Unexpected result'}`);
      console.log(`Result: ${JSON.stringify(result)}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testGetTagsSortedByName() {
  console.log('\n=== TEST: Get tags sorted by name ===');

  try {
    const result = await queryOmnifocus({
      entity: 'tags',
      sortBy: 'name',
      sortOrder: 'asc',
      limit: 10
    });

    if (result.success && result.items && result.items.length > 1) {
      // Check if sorted
      let isSorted = true;
      for (let i = 1; i < result.items.length; i++) {
        if (result.items[i].name.localeCompare(result.items[i - 1].name) < 0) {
          isSorted = false;
          break;
        }
      }

      if (isSorted) {
        console.log(`SUCCESS: Tags are sorted by name`);
        result.items.forEach(t => console.log(`  - ${t.name}`));
        return true;
      } else {
        console.log('FAILED: Tags are not sorted');
        return false;
      }
    } else {
      console.log(`FAILED: ${result.error || 'Not enough tags to verify sort'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testDefaultFieldsReturned() {
  console.log('\n=== TEST: Default fields are returned ===');

  try {
    const result = await queryOmnifocus({
      entity: 'tags',
      limit: 1
    });

    if (result.success && result.items && result.items.length > 0) {
      const tag = result.items[0];
      const expectedFields = ['id', 'name', 'active', 'allowsNextAction', 'parentTagId', 'parentTagName', 'availableTaskCount', 'remainingTaskCount'];
      const hasAllFields = expectedFields.every(field => field in tag);

      if (hasAllFields) {
        console.log(`SUCCESS: All default fields present`);
        console.log(`Fields: ${Object.keys(tag).join(', ')}`);
        return true;
      } else {
        console.log(`FAILED: Missing fields`);
        console.log(`Expected: ${expectedFields.join(', ')}`);
        console.log(`Got: ${Object.keys(tag).join(', ')}`);
        return false;
      }
    } else {
      console.log(`FAILED: ${result.error || 'No tags returned'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

// ============================================
// Cleanup
// ============================================

async function cleanup(tag1Id, tag2Id, parentTagId) {
  console.log('\n=== CLEANUP ===');

  const cleanupScript = `
    tell application "OmniFocus"
      tell front document
        try
          delete (first flattened tag whose id = "${tag1Id}")
        end try
        try
          delete (first flattened tag whose id = "${tag2Id}")
        end try
        try
          delete (first flattened tag whose id = "${parentTagId}")
        end try
        return "Cleanup complete"
      end tell
    end tell
  `;

  const result = await runAppleScript(cleanupScript);
  console.log(result);
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('========================================');
  console.log('OmniFocus MCP - Query Tags Test');
  console.log('========================================');

  let testData = null;
  let results = [];

  try {
    // Setup
    testData = await setup();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Run tests
    results.push({ name: 'Get all tags', passed: await testGetAllTags() });
    await new Promise(resolve => setTimeout(resolve, 300));

    results.push({ name: 'Get tags with limit', passed: await testGetTagsWithLimit() });
    await new Promise(resolve => setTimeout(resolve, 300));

    results.push({ name: 'Filter tags by name', passed: await testFilterTagsByName() });
    await new Promise(resolve => setTimeout(resolve, 300));

    results.push({ name: 'Filter tags by parent ID', passed: await testFilterTagsByParentId(testData.parentTagId) });
    await new Promise(resolve => setTimeout(resolve, 300));

    results.push({ name: 'Get tags with specific fields', passed: await testGetTagsWithSpecificFields() });
    await new Promise(resolve => setTimeout(resolve, 300));

    results.push({ name: 'Get tags summary', passed: await testGetTagsSummary() });
    await new Promise(resolve => setTimeout(resolve, 300));

    results.push({ name: 'Get tags sorted by name', passed: await testGetTagsSortedByName() });
    await new Promise(resolve => setTimeout(resolve, 300));

    results.push({ name: 'Default fields returned', passed: await testDefaultFieldsReturned() });

  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  } finally {
    // Cleanup
    if (testData) {
      await cleanup(testData.tag1Id, testData.tag2Id, testData.parentTagId);
    }
  }

  // Print summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================\n');

  results.forEach(t => {
    console.log(`  ${t.passed ? '✅' : '❌'} ${t.name}`);
  });

  const allPassed = results.every(t => t.passed);
  const passedCount = results.filter(t => t.passed).length;

  console.log('\n========================================');
  console.log(`${passedCount}/${results.length} tests passed`);
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('========================================\n');

  process.exit(allPassed ? 0 : 1);
}

main();
