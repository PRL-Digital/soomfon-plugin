/**
 * Import/Export Functionality
 * Provides import and export capabilities for configurations and individual profiles
 */

import type { AppConfig, Profile, ButtonConfig, EncoderConfig } from '../../shared/types/config';
import type { ConfigManager } from './config-manager';
import type { ProfileManager } from './profile-manager';
import { configSchema, profileSchema } from './validation';
import { z } from 'zod';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when import/export operations fail
 */
export class ImportExportError extends Error {
  /** The operation that failed */
  public readonly operation: 'import' | 'export';
  /** The target type (config or profile) */
  public readonly targetType: 'config' | 'profile';
  /** Validation errors if any */
  public readonly validationErrors?: z.ZodError;

  constructor(
    message: string,
    operation: 'import' | 'export',
    targetType: 'config' | 'profile',
    validationErrors?: z.ZodError
  ) {
    super(message);
    this.name = 'ImportExportError';
    this.operation = operation;
    this.targetType = targetType;
    this.validationErrors = validationErrors;
  }
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of an import operation
 */
export interface ImportResult<T> {
  /** Whether the import succeeded */
  success: boolean;
  /** The imported data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Detailed validation errors (if validation failed) */
  validationErrors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  /** Whether the export succeeded */
  success: boolean;
  /** The exported JSON string (if successful) */
  json?: string;
  /** Error message (if failed) */
  error?: string;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Exports the complete application configuration as a JSON string
 * @param configManager - The ConfigManager instance to export from
 * @returns ExportResult containing the JSON string or error
 */
export function exportConfig(configManager: ConfigManager): ExportResult {
  try {
    const config = configManager.getConfig();
    const json = JSON.stringify(config, null, 2);
    return {
      success: true,
      json,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to export configuration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Exports a single profile as a JSON string
 * @param profileManager - The ProfileManager instance to export from
 * @param profileId - The ID of the profile to export
 * @returns ExportResult containing the JSON string or error
 */
export function exportProfile(profileManager: ProfileManager, profileId: string): ExportResult {
  try {
    const profile = profileManager.getById(profileId);

    if (!profile) {
      return {
        success: false,
        error: `Profile with ID "${profileId}" not found`,
      };
    }

    const json = JSON.stringify(profile, null, 2);
    return {
      success: true,
      json,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to export profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Formats Zod validation errors into a readable array
 * @param zodError - The Zod error to format
 * @returns Array of formatted validation error objects
 */
function formatValidationErrors(zodError: z.ZodError): Array<{ path: string; message: string }> {
  return zodError.errors.map(err => ({
    path: err.path.join('.') || 'root',
    message: err.message,
  }));
}

/**
 * Creates a human-readable error message from validation errors
 * @param errors - Array of validation errors
 * @returns Formatted error message string
 */
function createValidationErrorMessage(errors: Array<{ path: string; message: string }>): string {
  if (errors.length === 0) {
    return 'Unknown validation error';
  }

  if (errors.length === 1) {
    return `Validation failed at "${errors[0].path}": ${errors[0].message}`;
  }

  const errorList = errors.slice(0, 5).map(e => `  - ${e.path}: ${e.message}`).join('\n');
  const remaining = errors.length > 5 ? `\n  ... and ${errors.length - 5} more errors` : '';

  return `Validation failed with ${errors.length} errors:\n${errorList}${remaining}`;
}

/**
 * Imports a complete configuration from a JSON string
 * Validates the configuration and replaces the entire current config
 * @param configManager - The ConfigManager instance to import into
 * @param jsonString - The JSON string to import
 * @returns ImportResult with the imported configuration or error
 */
export function importConfig(
  configManager: ConfigManager,
  jsonString: string
): ImportResult<AppConfig> {
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Parse error'}`,
    };
  }

  // Validate the configuration using Zod schema directly
  const validation = configSchema.safeParse(parsed);

  if (!validation.success) {
    const formattedErrors = formatValidationErrors(validation.error);
    return {
      success: false,
      error: createValidationErrorMessage(formattedErrors),
      validationErrors: formattedErrors,
    };
  }

  // Cast to AppConfig - safe because Zod validation passed
  const validatedConfig = validation.data as AppConfig;

  // Import the validated configuration
  try {
    configManager.setConfig(validatedConfig);
    return {
      success: true,
      data: validatedConfig,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Imports a profile from a JSON string
 * Validates the profile, generates a new UUID, and adds it to the configuration
 * The imported profile is never set as default to avoid conflicts
 * @param profileManager - The ProfileManager instance to import into
 * @param jsonString - The JSON string to import
 * @param options - Optional import options
 * @returns ImportResult with the imported profile or error
 */
export function importProfile(
  profileManager: ProfileManager,
  jsonString: string,
  options?: {
    /** Override the profile name (optional) */
    name?: string;
    /** Set as active after import (default: false) */
    setActive?: boolean;
  }
): ImportResult<Profile> {
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Parse error'}`,
    };
  }

  // Validate the profile using Zod schema directly
  const validation = profileSchema.safeParse(parsed);

  if (!validation.success) {
    const formattedErrors = formatValidationErrors(validation.error);
    return {
      success: false,
      error: createValidationErrorMessage(formattedErrors),
      validationErrors: formattedErrors,
    };
  }

  // Cast to Profile types - safe because Zod validation passed
  const validatedProfile = validation.data as Profile;

  // Create new profile with fresh UUID and timestamps
  try {
    const importedProfile = profileManager.create(
      options?.name ?? validatedProfile.name,
      {
        description: validatedProfile.description,
        buttons: validatedProfile.buttons as ButtonConfig[],
        encoders: validatedProfile.encoders as EncoderConfig[],
        isDefault: false, // Imported profiles are never default
      }
    );

    // Optionally set as active
    if (options?.setActive) {
      profileManager.setActive(importedProfile.id);
    }

    return {
      success: true,
      data: importedProfile,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// Async Wrappers (for potential future file-based operations)
// ============================================================================

/**
 * Async wrapper for exportConfig
 * @param configManager - The ConfigManager instance
 * @returns Promise resolving to ExportResult
 */
export async function exportConfigAsync(configManager: ConfigManager): Promise<ExportResult> {
  return exportConfig(configManager);
}

/**
 * Async wrapper for exportProfile
 * @param profileManager - The ProfileManager instance
 * @param profileId - The profile ID to export
 * @returns Promise resolving to ExportResult
 */
export async function exportProfileAsync(
  profileManager: ProfileManager,
  profileId: string
): Promise<ExportResult> {
  return exportProfile(profileManager, profileId);
}

/**
 * Async wrapper for importConfig
 * @param configManager - The ConfigManager instance
 * @param jsonString - The JSON string to import
 * @returns Promise resolving to ImportResult
 */
export async function importConfigAsync(
  configManager: ConfigManager,
  jsonString: string
): Promise<ImportResult<AppConfig>> {
  return importConfig(configManager, jsonString);
}

/**
 * Async wrapper for importProfile
 * @param profileManager - The ProfileManager instance
 * @param jsonString - The JSON string to import
 * @param options - Optional import options
 * @returns Promise resolving to ImportResult
 */
export async function importProfileAsync(
  profileManager: ProfileManager,
  jsonString: string,
  options?: {
    name?: string;
    setActive?: boolean;
  }
): Promise<ImportResult<Profile>> {
  return importProfile(profileManager, jsonString, options);
}
