import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// Interface for tag creation parameters
export interface AddTagParams {
  name: string;
  parentTagId?: string;   // ID of parent tag (for nested tags)
  parentTagName?: string; // Name of parent tag (used if ID not provided)
}

/**
 * Generate pure AppleScript for tag creation
 */
function generateAppleScript(params: AddTagParams): string {
  // Sanitize and prepare parameters for AppleScript
  const name = params.name.replace(/['"\\]/g, '\\$&'); // Escape quotes and backslashes
  const parentTagId = params.parentTagId?.replace(/['"\\]/g, '\\$&') || '';
  const parentTagName = params.parentTagName?.replace(/['"\\]/g, '\\$&') || '';

  // Construct AppleScript with error handling
  let script = `
  try
    tell application "OmniFocus"
      tell front document
        -- Determine the container (root or parent tag)
        set parentTag to missing value
`;

  // Find parent tag if specified
  if (parentTagId) {
    script += `
        -- Find parent tag by ID
        try
          set parentTag to first flattened tag whose id = "${parentTagId}"
        end try
`;
  } else if (parentTagName) {
    script += `
        -- Find parent tag by name
        try
          set parentTag to first flattened tag whose name = "${parentTagName}"
        end try
`;
  }

  script += `
        -- Create the tag
        if parentTag is missing value then
          -- Create tag at root level
          set newTag to make new tag with properties {name:"${name}"}
        else
          -- Create tag under parent
          set newTag to make new tag with properties {name:"${name}"} at end of tags of parentTag
        end if

        -- Get the tag ID
        set tagId to id of newTag as string

        -- Get parent info if exists
        set parentInfo to ""
        try
          set parentOfTag to container of newTag
          if parentOfTag is not missing value then
            set parentInfo to name of parentOfTag
          end if
        end try

        -- Return success with tag ID
        return "{\\\"success\\\":true,\\\"tagId\\\":\\"" & tagId & "\\",\\\"name\\\":\\"${name}\\",\\\"parentName\\\":\\"" & parentInfo & "\\"}"
      end tell
    end tell
  on error errorMessage
    return "{\\\"success\\\":false,\\\"error\\\":\\"" & errorMessage & "\\"}"
  end try
  `;

  return script;
}

/**
 * Add a tag to OmniFocus
 */
export async function addTag(params: AddTagParams): Promise<{
  success: boolean;
  tagId?: string;
  name?: string;
  parentName?: string;
  error?: string;
}> {
  try {
    // Generate AppleScript
    const script = generateAppleScript(params);

    console.error("Executing AppleScript for tag creation...");
    console.error(`Tag name: ${params.name}, Parent ID: ${params.parentTagId || 'not provided'}, Parent Name: ${params.parentTagName || 'not provided'}`);

    // Execute AppleScript directly
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);

    if (stderr) {
      console.error("AppleScript stderr:", stderr);
    }

    console.error("AppleScript stdout:", stdout);

    // Parse the result
    try {
      const result = JSON.parse(stdout);

      // Return the result
      return {
        success: result.success,
        tagId: result.tagId,
        name: result.name,
        parentName: result.parentName,
        error: result.error
      };
    } catch (parseError) {
      console.error("Error parsing AppleScript result:", parseError);
      return {
        success: false,
        error: `Failed to parse result: ${stdout}`
      };
    }
  } catch (error: any) {
    console.error("Error in addTag:", error);
    return {
      success: false,
      error: error?.message || "Unknown error in addTag"
    };
  }
}
