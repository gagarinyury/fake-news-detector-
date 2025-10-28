/**
 * @jest-environment jsdom
 */
import { describe, test, expect } from '@jest/globals';
import { knownSites } from '../knownSites.js';

describe('knownSites database', () => {
  test('should be defined and non-empty', () => {
    expect(knownSites).toBeDefined();
    expect(Object.keys(knownSites).length).toBeGreaterThan(0);
  });

  test('should contain at least 100 sources', () => {
    const count = Object.keys(knownSites).length;
    expect(count).toBeGreaterThanOrEqual(100);
  });

  test('should have valid domain names as keys', () => {
    const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/;

    Object.keys(knownSites).forEach(domain => {
      expect(domain).toMatch(domainRegex);
      expect(domain).not.toContain('http');
      expect(domain).not.toContain('www');
    });
  });

  test('should have credibility scores between 0-100', () => {
    Object.values(knownSites).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  test('should include high-credibility sources', () => {
    expect(knownSites['reuters.com']).toBeGreaterThanOrEqual(90);
    expect(knownSites['apnews.com']).toBeGreaterThanOrEqual(90);
    expect(knownSites['bbc.com']).toBeGreaterThanOrEqual(90);
  });

  test('should include low-credibility sources', () => {
    expect(knownSites['infowars.com']).toBeLessThan(20);
    expect(knownSites['naturalnews.com']).toBeLessThan(20);
  });

  test('should include satire sites with low scores', () => {
    expect(knownSites['theonion.com']).toBeLessThan(30);
  });

  test('should have balanced distribution across tiers', () => {
    const scores = Object.values(knownSites);

    const high = scores.filter(s => s >= 80).length;
    const mediumHigh = scores.filter(s => s >= 70 && s < 80).length;
    const medium = scores.filter(s => s >= 50 && s < 70).length;
    const low = scores.filter(s => s < 50).length;

    // At least some sources in each tier
    expect(high).toBeGreaterThan(20);
    expect(mediumHigh).toBeGreaterThan(10);
    expect(medium).toBeGreaterThan(10);
    expect(low).toBeGreaterThan(10);
  });

  test('should include international sources', () => {
    // UK
    expect(knownSites['bbc.co.uk']).toBeDefined();
    expect(knownSites['theguardian.com']).toBeDefined();

    // Canada
    expect(knownSites['cbc.ca']).toBeDefined();

    // Australia
    expect(knownSites['smh.com.au']).toBeDefined();
  });

  test('should not have duplicate domains', () => {
    const domains = Object.keys(knownSites);
    const uniqueDomains = new Set(domains);

    expect(domains.length).toBe(uniqueDomains.size);
  });

  test('should include major US networks', () => {
    expect(knownSites['cnn.com']).toBeDefined();
    expect(knownSites['foxnews.com']).toBeDefined();
    expect(knownSites['nbcnews.com']).toBeDefined();
    expect(knownSites['cbsnews.com']).toBeDefined();
  });

  test('should include quality newspapers', () => {
    expect(knownSites['nytimes.com']).toBeDefined();
    expect(knownSites['washingtonpost.com']).toBeDefined();
    expect(knownSites['wsj.com']).toBeDefined();
  });

  test('should not contain URLs with protocols', () => {
    Object.keys(knownSites).forEach(domain => {
      expect(domain).not.toMatch(/^https?:\/\//);
    });
  });

  test('should not contain paths or query strings', () => {
    Object.keys(knownSites).forEach(domain => {
      expect(domain).not.toContain('/');
      expect(domain).not.toContain('?');
    });
  });
});
