import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchContent } from './content-fetcher.service.js';

vi.mock('app/utils/logs/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockExtract = vi.fn();
vi.mock('@extractus/article-extractor', () => ({
  extract: (...args: unknown[]) => mockExtract(...args),
}));

describe('fetchContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns extracted article content when extraction succeeds', async () => {
    mockExtract.mockResolvedValue({
      content: '<p>This is the <strong>article</strong> content.</p>',
    });

    const result = await fetchContent('https://example.com/article');

    expect(mockExtract).toHaveBeenCalledWith('https://example.com/article');
    expect(result).toBe('This is the article content.');
  });

  it('strips HTML tags from extracted content', async () => {
    mockExtract.mockResolvedValue({
      content: '<div><h1>Title</h1><p>Para 1</p><p>Para 2</p></div>',
    });

    const result = await fetchContent('https://example.com');

    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('Title');
  });

  it('falls back to raw fetch when extraction returns no content', async () => {
    mockExtract.mockResolvedValue({ content: null });

    const mockResponse = {
      ok: true,
      text: vi
        .fn()
        .mockResolvedValue(
          '<html><body><p>Fallback content here</p></body></html>',
        ),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const result = await fetchContent('https://example.com');

    expect(result).toContain('Fallback content here');
    expect(result).not.toContain('<p>');
  });

  it('falls back to raw fetch when extraction throws', async () => {
    mockExtract.mockRejectedValue(new Error('Extraction failed'));

    const mockResponse = {
      ok: true,
      text: vi
        .fn()
        .mockResolvedValue('<html><body>Raw HTML content</body></html>'),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const result = await fetchContent('https://example.com');

    expect(result).toContain('Raw HTML content');
  });

  it('throws when raw fetch returns non-OK response', async () => {
    mockExtract.mockResolvedValue({ content: null });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as any);

    await expect(fetchContent('https://example.com/missing')).rejects.toThrow(
      'Failed to fetch URL: 404 Not Found',
    );
  });

  it('strips script and style tags from fallback HTML', async () => {
    mockExtract.mockResolvedValue({ content: null });

    const html =
      '<html><head><style>body{color:red}</style></head><body><script>alert("xss")</script><p>Clean text</p></body></html>';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(html),
    } as any);

    const result = await fetchContent('https://example.com');

    expect(result).not.toContain('alert');
    expect(result).not.toContain('color:red');
    expect(result).toContain('Clean text');
  });

  it('truncates content to 8000 characters', async () => {
    const longContent = 'A'.repeat(10000);
    mockExtract.mockResolvedValue({
      content: `<p>${longContent}</p>`,
    });

    const result = await fetchContent('https://example.com');

    expect(result.length).toBeLessThanOrEqual(8000);
  });

  it('falls back when extracted content is empty string after stripping', async () => {
    mockExtract.mockResolvedValue({
      content: '<div>  </div>',
    });

    // The stripped text is empty after trimming whitespace, but the regex
    // replaces tags with spaces so " " becomes " " which trims to "".
    // This means length === 0, so it falls back.
    const mockResponse = {
      ok: true,
      text: vi.fn().mockResolvedValue('<p>Fallback</p>'),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const result = await fetchContent('https://example.com');

    expect(result).toContain('Fallback');
  });
});
