import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { parsePagination } from './parsePagination.js';

function mockReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

describe('parsePagination', () => {
  it('returns defaults when no query params', () => {
    const result = parsePagination(mockReq());
    expect(result).toEqual({ limit: 20, offset: 0 });
  });

  it('parses valid limit and offset', () => {
    const result = parsePagination(mockReq({ limit: '10', offset: '5' }));
    expect(result).toEqual({ limit: 10, offset: 5 });
  });

  it('caps limit at 100', () => {
    const result = parsePagination(mockReq({ limit: '200' }));
    expect(result.limit).toBe(100);
  });

  it('uses default when limit is 0 (falsy)', () => {
    const result = parsePagination(mockReq({ limit: '0' }));
    expect(result.limit).toBe(20);
  });

  it('floors negative limit at 1', () => {
    const result = parsePagination(mockReq({ limit: '-5' }));
    expect(result.limit).toBe(1);
  });

  it('floors offset at 0', () => {
    const result = parsePagination(mockReq({ offset: '-5' }));
    expect(result.offset).toBe(0);
  });

  it('handles non-numeric values gracefully', () => {
    const result = parsePagination(mockReq({ limit: 'abc', offset: 'xyz' }));
    expect(result).toEqual({ limit: 20, offset: 0 });
  });
});
