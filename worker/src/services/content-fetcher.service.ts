import { extract } from '@extractus/article-extractor';
import { logger } from 'app/utils/logs/logger.js';

/** Fetch and extract readable text content from a URL. */
export async function fetchContent(url: string): Promise<string> {
  try {
    const article = await extract(url);
    if (article?.content) {
      // Strip HTML tags and normalize whitespace
      const text = article.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 0) {
        // Truncate to ~8000 chars to stay within token limits
        return text.slice(0, 8000);
      }
    }
  } catch (err) {
    logger.warn(
      { err, url },
      'Article extraction failed, falling back to raw fetch',
    );
  }

  // Fallback: fetch raw HTML and extract text
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ContentPipeline/1.0' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, 8000);
}
