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

const execAsync = promisify(exec);

// Test configuration
const TEST_PROJECT_1 = 'MCP Test Project A';
const TEST_PROJECT_2 = 'MCP Test Project B';
const TEST_TASK_NAME = 'MCP Test Task - Move Me';

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

  // Create test projects and task
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

        -- Return IDs
        return (id of projA as string) & "|" & (id of projB as string) & "|" & (id of testTask as string)
      end tell
    end tell
  `;

  const result = await runAppleScript(setupScript);
  const [projectAId, projectBId, taskId] = result.split('|');

  console.log(`Created Project A: ${TEST_PROJECT_1} (${projectAId})`);
  console.log(`Created Project B: ${TEST_PROJECT_2} (${projectBId})`);
  console.log(`Created Task: ${TEST_TASK_NAME} (${taskId})`);

  return { projectAId, projectBId, taskId };
}

async function testMoveByProjectName(taskId) {
  console.log('\n=== TEST: Move task by project name ===');

  const moveScript = `
    tell application "OmniFocus"
      tell front document
        -- Find the task using whose clause
        set foundTask to missing value
        try
          set foundTask to first flattened task whose id = "${taskId}"
        end try

        if foundTask is missing value then
          return "ERROR: Task not found"
        end if

        -- Find destination project using whose clause
        set destProject to missing value
        try
          set destProject to first flattened project whose name = "${TEST_PROJECT_2}"
        end try

        if destProject is missing value then
          return "ERROR: Destination project not found"
        end if

        -- Move the task
        move foundTask to end of tasks of destProject

        -- Verify the move
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

async function testMoveByProjectId(taskId, projectAId) {
  console.log('\n=== TEST: Move task back by project ID ===');

  const moveScript = `
    tell application "OmniFocus"
      tell front document
        -- Find the task using whose clause
        set foundTask to missing value
        try
          set foundTask to first flattened task whose id = "${taskId}"
        end try

        if foundTask is missing value then
          return "ERROR: Task not found"
        end if

        -- Find destination project by ID using whose clause
        set destProject to missing value
        try
          set destProject to first flattened project whose id = "${projectAId}"
        end try

        if destProject is missing value then
          return "ERROR: Destination project not found"
        end if

        -- Move the task
        move foundTask to end of tasks of destProject

        -- Verify the move
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

async function cleanup(projectAId, projectBId) {
  console.log('\n=== CLEANUP ===');

  const cleanupScript = `
    tell application "OmniFocus"
      tell front document
        -- Delete test projects using whose clause
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

async function main() {
  console.log('========================================');
  console.log('OmniFocus MCP - Task Move Test');
  console.log('========================================');

  let testData = null;
  let allPassed = true;

  try {
    // Setup
    testData = await setup();

    // Wait a moment for OmniFocus to sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 1: Move by project name
    const test1 = await testMoveByProjectName(testData.taskId);
    if (!test1) allPassed = false;

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Move by project ID
    const test2 = await testMoveByProjectId(testData.taskId, testData.projectAId);
    if (!test2) allPassed = false;

  } catch (error) {
    console.error('\nTest failed with error:', error.message);
    allPassed = false;
  } finally {
    // Cleanup
    if (testData) {
      await cleanup(testData.projectAId, testData.projectBId);
    }
  }

  console.log('\n========================================');
  console.log(allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  console.log('========================================\n');

  process.exit(allPassed ? 0 : 1);
}

main();
