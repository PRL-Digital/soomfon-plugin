/**
 * Text Action Handler
 * Types text strings using nut-tree-fork/nut-js
 */

import { keyboard } from '@nut-tree-fork/nut-js';
import {
  ActionHandler,
  ActionExecutionResult,
  TextAction,
} from '../../../shared/types/actions';

/**
 * Default delay between characters in milliseconds
 */
const DEFAULT_TYPE_DELAY = 0;

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TextHandler - Handles text typing action execution
 *
 * Features:
 * - Types arbitrary text strings via keyboard simulation
 * - Supports configurable delay between characters
 * - Handles empty text gracefully
 */
export class TextHandler implements ActionHandler<TextAction> {
  readonly actionType = 'text' as const;

  /**
   * Execute a text typing action
   * @param action The text action to execute
   */
  async execute(action: TextAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      // Check if action is enabled
      if (!action.enabled) {
        throw new Error('Action is disabled');
      }

      // Validate text is provided
      if (!action.text || action.text.length === 0) {
        throw new Error('No text to type');
      }

      const typeDelay = action.typeDelay ?? DEFAULT_TYPE_DELAY;

      if (typeDelay > 0) {
        // Type character by character with delay
        await this.typeWithDelay(action.text, typeDelay);
      } else {
        // Type all at once using nut-js keyboard.type()
        await keyboard.type(action.text);
      }

      const endTime = Date.now();
      return {
        status: 'success',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        data: { textLength: action.text.length },
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        status: 'failure',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Type text character by character with a delay between each
   * @param text The text to type
   * @param delay Delay in milliseconds between characters
   */
  private async typeWithDelay(text: string, delay: number): Promise<void> {
    for (const char of text) {
      await keyboard.type(char);
      await sleep(delay);
    }
  }
}

/**
 * Factory function to create a TextHandler instance
 */
export function createTextHandler(): TextHandler {
  return new TextHandler();
}
