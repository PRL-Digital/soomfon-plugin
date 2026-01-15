/**
 * Media Action Handler
 * Handles media control using nut-tree-fork/nut-js media keys
 */

import { keyboard, Key } from '@nut-tree-fork/nut-js';
import {
  ActionHandler,
  ActionExecutionResult,
  MediaAction,
  MediaActionType,
} from '../../../shared/types/actions';

/**
 * Map of media action types to nut-js Key values
 */
const MEDIA_KEY_MAP: Record<MediaActionType, Key> = {
  play_pause: Key.AudioPlay,
  next: Key.AudioNext,
  previous: Key.AudioPrev,
  stop: Key.AudioStop,
  volume_up: Key.AudioVolUp,
  volume_down: Key.AudioVolDown,
  mute: Key.AudioMute,
};

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send a media key press
 * @param key The nut-js Key to press
 */
async function sendMediaKey(key: Key): Promise<void> {
  await keyboard.pressKey(key);
  await keyboard.releaseKey(key);
}

/**
 * MediaHandler - Handles media action execution
 *
 * Features:
 * - Play/pause, next, previous, stop media controls
 * - Volume up, down, mute controls
 * - Volume amount parameter for repeated volume adjustments
 */
export class MediaHandler implements ActionHandler<MediaAction> {
  readonly actionType = 'media' as const;

  /** Default delay between repeated key presses in milliseconds */
  private readonly repeatDelay = 50;

  /**
   * Execute a media action
   * @param action The media action to execute
   */
  async execute(action: MediaAction): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      const mediaKey = MEDIA_KEY_MAP[action.action];

      if (mediaKey === undefined) {
        throw new Error(`Unknown media action: ${action.action}`);
      }

      // For volume actions with amount, repeat the key press
      if (
        (action.action === 'volume_up' || action.action === 'volume_down') &&
        action.volumeAmount !== undefined &&
        action.volumeAmount > 1
      ) {
        await this.executeVolumeChange(mediaKey, action.volumeAmount);
      } else {
        // Single key press for other actions
        await sendMediaKey(mediaKey);
      }

      const endTime = Date.now();
      return {
        status: 'success',
        actionId: action.id,
        startTime,
        endTime,
        duration: endTime - startTime,
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
   * Execute volume change with repeated key presses
   * @param key The volume key (up or down)
   * @param amount Number of times to press the key
   */
  private async executeVolumeChange(key: Key, amount: number): Promise<void> {
    // Clamp amount to reasonable range (1-100)
    const repeatCount = Math.min(Math.max(1, Math.round(amount)), 100);

    for (let i = 0; i < repeatCount; i++) {
      await sendMediaKey(key);
      // Small delay between repeated presses to ensure they register
      if (i < repeatCount - 1) {
        await sleep(this.repeatDelay);
      }
    }
  }
}

/**
 * Factory function to create a MediaHandler instance
 */
export function createMediaHandler(): MediaHandler {
  return new MediaHandler();
}

/** Export constants and helpers for testing */
export { MEDIA_KEY_MAP, sendMediaKey };
