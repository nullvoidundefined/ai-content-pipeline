import { describe, expect, it } from 'vitest';
import { createBatchSchema } from './batch.js';

describe('createBatchSchema', () => {
  it('accepts valid URL items', () => {
    const result = createBatchSchema.safeParse({
      items: [{ type: 'url', url: 'https://example.com/article' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid text items', () => {
    const result = createBatchSchema.safeParse({
      items: [{ type: 'text', text: 'Some content to analyze' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts mixed URL and text items', () => {
    const result = createBatchSchema.safeParse({
      items: [
        { type: 'url', url: 'https://example.com' },
        { type: 'text', text: 'Some text' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = createBatchSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 50 items', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      type: 'text' as const,
      text: `Item ${i}`,
    }));
    const result = createBatchSchema.safeParse({ items });
    expect(result.success).toBe(false);
  });

  it('rejects invalid input type', () => {
    const result = createBatchSchema.safeParse({
      items: [{ type: 'pdf', url: 'https://example.com/doc.pdf' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL format', () => {
    const result = createBatchSchema.safeParse({
      items: [{ type: 'url', url: 'not-a-url' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty text', () => {
    const result = createBatchSchema.safeParse({
      items: [{ type: 'text', text: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing items field', () => {
    const result = createBatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts exactly 50 items', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      type: 'text' as const,
      text: `Item ${i}`,
    }));
    const result = createBatchSchema.safeParse({ items });
    expect(result.success).toBe(true);
  });
});
