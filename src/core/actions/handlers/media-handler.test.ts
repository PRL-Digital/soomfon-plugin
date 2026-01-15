/**
 * MediaHandler Tests
 *
 * Tests for the media action handler that enables:
 * - Play/pause, next, previous, stop media controls
 * - Volume up, down, mute controls
 * - Repeated volume adjustments with volumeAmount
 *
 * Why these tests matter:
 * MediaHandler allows users to control media playback via stream deck buttons.
 * Bugs could cause unresponsive media controls or stuck volume keys.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MediaHandler,
  createMediaHandler,
  MEDIA_KEY_MAP,
  sendMediaKey,
} from './media-handler';
import { MediaAction, MediaActionType } from '../../../shared/types/actions';

// Mock nut-js keyboard module
vi.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    pressKey: vi.fn().mockResolvedValue(undefined),
    releaseKey: vi.fn().mockResolvedValue(undefined),
  },
  Key: {
    AudioPlay: 'AudioPlay',
    AudioNext: 'AudioNext',
    AudioPrev: 'AudioPrev',
    AudioStop: 'AudioStop',
    AudioVolUp: 'AudioVolUp',
    AudioVolDown: 'AudioVolDown',
    AudioMute: 'AudioMute',
  },
}));

// Import after mocking
import { keyboard, Key } from '@nut-tree-fork/nut-js';

// Helper to create a mock MediaAction
const createMockMediaAction = (overrides?: Partial<MediaAction>): MediaAction => ({
  id: 'action-1',
  type: 'media',
  name: 'Media Action',
  enabled: true,
  action: 'play_pause',
  ...overrides,
});

describe('MediaHandler', () => {
  let handler: MediaHandler;

  beforeEach(() => {
    handler = new MediaHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor and actionType', () => {
    it('should have actionType "media"', () => {
      expect(handler.actionType).toBe('media');
    });

    it('should be created via factory function', () => {
      const factoryHandler = createMediaHandler();
      expect(factoryHandler).toBeInstanceOf(MediaHandler);
      expect(factoryHandler.actionType).toBe('media');
    });
  });

  describe('MEDIA_KEY_MAP', () => {
    it('should map play_pause to AudioPlay', () => {
      expect(MEDIA_KEY_MAP.play_pause).toBe(Key.AudioPlay);
    });

    it('should map next to AudioNext', () => {
      expect(MEDIA_KEY_MAP.next).toBe(Key.AudioNext);
    });

    it('should map previous to AudioPrev', () => {
      expect(MEDIA_KEY_MAP.previous).toBe(Key.AudioPrev);
    });

    it('should map stop to AudioStop', () => {
      expect(MEDIA_KEY_MAP.stop).toBe(Key.AudioStop);
    });

    it('should map volume_up to AudioVolUp', () => {
      expect(MEDIA_KEY_MAP.volume_up).toBe(Key.AudioVolUp);
    });

    it('should map volume_down to AudioVolDown', () => {
      expect(MEDIA_KEY_MAP.volume_down).toBe(Key.AudioVolDown);
    });

    it('should map mute to AudioMute', () => {
      expect(MEDIA_KEY_MAP.mute).toBe(Key.AudioMute);
    });

    it('should have all 7 media action types defined', () => {
      const actionTypes: MediaActionType[] = [
        'play_pause',
        'next',
        'previous',
        'stop',
        'volume_up',
        'volume_down',
        'mute',
      ];

      for (const type of actionTypes) {
        expect(MEDIA_KEY_MAP[type]).toBeDefined();
      }
    });
  });

  describe('sendMediaKey', () => {
    it('should press and release the key', async () => {
      await sendMediaKey(Key.AudioPlay);

      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioPlay);
      expect(keyboard.releaseKey).toHaveBeenCalledWith(Key.AudioPlay);
      expect(keyboard.pressKey).toHaveBeenCalledBefore(
        vi.mocked(keyboard.releaseKey)
      );
    });
  });

  describe('execute', () => {
    it('should execute play_pause action', async () => {
      const action = createMockMediaAction({ action: 'play_pause' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(result.actionId).toBe('action-1');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioPlay);
      expect(keyboard.releaseKey).toHaveBeenCalledWith(Key.AudioPlay);
    });

    it('should execute next action', async () => {
      const action = createMockMediaAction({ action: 'next' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioNext);
    });

    it('should execute previous action', async () => {
      const action = createMockMediaAction({ action: 'previous' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioPrev);
    });

    it('should execute stop action', async () => {
      const action = createMockMediaAction({ action: 'stop' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioStop);
    });

    it('should execute mute action', async () => {
      const action = createMockMediaAction({ action: 'mute' });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioMute);
    });

    it('should execute volume_up once without volumeAmount', async () => {
      const action = createMockMediaAction({
        action: 'volume_up',
        volumeAmount: undefined,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(1);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioVolUp);
    });

    it('should execute volume_down once without volumeAmount', async () => {
      const action = createMockMediaAction({
        action: 'volume_down',
        volumeAmount: undefined,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(1);
      expect(keyboard.pressKey).toHaveBeenCalledWith(Key.AudioVolDown);
    });

    it('should execute volume_up once when volumeAmount is 1', async () => {
      const action = createMockMediaAction({
        action: 'volume_up',
        volumeAmount: 1,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(1);
    });

    it('should execute volume_up multiple times with volumeAmount', async () => {
      const action = createMockMediaAction({
        action: 'volume_up',
        volumeAmount: 5,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(5);
      // All calls should be for AudioVolUp
      vi.mocked(keyboard.pressKey).mock.calls.forEach(call => {
        expect(call[0]).toBe(Key.AudioVolUp);
      });
    });

    it('should execute volume_down multiple times with volumeAmount', async () => {
      const action = createMockMediaAction({
        action: 'volume_down',
        volumeAmount: 3,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(3);
      vi.mocked(keyboard.pressKey).mock.calls.forEach(call => {
        expect(call[0]).toBe(Key.AudioVolDown);
      });
    });

    it('should clamp volumeAmount to 100', async () => {
      const action = createMockMediaAction({
        action: 'volume_up',
        volumeAmount: 150,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(100);
    });

    it('should clamp volumeAmount to 1 for zero', async () => {
      const action = createMockMediaAction({
        action: 'volume_up',
        volumeAmount: 0,
      });

      // Note: handler checks volumeAmount > 1, so 0 triggers single press path
      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(1);
    });

    it('should fail for unknown action type', async () => {
      const action = createMockMediaAction({
        action: 'unknown_action' as MediaActionType,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Unknown media action: unknown_action');
    });

    it('should handle keyboard.pressKey errors', async () => {
      vi.mocked(keyboard.pressKey).mockRejectedValueOnce(new Error('Keyboard error'));
      const action = createMockMediaAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Keyboard error');
    });

    it('should handle keyboard.releaseKey errors', async () => {
      vi.mocked(keyboard.releaseKey).mockRejectedValueOnce(new Error('Release error'));
      const action = createMockMediaAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('Release error');
    });

    it('should include accurate timing information', async () => {
      const action = createMockMediaAction();
      const beforeExec = Date.now();

      const result = await handler.execute(action);

      const afterExec = Date.now();

      expect(result.startTime).toBeGreaterThanOrEqual(beforeExec);
      expect(result.startTime).toBeLessThanOrEqual(afterExec);
      expect(result.endTime).toBeGreaterThanOrEqual(result.startTime);
      expect(result.duration).toBe(result.endTime - result.startTime);
    });

    it('should preserve action id in result', async () => {
      const action = createMockMediaAction({ id: 'custom-action-id' });

      const result = await handler.execute(action);

      expect(result.actionId).toBe('custom-action-id');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(keyboard.pressKey).mockRejectedValueOnce('String error');
      const action = createMockMediaAction();

      const result = await handler.execute(action);

      expect(result.status).toBe('failure');
      expect(result.error).toBe('String error');
    });

    it('should round fractional volumeAmount', async () => {
      const action = createMockMediaAction({
        action: 'volume_up',
        volumeAmount: 3.7,
      });

      const result = await handler.execute(action);

      expect(result.status).toBe('success');
      expect(keyboard.pressKey).toHaveBeenCalledTimes(4); // rounded to 4
    });
  });
});
