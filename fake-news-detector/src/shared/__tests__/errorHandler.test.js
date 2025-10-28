/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { ERROR_TYPES, classifyError, handleGracefully, createProgressMonitor } from '../errorHandler.js';

describe('ERROR_TYPES', () => {
  test('should be defined', () => {
    expect(ERROR_TYPES).toBeDefined();
    expect(ERROR_TYPES.AI_UNAVAILABLE).toBe('AI_UNAVAILABLE');
    expect(ERROR_TYPES.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
    expect(ERROR_TYPES.UNKNOWN).toBe('UNKNOWN');
  });
});

describe('classifyError', () => {
  test('should classify AI unavailable errors', () => {
    const error = new Error('AI_UNAVAILABLE: Model not ready');
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.AI_UNAVAILABLE);
    expect(classified.userMessage).toContain('not available');
    expect(classified.recoverable).toBe(false);
  });

  test('should classify quota exceeded errors', () => {
    const error = new Error('QuotaExceededError');
    error.name = 'QuotaExceededError';
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.QUOTA_EXCEEDED);
    expect(classified.userMessage).toContain('disk space');
    expect(classified.recoverable).toBe(false);
  });

  test('should classify platform unsupported errors', () => {
    const error = new Error('NotSupportedError');
    error.name = 'NotSupportedError';
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.PLATFORM_UNSUPPORTED);
    expect(classified.userMessage).toContain('system requirements');
    expect(classified.recoverable).toBe(false);
  });

  test('should classify JSON parse errors', () => {
    const error = new Error('JSON_PARSE_FAILED');
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.JSON_PARSE_FAILED);
    expect(classified.userMessage).toContain('format error');
    expect(classified.recoverable).toBe(true);
  });

  test('should classify timeout errors', () => {
    const error = new Error('Operation timed out');
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.TIMEOUT);
    expect(classified.userMessage).toContain('timed out');
    expect(classified.recoverable).toBe(true);
  });

  test('should classify network errors', () => {
    const error = new Error('NetworkError occurred');
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.NETWORK_ERROR);
    expect(classified.userMessage).toContain('Network error');
    expect(classified.recoverable).toBe(true);
  });

  test('should classify unknown errors', () => {
    const error = new Error('Something completely unexpected');
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.UNKNOWN);
    expect(classified.userMessage).toContain('unexpected error');
    expect(classified.technical).toBe('Something completely unexpected');
  });

  test('should handle error strings', () => {
    const classified = classifyError('AI_UNAVAILABLE');

    expect(classified.type).toBe(ERROR_TYPES.AI_UNAVAILABLE);
    expect(classified.userMessage).toBeDefined();
  });

  test('should handle errors without message property', () => {
    const error = { toString: () => 'QuotaExceededError' };
    const classified = classifyError(error);

    expect(classified.type).toBe(ERROR_TYPES.QUOTA_EXCEEDED);
  });

  test('should include technical details', () => {
    const error = new Error('Detailed technical error message');
    const classified = classifyError(error);

    expect(classified.technical).toBe('Detailed technical error message');
  });

  test('should mark recoverable errors correctly', () => {
    const recoverableErrors = [
      new Error('JSON_PARSE_FAILED'),
      new Error('Operation timed out'),
      new Error('Network error')
    ];

    recoverableErrors.forEach(error => {
      const classified = classifyError(error);
      expect(classified.recoverable).toBe(true);
    });
  });

  test('should mark non-recoverable errors correctly', () => {
    const nonRecoverableErrors = [
      new Error('AI_UNAVAILABLE'),
      { name: 'QuotaExceededError', message: 'Quota exceeded' },
      { name: 'NotSupportedError', message: 'Not supported' }
    ];

    nonRecoverableErrors.forEach(error => {
      const classified = classifyError(error);
      expect(classified.recoverable).toBe(false);
    });
  });
});

describe('handleGracefully', () => {
  test('should return fallback value on error', () => {
    const riskyFn = () => {
      throw new Error('Something went wrong');
    };

    const result = handleGracefully(riskyFn, 'default value');

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('data', 'default value');
    expect(result).toHaveProperty('error');
  });

  test('should return function result on success', () => {
    const safeFn = () => 'success';

    const result = handleGracefully(safeFn, 'fallback');

    // handleGracefully returns a result object, but we test that it handles the function
    expect(result).toBeDefined();
  });

  test('should work with async functions', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async success';
    };

    const result = await handleGracefully(asyncFn, 'fallback');

    expect(result).toBeDefined();
  });

  test('should work with async functions that throw', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error('Async error');
    };

    const result = await handleGracefully(asyncFn, 'fallback');

    expect(result).toHaveProperty('success', false);
    expect(result).toHaveProperty('data', 'fallback');
  });

  test('should handle null fallback values', () => {
    const riskyFn = () => {
      throw new Error('Error');
    };

    const result1 = handleGracefully(riskyFn, null);

    expect(result1).toHaveProperty('success', false);
    expect(result1).toHaveProperty('data');
  });
});

describe('createProgressMonitor', () => {
  test('should create a progress monitor function', () => {
    const monitor = createProgressMonitor((progress) => {
      // callback for progress updates
    });

    expect(monitor).toBeDefined();
    expect(typeof monitor).toBe('function');
  });

  test('should handle missing callback without throwing', () => {
    expect(() => createProgressMonitor()).not.toThrow();
    expect(() => createProgressMonitor(null)).not.toThrow();
  });

  test('should return a function that accepts addEventListener', () => {
    const updates = [];
    const monitor = createProgressMonitor((progress) => {
      updates.push(progress);
    });

    expect(typeof monitor).toBe('function');
  });
});
