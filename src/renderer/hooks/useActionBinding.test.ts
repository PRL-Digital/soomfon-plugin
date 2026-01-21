/**
 * @vitest-environment happy-dom
 */

/**
 * Tests for useActionBinding Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionBinding } from './useActionBinding';
import type { Profile } from '@shared/types/config';
import type { ButtonEvent, EncoderEvent } from '@shared/types/device';
import { ButtonEventType, ButtonType, EncoderEventType, SHIFT_BUTTON_INDEX, WORKSPACE_PREV_BUTTON_INDEX, WORKSPACE_NEXT_BUTTON_INDEX } from '@shared/types/device';

// Mock the Tauri API
const mockExecute = vi.fn();
vi.stubGlobal('window', {
  tauriAPI: {
    action: {
      execute: mockExecute,
    },
  },
});

// Mock the logger
vi.mock('@shared/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useActionBinding', () => {
  const createProfile = (overrides: Partial<Profile> = {}): Profile => ({
    id: 'test-profile',
    name: 'Test Profile',
    isDefault: false,
    workspaces: [{
      id: 'workspace-1',
      name: 'Workspace 1',
      buttons: [],
      encoders: [],
    }],
    activeWorkspaceIndex: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  const createButtonEvent = (overrides: Partial<ButtonEvent> = {}): ButtonEvent => ({
    type: ButtonEventType.PRESS,
    buttonIndex: 0,
    buttonType: ButtonType.LCD,
    timestamp: Date.now(),
    isShiftActive: false,
    ...overrides,
  });

  const createEncoderEvent = (overrides: Partial<EncoderEvent> = {}): EncoderEvent => ({
    type: EncoderEventType.ROTATE_CW,
    encoderIndex: 0,
    timestamp: Date.now(),
    isShiftActive: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({
      status: 'success',
      actionId: 'test-action',
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize without error when profile is null', () => {
      const { unmount } = renderHook(() =>
        useActionBinding({
          profile: null,
          lastButtonEvent: null,
          lastEncoderEvent: null,
          isShiftActive: false,
        })
      );

      // Should not throw
      unmount();
    });

    it('should initialize with a profile', () => {
      const profile = createProfile();

      const { unmount } = renderHook(() =>
        useActionBinding({
          profile,
          lastButtonEvent: null,
          lastEncoderEvent: null,
          isShiftActive: false,
        })
      );

      // Should not throw
      unmount();
    });
  });

  describe('button event handling', () => {
    it('should skip shift button events', async () => {
      const profile = createProfile({
        workspaces: [{
          id: 'workspace-1',
          name: 'Workspace 1',
          buttons: [{
            index: SHIFT_BUTTON_INDEX,
            action: {
              id: 'action-1',
              type: 'keyboard',
              name: 'Test',
              enabled: true,
              keys: 'a',
            },
          }],
          encoders: [],
        }],
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile,
            lastButtonEvent: null,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Trigger shift button press
      const shiftEvent = createButtonEvent({
        buttonIndex: SHIFT_BUTTON_INDEX,
        buttonType: ButtonType.NORMAL,
        timestamp: Date.now(),
      });

      await act(async () => {
        rerender({
          profile,
          lastButtonEvent: shiftEvent,
          lastEncoderEvent: null,
          isShiftActive: true,
        });
      });

      // Should not execute any action for shift button
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should skip workspace navigation button events', async () => {
      const profile = createProfile({
        workspaces: [{
          id: 'workspace-1',
          name: 'Workspace 1',
          buttons: [{
            index: WORKSPACE_PREV_BUTTON_INDEX,
            action: {
              id: 'action-1',
              type: 'keyboard',
              name: 'Test',
              enabled: true,
              keys: 'a',
            },
          }],
          encoders: [],
        }],
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile,
            lastButtonEvent: null,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Trigger workspace prev button press
      const prevEvent = createButtonEvent({
        buttonIndex: WORKSPACE_PREV_BUTTON_INDEX,
        buttonType: ButtonType.NORMAL,
        timestamp: Date.now(),
      });

      await act(async () => {
        rerender({
          profile,
          lastButtonEvent: prevEvent,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
      });

      // Should not execute any action for workspace nav button
      expect(mockExecute).not.toHaveBeenCalled();

      // Trigger workspace next button press
      const nextEvent = createButtonEvent({
        buttonIndex: WORKSPACE_NEXT_BUTTON_INDEX,
        buttonType: ButtonType.NORMAL,
        timestamp: Date.now() + 100,
      });

      await act(async () => {
        rerender({
          profile,
          lastButtonEvent: nextEvent,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
      });

      // Should not execute any action for workspace nav button
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should execute action for LCD button press', async () => {
      const testAction = {
        id: 'action-1',
        type: 'keyboard' as const,
        name: 'Test Keyboard',
        enabled: true,
        keys: 'ctrl+v',
      };

      const profile = createProfile({
        workspaces: [{
          id: 'workspace-1',
          name: 'Workspace 1',
          buttons: [{
            index: 0,
            action: testAction,
          }],
          encoders: [],
        }],
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile,
            lastButtonEvent: null,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Wait for bindings to load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Trigger button press
      const buttonEvent = createButtonEvent({
        buttonIndex: 0,
        buttonType: ButtonType.LCD,
        timestamp: Date.now(),
      });

      await act(async () => {
        rerender({
          profile,
          lastButtonEvent: buttonEvent,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
        // Wait for async action execution
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should execute the action
      expect(mockExecute).toHaveBeenCalledWith(testAction);
    });

    it('should not re-process the same button event', async () => {
      const testAction = {
        id: 'action-1',
        type: 'keyboard' as const,
        name: 'Test Keyboard',
        enabled: true,
        keys: 'a',
      };

      const profile = createProfile({
        workspaces: [{
          id: 'workspace-1',
          name: 'Workspace 1',
          buttons: [{
            index: 0,
            action: testAction,
          }],
          encoders: [],
        }],
      });

      const timestamp = Date.now();
      const buttonEvent = createButtonEvent({
        buttonIndex: 0,
        buttonType: ButtonType.LCD,
        timestamp,
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile,
            lastButtonEvent: buttonEvent,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Wait for first execution
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Rerender with the same event
      await act(async () => {
        rerender({
          profile,
          lastButtonEvent: buttonEvent,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should only execute once
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('encoder event handling', () => {
    it('should execute action for encoder rotation', async () => {
      const cwAction = {
        id: 'action-cw',
        type: 'media' as const,
        name: 'Volume Up',
        enabled: true,
        action: 'volume_up' as const,
      };

      const profile = createProfile({
        workspaces: [{
          id: 'workspace-1',
          name: 'Workspace 1',
          buttons: [],
          encoders: [{
            index: 0,
            clockwiseAction: cwAction,
          }],
        }],
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile,
            lastButtonEvent: null,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Wait for bindings to load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Trigger encoder rotation
      const encoderEvent = createEncoderEvent({
        type: EncoderEventType.ROTATE_CW,
        encoderIndex: 0,
        timestamp: Date.now(),
      });

      await act(async () => {
        rerender({
          profile,
          lastButtonEvent: null,
          lastEncoderEvent: encoderEvent,
          isShiftActive: false,
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should execute the action
      expect(mockExecute).toHaveBeenCalledWith(cwAction);
    });
  });

  describe('binding updates', () => {
    it('should update bindings when profile changes', async () => {
      const profile1 = createProfile({
        id: 'profile-1',
        name: 'Profile 1',
        workspaces: [{
          id: 'workspace-1',
          name: 'Workspace 1',
          buttons: [{
            index: 0,
            action: {
              id: 'action-1',
              type: 'keyboard' as const,
              name: 'Action 1',
              enabled: true,
              keys: 'a',
            },
          }],
          encoders: [],
        }],
      });

      const profile2 = createProfile({
        id: 'profile-2',
        name: 'Profile 2',
        workspaces: [{
          id: 'workspace-2',
          name: 'Workspace 2',
          buttons: [{
            index: 0,
            action: {
              id: 'action-2',
              type: 'keyboard' as const,
              name: 'Action 2',
              enabled: true,
              keys: 'b',
            },
          }],
          encoders: [],
        }],
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile: profile1,
            lastButtonEvent: null,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Wait for bindings to load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Switch to profile 2
      await act(async () => {
        rerender({
          profile: profile2,
          lastButtonEvent: null,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Trigger button press
      const buttonEvent = createButtonEvent({
        buttonIndex: 0,
        buttonType: ButtonType.LCD,
        timestamp: Date.now(),
      });

      await act(async () => {
        rerender({
          profile: profile2,
          lastButtonEvent: buttonEvent,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should execute action from profile 2
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'action-2',
          keys: 'b',
        })
      );
    });

    it('should update bindings when workspace changes', async () => {
      const profile = createProfile({
        workspaces: [
          {
            id: 'workspace-1',
            name: 'Workspace 1',
            buttons: [{
              index: 0,
              action: {
                id: 'action-ws1',
                type: 'keyboard' as const,
                name: 'WS1 Action',
                enabled: true,
                keys: 'w',
              },
            }],
            encoders: [],
          },
          {
            id: 'workspace-2',
            name: 'Workspace 2',
            buttons: [{
              index: 0,
              action: {
                id: 'action-ws2',
                type: 'keyboard' as const,
                name: 'WS2 Action',
                enabled: true,
                keys: 'x',
              },
            }],
            encoders: [],
          },
        ],
        activeWorkspaceIndex: 0,
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile,
            lastButtonEvent: null,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Wait for bindings to load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Switch to workspace 2
      const updatedProfile = {
        ...profile,
        activeWorkspaceIndex: 1,
        updatedAt: new Date().toISOString(),
      };

      await act(async () => {
        rerender({
          profile: updatedProfile,
          lastButtonEvent: null,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Trigger button press
      const buttonEvent = createButtonEvent({
        buttonIndex: 0,
        buttonType: ButtonType.LCD,
        timestamp: Date.now(),
      });

      await act(async () => {
        rerender({
          profile: updatedProfile,
          lastButtonEvent: buttonEvent,
          lastEncoderEvent: null,
          isShiftActive: false,
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should execute action from workspace 2
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'action-ws2',
          keys: 'x',
        })
      );
    });
  });

  describe('shift modifier', () => {
    it('should pass shift state to button events', async () => {
      const regularAction = {
        id: 'action-regular',
        type: 'keyboard' as const,
        name: 'Regular',
        enabled: true,
        keys: 'a',
      };

      const shiftAction = {
        id: 'action-shift',
        type: 'keyboard' as const,
        name: 'Shift',
        enabled: true,
        keys: 'A',
      };

      const profile = createProfile({
        workspaces: [{
          id: 'workspace-1',
          name: 'Workspace 1',
          buttons: [{
            index: 0,
            action: regularAction,
            shiftAction: shiftAction,
          }],
          encoders: [],
        }],
      });

      const { rerender } = renderHook(
        (props) => useActionBinding(props),
        {
          initialProps: {
            profile,
            lastButtonEvent: null,
            lastEncoderEvent: null,
            isShiftActive: false,
          },
        }
      );

      // Wait for bindings to load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Trigger button press with shift active
      // Shift state now comes from the event itself (set by Rust backend)
      const buttonEvent = createButtonEvent({
        buttonIndex: 0,
        buttonType: ButtonType.LCD,
        timestamp: Date.now(),
        isShiftActive: true,  // Shift state is included in the event from Rust
      });

      await act(async () => {
        rerender({
          profile,
          lastButtonEvent: buttonEvent,
          lastEncoderEvent: null,
          isShiftActive: false,  // React state is no longer used for this
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Should execute the shift action
      expect(mockExecute).toHaveBeenCalledWith(shiftAction);
    });
  });
});
