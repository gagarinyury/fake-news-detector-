/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import { hashURL } from '../hashing.js';

describe('hashURL', () => {
  test('should hash valid URLs consistently', () => {
    const url = 'https://example.com/article';
    const hash1 = hashURL(url);
    const hash2 = hashURL(url);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBeGreaterThanOrEqual(6);
    expect(hash1.length).toBeLessThanOrEqual(8);
  });

  test('should normalize URLs (remove query params)', () => {
    const url1 = 'https://example.com/article?utm_source=test';
    const url2 = 'https://example.com/article?ref=twitter';
    const url3 = 'https://example.com/article';

    const hash1 = hashURL(url1);
    const hash2 = hashURL(url2);
    const hash3 = hashURL(url3);

    // All should produce same hash (query params ignored)
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  test('should produce different hashes for different URLs', () => {
    const url1 = 'https://example.com/article1';
    const url2 = 'https://example.com/article2';

    const hash1 = hashURL(url1);
    const hash2 = hashURL(url2);

    expect(hash1).not.toBe(hash2);
  });

  test('should handle URLs with different origins', () => {
    const url1 = 'https://example.com/article';
    const url2 = 'https://other.com/article';

    const hash1 = hashURL(url1);
    const hash2 = hashURL(url2);

    expect(hash1).not.toBe(hash2);
  });

  test('should handle URLs with paths', () => {
    const url = 'https://example.com/news/2025/article-title';
    const hash = hashURL(url);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThanOrEqual(6);
    expect(hash.length).toBeLessThanOrEqual(8);
    expect(hash).toMatch(/^[a-z0-9]+$/);
  });

  test('should handle HTTPS and HTTP differently', () => {
    const url1 = 'https://example.com/article';
    const url2 = 'http://example.com/article';

    const hash1 = hashURL(url1);
    const hash2 = hashURL(url2);

    // Different protocols should produce different hashes
    expect(hash1).not.toBe(hash2);
  });

  test('should handle invalid URLs gracefully', () => {
    const invalidURL = 'not-a-url';
    const hash = hashURL(invalidURL);

    // Should return a fallback hash
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThanOrEqual(6); expect(hash.length).toBeLessThanOrEqual(8);
  });

  test('should handle empty string', () => {
    const hash = hashURL('');

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThanOrEqual(6); expect(hash.length).toBeLessThanOrEqual(8);
  });

  test('should handle URLs with fragments', () => {
    const url1 = 'https://example.com/article#section1';
    const url2 = 'https://example.com/article#section2';
    const url3 = 'https://example.com/article';

    const hash1 = hashURL(url1);
    const hash2 = hashURL(url2);
    const hash3 = hashURL(url3);

    // Fragments are part of URL object, but normalize uses origin + pathname
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  test('should produce alphanumeric hashes only', () => {
    const urls = [
      'https://example.com/article',
      'https://news.bbc.com/world/europe',
      'https://www.nytimes.com/2025/10/28/politics/story.html'
    ];

    urls.forEach(url => {
      const hash = hashURL(url);
      expect(hash).toMatch(/^[a-z0-9]+$/);
    });
  });

  test('should handle very long URLs', () => {
    const longPath = 'a'.repeat(1000);
    const url = `https://example.com/${longPath}`;
    const hash = hashURL(url);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThanOrEqual(6); expect(hash.length).toBeLessThanOrEqual(8);
  });

  test('should handle URLs with special characters in path', () => {
    const url = 'https://example.com/article-with-special-chars-!@#$%';
    const hash = hashURL(url);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThanOrEqual(6); expect(hash.length).toBeLessThanOrEqual(8);
  });

  test('should handle subdomains differently', () => {
    const url1 = 'https://www.example.com/article';
    const url2 = 'https://news.example.com/article';

    const hash1 = hashURL(url1);
    const hash2 = hashURL(url2);

    // Different subdomains should produce different hashes
    expect(hash1).not.toBe(hash2);
  });
});
