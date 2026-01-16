/**
 * Tests for Input Validation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateBase64,
  extractBase64Data,
  validateFilePath,
  hasPathTraversal,
  validateImageInput,
  MAX_IMAGE_SIZE_BYTES,
  MAX_BASE64_STRING_LENGTH,
} from './validation';

describe('validateBase64', () => {
  it('should validate valid base64 string', () => {
    const result = validateBase64('SGVsbG8gV29ybGQ=');
    expect(result.isValid).toBe(true);
    expect(result.decodedSize).toBe(11); // "Hello World"
  });

  it('should validate base64 string with data URL prefix', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const result = validateBase64(dataUrl);
    expect(result.isValid).toBe(true);
  });

  it('should reject empty input', () => {
    expect(validateBase64('')).toEqual({
      isValid: false,
      error: 'Image data is empty',
    });
    expect(validateBase64(null)).toEqual({
      isValid: false,
      error: 'Image data is empty',
    });
    expect(validateBase64(undefined)).toEqual({
      isValid: false,
      error: 'Image data is empty',
    });
  });

  it('should reject invalid base64 format', () => {
    const result = validateBase64('not-valid-base64!@#$');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid base64 format');
  });

  it('should reject base64 that exceeds max string length', () => {
    // Create a string longer than MAX_BASE64_STRING_LENGTH
    const longBase64 = 'A'.repeat(MAX_BASE64_STRING_LENGTH + 100);
    const result = validateBase64(longBase64);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('should reject decoded data that exceeds max size', () => {
    // Create base64 that decodes to more than allowed size
    const maxSizeBytes = 100;
    // 200 bytes of data encoded as base64 (about 268 characters)
    const largeData = 'A'.repeat(Math.ceil(200 * 4 / 3));
    const result = validateBase64(largeData, maxSizeBytes);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceeds maximum');
  });

  it('should handle base64 with padding correctly', () => {
    // "a" = 1 byte, padded to "YQ=="
    expect(validateBase64('YQ==').decodedSize).toBe(1);
    // "ab" = 2 bytes, padded to "YWI="
    expect(validateBase64('YWI=').decodedSize).toBe(2);
    // "abc" = 3 bytes, no padding "YWJj"
    expect(validateBase64('YWJj').decodedSize).toBe(3);
  });

  it('should validate common image data URLs', () => {
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const jpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQ';
    const gifDataUrl = 'data:image/gif;base64,R0lGODlh';

    expect(validateBase64(pngDataUrl).isValid).toBe(true);
    expect(validateBase64(jpegDataUrl).isValid).toBe(true);
    expect(validateBase64(gifDataUrl).isValid).toBe(true);
  });
});

describe('extractBase64Data', () => {
  it('should extract base64 from data URL', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    expect(extractBase64Data(dataUrl)).toBe('iVBORw0KGgo=');
  });

  it('should return raw base64 if not a data URL', () => {
    const raw = 'SGVsbG8gV29ybGQ=';
    expect(extractBase64Data(raw)).toBe(raw);
  });

  it('should return null for empty input', () => {
    expect(extractBase64Data('')).toBe(null);
  });

  it('should return null for invalid base64', () => {
    expect(extractBase64Data('not-valid!@#')).toBe(null);
  });

  it('should handle various image MIME types', () => {
    expect(extractBase64Data('data:image/png;base64,ABC=')).toBe('ABC=');
    expect(extractBase64Data('data:image/jpeg;base64,DEF=')).toBe('DEF=');
    expect(extractBase64Data('data:image/gif;base64,GHI=')).toBe('GHI=');
    expect(extractBase64Data('data:image/webp;base64,JKL=')).toBe('JKL=');
    expect(extractBase64Data('data:image/svg+xml;base64,MNO=')).toBe('MNO=');
  });
});

describe('validateFilePath', () => {
  it('should accept valid simple path', () => {
    const result = validateFilePath('C:\\Users\\test\\file.txt');
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should accept valid Unix path', () => {
    const result = validateFilePath('/home/user/file.txt');
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should reject empty path', () => {
    expect(validateFilePath('')).toEqual({
      isValid: false,
      warnings: [],
      error: 'Path is empty',
    });
    expect(validateFilePath(null)).toEqual({
      isValid: false,
      warnings: [],
      error: 'Path is empty',
    });
  });

  it('should warn about path traversal', () => {
    const result = validateFilePath('../../../etc/passwd');
    expect(result.isValid).toBe(true); // Still valid but has warnings
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('traversal');
  });

  it('should warn about shell metacharacters', () => {
    const result = validateFilePath('file; rm -rf /');
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('metacharacters');
  });

  it('should reject very long paths', () => {
    const longPath = 'A'.repeat(5000);
    const result = validateFilePath(longPath);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too long');
  });
});

describe('hasPathTraversal', () => {
  it('should detect path traversal patterns', () => {
    expect(hasPathTraversal('../file')).toBe(true);
    expect(hasPathTraversal('..\\file')).toBe(true);
    expect(hasPathTraversal('/etc/../passwd')).toBe(true);
    expect(hasPathTraversal('C:\\..\\Windows')).toBe(true);
    expect(hasPathTraversal('dir/subdir/../../file')).toBe(true);
  });

  it('should not flag normal paths', () => {
    expect(hasPathTraversal('/home/user/file.txt')).toBe(false);
    expect(hasPathTraversal('C:\\Users\\file.txt')).toBe(false);
    expect(hasPathTraversal('./file.txt')).toBe(false);
    expect(hasPathTraversal('file..name.txt')).toBe(false); // dots in filename
  });

  it('should detect traversal at different positions', () => {
    expect(hasPathTraversal('../')).toBe(true);
    expect(hasPathTraversal('foo/../bar')).toBe(true);
    expect(hasPathTraversal('foo/..')).toBe(true);
  });
});

describe('validateImageInput', () => {
  it('should validate base64 image data', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const result = validateImageInput(dataUrl);
    expect(result.isValid).toBe(true);
  });

  it('should validate file path', () => {
    const path = 'C:\\images\\button.png';
    const result = validateImageInput(path);
    expect(result.isValid).toBe(true);
  });

  it('should reject empty input', () => {
    const result = validateImageInput('');
    expect(result.isValid).toBe(false);
  });

  it('should detect long base64 strings as base64 input', () => {
    // Long string that looks like base64
    const longBase64 = 'A'.repeat(200);
    const result = validateImageInput(longBase64);
    // Should be validated as base64, not as file path
    expect(result.isValid).toBe(true);
  });

  it('should detect short strings as file paths', () => {
    const shortPath = 'icon.png';
    const result = validateImageInput(shortPath);
    expect(result.isValid).toBe(true);
    expect('warnings' in result).toBe(true); // File path result has warnings array
  });
});

describe('Constants', () => {
  it('should have reasonable MAX_IMAGE_SIZE_BYTES', () => {
    // 500KB is reasonable for 72x72 LCD button images
    expect(MAX_IMAGE_SIZE_BYTES).toBe(500 * 1024);
  });

  it('should have correct MAX_BASE64_STRING_LENGTH calculation', () => {
    // Base64 encodes 3 bytes as 4 characters
    const expected = Math.ceil(MAX_IMAGE_SIZE_BYTES * 4 / 3);
    expect(MAX_BASE64_STRING_LENGTH).toBe(expected);
  });
});
