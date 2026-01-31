import { z } from 'zod';
import { addTag, AddTagParams } from '../primitives/addTag.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

export const schema = z.object({
  name: z.string().describe("The name of the tag"),
  parentTagId: z.string().optional().describe("The ID of the parent tag (for creating nested/hierarchical tags)"),
  parentTagName: z.string().optional().describe("The name of the parent tag (used if parentTagId is not provided)")
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra) {
  try {
    // Call the addTag function
    const result = await addTag(args as AddTagParams);

    if (result.success) {
      // Tag was added successfully
      let locationText = result.parentName
        ? `under "${result.parentName}"`
        : "at the root level";

      return {
        content: [{
          type: "text" as const,
          text: `✅ Tag "${args.name}" created successfully ${locationText}. (ID: ${result.tagId})`
        }]
      };
    } else {
      // Tag creation failed
      return {
        content: [{
          type: "text" as const,
          text: `Failed to create tag: ${result.error}`
        }],
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error creating tag: ${error.message}`
      }],
      isError: true
    };
  }
}
