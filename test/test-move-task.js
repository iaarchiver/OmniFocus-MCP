/**
 * Manual test for task move functionality
 *
 * Prerequisites:
 * 1. OmniFocus must be running
 * 2. Run: npm run build
 * 3. Run: node test/test-move-task.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { editItem } from '../dist/tools/primitives/editItem.js';

const execAsync = promisify(exec);

// Test configuration
const TEST_PROJECT_1 = 'MCP Test Project A';
const TEST_PROJECT_2 = 'MCP Test Project B';
const TEST_TASK_NAME = 'MCP Test Task - Move Me';
const TEST_PARENT_TASK_NAME = 'MCP Test Parent Task';
const TEST_SUBTASK_NAME = 'MCP Test Subtask - Move Me';

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
        -- Create or find test project A
        set projA to missing value
        try
          set projA to first flattened project where name = "${TEST_PROJECT_1}"
        end try
        if projA is missing value then
          set projA to make new project with properties {name:"${TEST_PROJECT_1}"}
        end if

        -- Create or find test project B
        set projB to missing value
        try
          set projB to first flattened project where name = "${TEST_PROJECT_2}"
        end try
        if projB is missing value then
          set projB to make new project with properties {name:"${TEST_PROJECT_2}"}
        end if

        -- Create test task in project A
        set testTask to make new task with properties {name:"${TEST_TASK_NAME}"} at end of tasks of root task of projA

        -- Create parent task and subtask in project A for subtask test
        set parentTask to make new task with properties {name:"${TEST_PARENT_TASK_NAME}"} at end of tasks of root task of projA
        set subTask to make new task with properties {name:"${TEST_SUBTASK_NAME}"} at end of tasks of root task of projA

        -- Return IDs
        return (id of projA as string) & "|" & (id of projB as string) & "|" & (id of testTask as string) & "|" & (id of parentTask as string) & "|" & (id of subTask as string)
      end tell
    end tell
  `;

  const result = await runAppleScript(setupScript);
  const [projectAId, projectBId, taskId, parentTaskId, subTaskId] = result.split('|');

  console.log(`Created Project A: ${TEST_PROJECT_1} (${projectAId})`);
  console.log(`Created Project B: ${TEST_PROJECT_2} (${projectBId})`);
  console.log(`Created Task: ${TEST_TASK_NAME} (${taskId})`);
  console.log(`Created Parent Task: ${TEST_PARENT_TASK_NAME} (${parentTaskId})`);
  console.log(`Created Subtask: ${TEST_SUBTASK_NAME} (${subTaskId})`);

  return { projectAId, projectBId, taskId, parentTaskId, subTaskId };
}

// ============================================
// AppleScript Direct Tests
// ============================================

async function testAppleScriptMoveByProjectName(taskId) {
  console.log('\n=== TEST: AppleScript - Move task by project name ===');

  const moveScript = `
    tell application "OmniFocus"
      tell front document
        set foundTask to missing value
        try
          set foundTask to first flattened task whose id = "${taskId}"
        end try

        if foundTask is missing value then
          return "ERROR: Task not found"
        end if

        set destProject to missing value
        try
          set destProject to first flattened project whose name = "${TEST_PROJECT_2}"
        end try

        if destProject is missing value then
          return "ERROR: Destination project not found"
        end if

        move foundTask to end of tasks of destProject

        set newContainer to containing project of foundTask
        if newContainer is not missing value then
          return "SUCCESS: Task moved to " & (name of newContainer)
        else
          return "ERROR: Task has no containing project after move"
        end if
      end tell
    end tell
  `;

  const result = await runAppleScript(moveScript);
  console.log(`Result: ${result}`);

  return result.startsWith('SUCCESS');
}

async function testAppleScriptMoveByProjectId(taskId, projectAId) {
  console.log('\n=== TEST: AppleScript - Move task back by project ID ===');

  const moveScript = `
    tell application "OmniFocus"
      tell front document
        set foundTask to missing value
        try
          set foundTask to first flattened task whose id = "${taskId}"
        end try

        if foundTask is missing value then
          return "ERROR: Task not found"
        end if

        set destProject to missing value
        try
          set destProject to first flattened project whose id = "${projectAId}"
        end try

        if destProject is missing value then
          return "ERROR: Destination project not found"
        end if

        move foundTask to end of tasks of destProject

        set newContainer to containing project of foundTask
        if newContainer is not missing value then
          return "SUCCESS: Task moved to " & (name of newContainer)
        else
          return "ERROR: Task has no containing project after move"
        end if
      end tell
    end tell
  `;

  const result = await runAppleScript(moveScript);
  console.log(`Result: ${result}`);

  return result.startsWith('SUCCESS');
}

async function testAppleScriptMoveToParentTask(subTaskId, parentTaskId) {
  console.log('\n=== TEST: AppleScript - Move task to parent task (subtask) ===');

  const moveScript = `
    tell application "OmniFocus"
      tell front document
        set foundTask to missing value
        try
          set foundTask to first flattened task whose id = "${subTaskId}"
        end try

        if foundTask is missing value then
          return "ERROR: Task not found"
        end if

        set destParent to missing value
        try
          set destParent to first flattened task whose id = "${parentTaskId}"
        end try

        if destParent is missing value then
          return "ERROR: Parent task not found"
        end if

        move foundTask to end of tasks of destParent

        set parentOfTask to parent task of foundTask
        if parentOfTask is not missing value then
          return "SUCCESS: Task moved under " & (name of parentOfTask)
        else
          return "ERROR: Task has no parent task after move"
        end if
      end tell
    end tell
  `;

  const result = await runAppleScript(moveScript);
  console.log(`Result: ${result}`);

  return result.startsWith('SUCCESS');
}

// ============================================
// editItem Function Tests
// ============================================

async function testEditItemMoveByProjectName(taskId) {
  console.log('\n=== TEST: editItem - Move task by project name ===');

  try {
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newProjectName: TEST_PROJECT_2
    });

    console.log(`Result: ${JSON.stringify(result)}`);

    if (result.success && result.changedProperties?.includes('moved')) {
      console.log('SUCCESS: Task moved via editItem');
      return true;
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testEditItemMoveByProjectId(taskId, projectAId) {
  console.log('\n=== TEST: editItem - Move task by project ID ===');

  try {
    const result = await editItem({
      id: taskId,
      itemType: 'task',
      newProjectId: projectAId
    });

    console.log(`Result: ${JSON.stringify(result)}`);

    if (result.success && result.changedProperties?.includes('moved')) {
      console.log('SUCCESS: Task moved via editItem');
      return true;
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

async function testEditItemMoveToParentTask(subTaskId, parentTaskId) {
  console.log('\n=== TEST: editItem - Move task to parent task (subtask) ===');

  try {
    const result = await editItem({
      id: subTaskId,
      itemType: 'task',
      newParentTaskId: parentTaskId
    });

    console.log(`Result: ${JSON.stringify(result)}`);

    if (result.success && result.changedProperties?.includes('moved')) {
      console.log('SUCCESS: Task moved to parent via editItem');
      return true;
    } else {
      console.log(`FAILED: ${result.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return false;
  }
}

// ============================================
// Verification Helper
// ============================================

async function verifyTaskLocation(taskId, expectedProjectName = null, expectedParentTaskId = null) {
  const verifyScript = `
    tell application "OmniFocus"
      tell front document
        set foundTask to missing value
        try
          set foundTask to first flattened task whose id = "${taskId}"
        end try

        if foundTask is missing value then
          return "ERROR: Task not found"
        end if

        set projName to ""
        set parentId to ""

        try
          set proj to containing project of foundTask
          if proj is not missing value then
            set projName to name of proj
          end if
        end try

        try
          set parentT to parent task of foundTask
          if parentT is not missing value then
            set parentId to id of parentT as string
          end if
        end try

        return projName & "|" & parentId
      end tell
    end tell
  `;

  const result = await runAppleScript(verifyScript);
  const [projectName, parentTaskIdResult] = result.split('|');

  if (expectedProjectName && projectName !== expectedProjectName) {
    console.log(`  Verification FAILED: Expected project "${expectedProjectName}", got "${projectName}"`);
    return false;
  }

  if (expectedParentTaskId && parentTaskIdResult !== expectedParentTaskId) {
    console.log(`  Verification FAILED: Expected parent task "${expectedParentTaskId}", got "${parentTaskIdResult}"`);
    return false;
  }

  console.log(`  Verified: Project="${projectName}", ParentTask="${parentTaskIdResult || 'none'}"`);
  return true;
}

// ============================================
// Cleanup
// ============================================

async function cleanup(projectAId, projectBId) {
  console.log('\n=== CLEANUP ===');

  const cleanupScript = `
    tell application "OmniFocus"
      tell front document
        try
          delete (first flattened project whose id = "${projectAId}")
        end try
        try
          delete (first flattened project whose id = "${projectBId}")
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
  console.log('OmniFocus MCP - Task Move Test');
  console.log('========================================');

  let testData = null;
  let results = {
    appleScriptTests: [],
    editItemTests: []
  };

  try {
    // Setup
    testData = await setup();
    await new Promise(resolve => setTimeout(resolve, 500));

    // ---- AppleScript Direct Tests ----
    console.log('\n\n>>> AppleScript Direct Tests <<<');

    // Test 1: AppleScript - Move by project name
    const as1 = await testAppleScriptMoveByProjectName(testData.taskId);
    results.appleScriptTests.push({ name: 'Move by project name', passed: as1 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 2: AppleScript - Move by project ID
    const as2 = await testAppleScriptMoveByProjectId(testData.taskId, testData.projectAId);
    results.appleScriptTests.push({ name: 'Move by project ID', passed: as2 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 3: AppleScript - Move to parent task
    const as3 = await testAppleScriptMoveToParentTask(testData.subTaskId, testData.parentTaskId);
    results.appleScriptTests.push({ name: 'Move to parent task', passed: as3 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // ---- editItem Function Tests ----
    console.log('\n\n>>> editItem Function Tests <<<');

    // Create fresh task for editItem tests
    const freshTaskResult = await runAppleScript(`
      tell application "OmniFocus"
        tell front document
          set projA to first flattened project whose id = "${testData.projectAId}"
          set newTask to make new task with properties {name:"editItem Test Task"} at end of tasks of root task of projA
          return id of newTask as string
        end tell
      end tell
    `);
    const freshTaskId = freshTaskResult.trim();
    console.log(`\nCreated fresh task for editItem tests: ${freshTaskId}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 4: editItem - Move by project name
    const ei1 = await testEditItemMoveByProjectName(freshTaskId);
    await verifyTaskLocation(freshTaskId, TEST_PROJECT_2);
    results.editItemTests.push({ name: 'Move by project name', passed: ei1 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 5: editItem - Move by project ID
    const ei2 = await testEditItemMoveByProjectId(freshTaskId, testData.projectAId);
    await verifyTaskLocation(freshTaskId, TEST_PROJECT_1);
    results.editItemTests.push({ name: 'Move by project ID', passed: ei2 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create fresh subtask for parent task test
    const freshSubTaskResult = await runAppleScript(`
      tell application "OmniFocus"
        tell front document
          set projA to first flattened project whose id = "${testData.projectAId}"
          set newTask to make new task with properties {name:"editItem Subtask Test"} at end of tasks of root task of projA
          return id of newTask as string
        end tell
      end tell
    `);
    const freshSubTaskId = freshSubTaskResult.trim();
    console.log(`\nCreated fresh subtask for parent task test: ${freshSubTaskId}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test 6: editItem - Move to parent task
    const ei3 = await testEditItemMoveToParentTask(freshSubTaskId, testData.parentTaskId);
    await verifyTaskLocation(freshSubTaskId, null, testData.parentTaskId);
    results.editItemTests.push({ name: 'Move to parent task', passed: ei3 });

  } catch (error) {
    console.error('\nTest failed with error:', error.message);
  } finally {
    // Cleanup
    if (testData) {
      await cleanup(testData.projectAId, testData.projectBId);
    }
  }

  // Print summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');

  console.log('\nAppleScript Direct Tests:');
  results.appleScriptTests.forEach(t => {
    console.log(`  ${t.passed ? '✅' : '❌'} ${t.name}`);
  });

  console.log('\neditItem Function Tests:');
  results.editItemTests.forEach(t => {
    console.log(`  ${t.passed ? '✅' : '❌'} ${t.name}`);
  });

  const allPassed = [
    ...results.appleScriptTests,
    ...results.editItemTests
  ].every(t => t.passed);

  console.log('\n========================================');
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('========================================\n');

  process.exit(allPassed ? 0 : 1);
}

main();
