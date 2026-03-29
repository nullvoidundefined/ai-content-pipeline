import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processItem } from './content-processor.js';

const { mockQuery, mockCreate, mockFetchContent } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCreate: vi.fn(),
  mockFetchContent: vi.fn(),
}));

vi.mock('app/db/pool/pool.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

vi.mock('app/services/content-fetcher.service.js', () => ({
  fetchContent: (...args: unknown[]) => mockFetchContent(...args),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function mockJob(data: Record<string, unknown>): Job {
  return { data } as unknown as Job;
}

describe('processItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('marks item as processing, calls Anthropic, and stores results on success', async () => {
    const mockToolUseResponse = {
      id: 'msg_test',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_test',
          name: 'summarize',
          input: {
            summary: 'This is a summary of the article about AI.',
            key_points: ['AI is advancing', 'Tool calling is useful'],
          },
        },
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    mockCreate.mockResolvedValue(mockToolUseResponse);
    mockFetchContent.mockResolvedValue(
      'This is a long enough article about AI and machine learning advances.',
    );

    const job = mockJob({
      itemId: 'item-1',
      batchId: 'batch-1',
      inputType: 'url',
      inputUrl: 'https://example.com/article',
      inputText: null,
    });

    await processItem(job);

    // Should mark as processing
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'processing'"),
      ['item-1'],
    );

    // Should call Anthropic
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
        tools: expect.any(Array),
      }),
    );

    // Should store results (the complete update)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'complete'"),
      expect.arrayContaining([
        'This is a summary of the article about AI.',
        ['AI is advancing', 'Tool calling is useful'],
        'item-1',
      ]),
    );

    // Should update batch counts
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE batches'),
      ['batch-1'],
    );
  });

  it('processes text input directly without fetching', async () => {
    const mockToolUseResponse = {
      id: 'msg_test',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_test',
          name: 'summarize',
          input: {
            summary: 'Summary of provided text.',
            key_points: ['Point one'],
          },
        },
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 50, output_tokens: 30 },
    };
    mockCreate.mockResolvedValue(mockToolUseResponse);

    const job = mockJob({
      itemId: 'item-2',
      batchId: 'batch-1',
      inputType: 'text',
      inputUrl: null,
      inputText: 'This is some text content that should be analyzed directly.',
    });

    await processItem(job);

    expect(mockFetchContent).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
  });

  it('marks item as failed when content is too short', async () => {
    mockFetchContent.mockResolvedValue('Short');

    const job = mockJob({
      itemId: 'item-3',
      batchId: 'batch-1',
      inputType: 'url',
      inputUrl: 'https://example.com/empty',
      inputText: null,
    });

    await processItem(job);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining(['Content too short to process', 'item-3']),
    );
  });

  it('marks item as failed when no content is available', async () => {
    const job = mockJob({
      itemId: 'item-4',
      batchId: 'batch-1',
      inputType: 'url',
      inputUrl: null,
      inputText: null,
    });

    await processItem(job);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining(['No content available for processing', 'item-4']),
    );
  });

  it('marks item as failed when LLM does not return a summarize tool call', async () => {
    mockFetchContent.mockResolvedValue(
      'This is a long enough article about some topic for processing.',
    );

    const mockTextResponse = {
      id: 'msg_test',
      content: [{ type: 'text', text: 'Here is my analysis...' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 80 },
    };
    mockCreate.mockResolvedValue(mockTextResponse);

    const job = mockJob({
      itemId: 'item-5',
      batchId: 'batch-1',
      inputType: 'url',
      inputUrl: 'https://example.com',
      inputText: null,
    });

    await processItem(job);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining([
        'LLM did not return a summary tool call',
        'item-5',
      ]),
    );
  });

  it('marks item as failed when Anthropic API throws', async () => {
    mockFetchContent.mockResolvedValue(
      'This is a sufficiently long article about technology and its impact.',
    );
    mockCreate.mockRejectedValue(new Error('Rate limited'));

    const job = mockJob({
      itemId: 'item-6',
      batchId: 'batch-1',
      inputType: 'url',
      inputUrl: 'https://example.com',
      inputText: null,
    });

    await processItem(job);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining(['Rate limited', 'item-6']),
    );
  });

  it('handles tool_use response with missing key_points gracefully', async () => {
    const mockToolUseResponse = {
      id: 'msg_test',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_test',
          name: 'summarize',
          input: {
            summary: 'Summary without key points.',
          },
        },
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 50, output_tokens: 30 },
    };
    mockCreate.mockResolvedValue(mockToolUseResponse);
    mockFetchContent.mockResolvedValue(
      'Sufficiently long content for processing and analysis here.',
    );

    const job = mockJob({
      itemId: 'item-7',
      batchId: 'batch-1',
      inputType: 'url',
      inputUrl: 'https://example.com',
      inputText: null,
    });

    await processItem(job);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'complete'"),
      expect.arrayContaining(['Summary without key points.', null, 'item-7']),
    );
  });
});
