import type Anthropic from '@anthropic-ai/sdk';

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'summarize',
    description:
      'Generate a concise summary of the given content. Call this tool to produce a summary that captures the key points, main arguments, and important details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description:
            'A concise summary of the content, 2-4 sentences covering key points',
        },
        key_points: {
          type: 'array',
          items: { type: 'string' },
          description: '3-5 bullet point key takeaways from the content',
        },
      },
      required: ['summary', 'key_points'],
    },
  },
];

export const SYSTEM_PROMPT = `You are a content analysis assistant. You will be given content (either from a URL or raw text) and must analyze it using the available tools.

For the content provided, call the summarize tool to generate a structured summary.

Always call at least one tool. Do not respond with plain text — use the tools to structure your analysis.`;
