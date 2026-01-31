/**
 * Manual test for tag CRUD functionality (add, edit, remove)
 *
 * Prerequisites:
 * 1. OmniFocus must be running
 * 2. Run: npm run build
 * 3. Run: node test/test-tag-crud.js
 */

import { addTag } from '../dist/tools/primitives/addTag.js';
import { editItem } from '../dist/tools/primitives/editItem.js';
import { removeItem } from '../dist/tools/primitives/removeItem.js';
import { queryOmnifocus } from '../dist/tools/primitives/queryOmnifocus.js';

// Test configuration
const TEST_TAG_1 = 'MCP CRUD Test Tag Alpha';
const TEST_TAG_2 = 'MCP CRUD Test Tag Beta';
const TEST_PARENT_TAG = 'MCP CRUD Test Parent';
const TEST_CHILD_TAG = 'MCP CRUD Test Child';

// Store created tag IDs for cleanup
let createdTagIds = [];

// ============================================
// Add Tag Tests
// ============================================

async function testAddTagAtRoot() {
  console.log('\n=== TEST: Add tag at root level ===');

  try {
    const result = await addTag({ name: TEST_TAG_1 });

    if (result.success && result.tagId) {
      console.log(`SUCCESS: Created tag "${result.name}" (ID: ${result.tagId})`);
      createdTagIds.push(result.tagId);
      return { passed: true, tagId: result.tagId };
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

async function testAddTagWithParentName() {
  console.log('\n=== TEST: Add tag with parent by name ===');

  try {
    // First create parent tag
    const parentResult = await addTag({ name: TEST_PARENT_TAG });
    if (!parentResult.success) {
      console.log(`FAILED: Could not create parent tag: ${parentResult.error}`);
      return { passed: false };
    }
    createdTagIds.push(parentResult.tagId);
    console.log(`Created parent tag: ${TEST_PARENT_TAG} (ID: ${parentResult.tagId})`);

    // Create child tag under parent
    const childResult = await addTag({
      name: TEST_CHILD_TAG,
      parentTagName: TEST_PARENT_TAG
    });

    if (childResult.success && childResult.tagId) {
      console.log(`SUCCESS: Created child tag "${childResult.name}" under "${childResult.parentName}" (ID: ${childResult.tagId})`);
      createdTagIds.push(childResult.tagId);
      return { passed: true, parentTagId: parentResult.tagId, childTagId: childResult.tagId };
    } else {
      console.log(`FAILED: ${childResult.error || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

async function testAddTagWithParentId(parentTagId) {
  console.log('\n=== TEST: Add tag with parent by ID ===');

  try {
    const result = await addTag({
      name: TEST_TAG_2,
      parentTagId: parentTagId
    });

    if (result.success && result.tagId) {
      console.log(`SUCCESS: Created tag "${result.name}" under parent ID ${parentTagId} (ID: ${result.tagId})`);
      createdTagIds.push(result.tagId);
      return { passed: true, tagId: result.tagId };
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

// ============================================
// Edit Tag Tests
// ============================================

async function testEditTagName(tagId) {
  console.log('\n=== TEST: Edit tag name ===');

  try {
    const newName = TEST_TAG_1 + ' (Renamed)';
    const result = await editItem({
      id: tagId,
      itemType: 'tag',
      newName: newName
    });

    if (result.success && result.changedProperties?.includes('name')) {
      console.log(`SUCCESS: Renamed tag to "${newName}"`);
      return { passed: true };
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

async function testEditTagByName() {
  console.log('\n=== TEST: Edit tag by name (fallback) ===');

  try {
    const searchName = TEST_TAG_1 + ' (Renamed)';
    const newName = TEST_TAG_1 + ' (Renamed Again)';

    const result = await editItem({
      name: searchName,
      itemType: 'tag',
      newName: newName
    });

    if (result.success && result.changedProperties?.includes('name')) {
      console.log(`SUCCESS: Found and renamed tag by name to "${newName}"`);
      return { passed: true };
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

async function testMoveTagToNewParent(tagId, newParentTagId) {
  console.log('\n=== TEST: Move tag to new parent ===');

  try {
    const result = await editItem({
      id: tagId,
      itemType: 'tag',
      newParentTagId: newParentTagId
    });

    if (result.success && result.changedProperties?.includes('moved')) {
      console.log(`SUCCESS: Moved tag to new parent`);
      return { passed: true };
    } else {
      console.log(`FAILED: ${result.error || result.changedProperties || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

// ============================================
// Remove Tag Tests
// ============================================

async function testRemoveTagById(tagId) {
  console.log('\n=== TEST: Remove tag by ID ===');

  try {
    const result = await removeItem({
      id: tagId,
      itemType: 'tag'
    });

    if (result.success) {
      console.log(`SUCCESS: Removed tag "${result.name}" (ID: ${result.id})`);
      // Remove from cleanup list since it's already deleted
      createdTagIds = createdTagIds.filter(id => id !== tagId);
      return { passed: true };
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

async function testRemoveTagByName(tagName) {
  console.log('\n=== TEST: Remove tag by name ===');

  try {
    const result = await removeItem({
      name: tagName,
      itemType: 'tag'
    });

    if (result.success) {
      console.log(`SUCCESS: Removed tag "${result.name}" by name`);
      // Remove from cleanup list
      createdTagIds = createdTagIds.filter(id => id !== result.id);
      return { passed: true };
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return { passed: false };
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return { passed: false };
  }
}

// ============================================
// Verification Helper
// ============================================

async function verifyTagExists(tagId) {
  try {
    const result = await queryOmnifocus({
      entity: 'tags',
      filters: {},
      includeInactive: true
    });

    if (result.success && result.items) {
      return result.items.some(tag => tag.id === tagId);
    }
    return false;
  } catch (error) {
    console.error(`Verification error: ${error.message}`);
    return false;
  }
}

// ============================================
// Cleanup
// ============================================

async function cleanup() {
  console.log('\n=== CLEANUP ===');

  for (const tagId of createdTagIds) {
    try {
      const result = await removeItem({
        id: tagId,
        itemType: 'tag'
      });
      if (result.success) {
        console.log(`Cleaned up tag: ${result.name}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup tag ${tagId}: ${error.message}`);
    }
  }

  console.log('Cleanup complete');
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('========================================');
  console.log('OmniFocus MCP - Tag CRUD Test');
  console.log('========================================');

  let results = [];

  try {
    // Add tests
    const addRootResult = await testAddTagAtRoot();
    results.push({ name: 'Add tag at root', passed: addRootResult.passed });
    await new Promise(resolve => setTimeout(resolve, 300));

    const addWithParentResult = await testAddTagWithParentName();
    results.push({ name: 'Add tag with parent by name', passed: addWithParentResult.passed });
    await new Promise(resolve => setTimeout(resolve, 300));

    let addWithParentIdResult = { passed: false };
    if (addWithParentResult.passed && addWithParentResult.parentTagId) {
      addWithParentIdResult = await testAddTagWithParentId(addWithParentResult.parentTagId);
    }
    results.push({ name: 'Add tag with parent by ID', passed: addWithParentIdResult.passed });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Edit tests
    let editNameResult = { passed: false };
    if (addRootResult.passed && addRootResult.tagId) {
      editNameResult = await testEditTagName(addRootResult.tagId);
    }
    results.push({ name: 'Edit tag name by ID', passed: editNameResult.passed });
    await new Promise(resolve => setTimeout(resolve, 300));

    let editByNameResult = { passed: false };
    if (editNameResult.passed) {
      editByNameResult = await testEditTagByName();
    }
    results.push({ name: 'Edit tag by name (fallback)', passed: editByNameResult.passed });
    await new Promise(resolve => setTimeout(resolve, 300));

    let moveTagResult = { passed: false };
    if (addWithParentIdResult.passed && addWithParentResult.parentTagId) {
      // Move the tag added with parent ID to a different parent (the child tag)
      moveTagResult = await testMoveTagToNewParent(
        addWithParentIdResult.tagId,
        addWithParentResult.childTagId
      );
    }
    results.push({ name: 'Move tag to new parent', passed: moveTagResult.passed });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Remove tests
    let removeByIdResult = { passed: false };
    if (addWithParentIdResult.passed && addWithParentIdResult.tagId) {
      removeByIdResult = await testRemoveTagById(addWithParentIdResult.tagId);
    }
    results.push({ name: 'Remove tag by ID', passed: removeByIdResult.passed });
    await new Promise(resolve => setTimeout(resolve, 300));

    let removeByNameResult = { passed: false };
    if (addWithParentResult.passed) {
      removeByNameResult = await testRemoveTagByName(TEST_CHILD_TAG);
    }
    results.push({ name: 'Remove tag by name', passed: removeByNameResult.passed });

  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  } finally {
    // Cleanup remaining tags
    await cleanup();
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
