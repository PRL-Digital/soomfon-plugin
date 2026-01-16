/**
 * Input Validation Utilities
 * Security-focused validation helpers for user input sanitization
 */

// ============================================================================
// Constants
// ============================================================================

/** Maximum base64 image size in bytes (500KB - reasonable for 72x72 LCD) */
export const MAX_IMAGE_SIZE_BYTES = 500 * 1024;

/** Maximum base64 string length (accounts for base64 encoding overhead) */
export const MAX_BASE64_STRING_LENGTH = Math.ceil(MAX_IMAGE_SIZE_BYTES * 4 / 3);

/** Regex for valid base64 string format */
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

/** Regex for data URL format: data:image/xxx;base64,... */
const DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|gif|bmp|webp|svg\+xml);base64,/i;

// ============================================================================
// Base64 Validation
// ============================================================================

export interface Base64ValidationResult {
  isValid: boolean;
  error?: string;
  decodedSize?: number;
}

/**
 * Validates a base64 encoded string
 * @param input - The base64 string to validate
 * @param maxSizeBytes - Maximum allowed decoded size in bytes
 * @returns Validation result with error message if invalid
 */
export function validateBase64(
  input: string | undefined | null,
  maxSizeBytes: number = MAX_IMAGE_SIZE_BYTES
): Base64ValidationResult {
  // Handle empty/null input
  if (!input || input.length === 0) {
    return { isValid: false, error: 'Image data is empty' };
  }

  // Strip data URL prefix if present
  let base64Data = input;
  if (DATA_URL_REGEX.test(input)) {
    const commaIndex = input.indexOf(',');
    if (commaIndex !== -1) {
      base64Data = input.slice(commaIndex + 1);
    }
  }

  // Check string length limit
  if (base64Data.length > MAX_BASE64_STRING_LENGTH) {
    return {
      isValid: false,
      error: `Image data too large: ${base64Data.length} characters exceeds maximum ${MAX_BASE64_STRING_LENGTH}`,
    };
  }

  // Check for valid base64 format
  if (!BASE64_REGEX.test(base64Data)) {
    return { isValid: false, error: 'Invalid base64 format' };
  }

  // Calculate decoded size (base64 encodes 3 bytes as 4 characters)
  const paddingCount = (base64Data.match(/=/g) || []).length;
  const decodedSize = Math.floor((base64Data.length * 3) / 4) - paddingCount;

  if (decodedSize > maxSizeBytes) {
    return {
      isValid: false,
      error: `Decoded image size ${decodedSize} bytes exceeds maximum ${maxSizeBytes} bytes`,
    };
  }

  return { isValid: true, decodedSize };
}

/**
 * Extracts and validates base64 data from a string that may be a data URL
 * @param input - The input string (may be data URL or raw base64)
 * @returns The raw base64 data if valid, null if invalid
 */
export function extractBase64Data(input: string): string | null {
  if (!input || input.length === 0) {
    return null;
  }

  // Strip data URL prefix if present
  if (DATA_URL_REGEX.test(input)) {
    const commaIndex = input.indexOf(',');
    if (commaIndex !== -1) {
      return input.slice(commaIndex + 1);
    }
  }

  // Check if it's valid base64
  if (BASE64_REGEX.test(input)) {
    return input;
  }

  return null;
}

// ============================================================================
// Path Validation
// ============================================================================

/** Characters that are dangerous in shell commands */
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>*?!#~]/;

/** Path traversal patterns */
const PATH_TRAVERSAL_PATTERN = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export interface PathValidationResult {
  isValid: boolean;
  warnings: string[];
  error?: string;
}

/**
 * Validates a file path for potential security issues
 * Note: This is advisory validation. The application intentionally allows
 * running scripts/programs from any location - this just logs warnings.
 * @param filePath - The file path to validate
 * @returns Validation result with any warnings
 */
export function validateFilePath(filePath: string | undefined | null): PathValidationResult {
  const warnings: string[] = [];

  if (!filePath || filePath.length === 0) {
    return { isValid: false, warnings, error: 'Path is empty' };
  }

  // Check for path traversal
  if (PATH_TRAVERSAL_PATTERN.test(filePath)) {
    warnings.push(`Path contains traversal pattern (..): ${filePath}`);
  }

  // Check for shell metacharacters (only warning, not blocking)
  if (SHELL_METACHARACTERS.test(filePath)) {
    warnings.push(`Path contains shell metacharacters: ${filePath}`);
  }

  // Check for very long paths (potential DoS)
  if (filePath.length > 4096) {
    return { isValid: false, warnings, error: 'Path is too long (max 4096 characters)' };
  }

  return { isValid: true, warnings };
}

/**
 * Checks if a path contains path traversal sequences
 * @param filePath - The path to check
 * @returns true if path traversal detected
 */
export function hasPathTraversal(filePath: string): boolean {
  return PATH_TRAVERSAL_PATTERN.test(filePath);
}

// ============================================================================
// Image Validation
// ============================================================================

/**
 * Validates image input which can be either a file path or base64 data
 * @param input - The image input string
 * @returns Validation result
 */
export function validateImageInput(input: string | undefined | null): Base64ValidationResult | PathValidationResult {
  if (!input || input.length === 0) {
    return { isValid: false, error: 'Image input is empty' } as Base64ValidationResult;
  }

  // Check if it looks like base64 data or data URL
  if (DATA_URL_REGEX.test(input) || (input.length > 100 && BASE64_REGEX.test(input.slice(0, 100)))) {
    return validateBase64(input);
  }

  // Otherwise treat as file path
  return validateFilePath(input);
}
