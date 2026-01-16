/**
 * Debug Logging Utility
 * Provides controlled logging with debug level support
 *
 * Why this exists:
 * - console.log scattered throughout code is hard to disable in production
 * - This logger allows debug output to be controlled via environment variable
 * - Makes it easy to enable verbose logging when needed for debugging
 * - Keeps production builds clean while maintaining debug capability
 *
 * Usage:
 * - Set DEBUG_LOGGING=true environment variable to enable debug output
 * - Use logger.debug() for verbose debugging info (hidden in production)
 * - Use logger.info() for important operational messages
 * - Use logger.warn() for warnings that should be investigated
 * - Use logger.error() for errors that need attention
 */

// Check if debug logging is enabled via environment variable
// In Electron main process, this comes from process.env
// In renderer process, this is typically bundled at build time
const DEBUG =
  typeof process !== 'undefined' &&
  (process.env.DEBUG_LOGGING === 'true' || process.env.NODE_ENV === 'development');

/**
 * Log level type for categorizing messages
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface matching common logging patterns
 */
export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  isDebugEnabled: () => boolean;
}

/**
 * Creates a prefixed logger for a specific module/component
 * @param prefix - The prefix to add to all log messages (e.g., '[HID]', '[IPC]')
 * @returns A logger instance with the prefix
 */
export function createLogger(prefix: string): Logger {
  const formatPrefix = prefix.startsWith('[') ? prefix : `[${prefix}]`;

  return {
    debug: (...args: unknown[]) => {
      if (DEBUG) {
        console.log(formatPrefix, ...args);
      }
    },
    info: (...args: unknown[]) => {
      console.info(formatPrefix, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(formatPrefix, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(formatPrefix, ...args);
    },
    isDebugEnabled: () => DEBUG,
  };
}

/**
 * Default logger without prefix
 * Use createLogger() for module-specific logging
 */
export const logger: Logger = {
  debug: (...args: unknown[]) => {
    if (DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  isDebugEnabled: () => DEBUG,
};

/**
 * Quick debug function - only logs when DEBUG is enabled
 * Use for temporary debugging that should not appear in production
 * @param args - Arguments to log
 */
export const debug = (...args: unknown[]): void => {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
};

export default logger;
