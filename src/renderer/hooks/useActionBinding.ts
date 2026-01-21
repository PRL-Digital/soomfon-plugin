/**
 * useActionBinding Hook
 * Bridges device events to action execution by connecting EventBinder to the running app.
 *
 * This hook is the missing link between:
 * 1. Device events (button presses, encoder rotations) from useDevice
 * 2. Action execution via the Tauri backend
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Profile } from '@shared/types/config';
import type { ButtonEvent, EncoderEvent } from '@shared/types/device';
import type { Action, ActionBinding, ActionExecutionResult, ActionHandler, ActionType, ButtonTrigger, EncoderTrigger } from '@shared/types/actions';
import { getActiveWorkspace } from '@shared/types/config';
import {
  SHIFT_BUTTON_INDEX,
  WORKSPACE_PREV_BUTTON_INDEX,
  WORKSPACE_NEXT_BUTTON_INDEX,
  LCD_BUTTON_COUNT,
} from '@shared/types/device';
import { EventBinder } from '../../core/actions/event-binder';
import { ActionEngine } from '../../core/actions/action-engine';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('ACTION-BINDING');

export interface UseActionBindingOptions {
  /** Current active profile */
  profile: Profile | null;
  /** Latest button event from device */
  lastButtonEvent: ButtonEvent | null;
  /** Latest encoder event from device */
  lastEncoderEvent: EncoderEvent | null;
  /** Whether shift button is currently held */
  isShiftActive: boolean;
}

/**
 * Create an ActionHandler that delegates execution to the Tauri backend
 */
function createTauriActionHandler(actionType: ActionType): ActionHandler {
  return {
    actionType,
    async execute(action: Action): Promise<ActionExecutionResult> {
      const startTime = Date.now();

      try {
        // Check if action is enabled
        if (action.enabled === false) {
          return {
            status: 'cancelled',
            actionId: action.id,
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime,
            error: 'Action is disabled',
          };
        }

        // Execute via Tauri API
        if (!window.tauriAPI?.action?.execute) {
          throw new Error('Action API not available');
        }

        const result = await window.tauriAPI.action.execute(action);
        return result;
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
    },
  };
}

/**
 * Create an ActionEngine with handlers that delegate to the Tauri backend
 */
function createTauriActionEngine(): ActionEngine {
  const engine = new ActionEngine();

  // Register handlers for all action types - they all delegate to Tauri
  const actionTypes: ActionType[] = [
    'keyboard',
    'launch',
    'script',
    'http',
    'media',
    'system',
    'profile',
    'workspace',
    'text',
    'home_assistant',
    'node_red',
  ];

  for (const actionType of actionTypes) {
    engine.registerHandler(createTauriActionHandler(actionType));
  }

  return engine;
}

/**
 * Extract action bindings from a profile's active workspace
 */
function extractBindingsFromProfile(profile: Profile): ActionBinding[] {
  const bindings: ActionBinding[] = [];
  const workspace = getActiveWorkspace(profile);
  let bindingId = 0;

  // Extract bindings from buttons
  for (const button of workspace.buttons) {
    // LCD buttons (0-5) are elementType 'lcdButton'
    // Normal buttons (6-8) are elementType 'normalButton' with adjusted index
    const isLcdButton = button.index < LCD_BUTTON_COUNT;
    const elementType = isLcdButton ? 'lcdButton' : 'normalButton';
    const elementIndex = isLcdButton ? button.index : button.index - LCD_BUTTON_COUNT;

    // Map button config actions to bindings
    const buttonTriggerMap: Array<{ field: keyof typeof button; trigger: ButtonTrigger }> = [
      { field: 'action', trigger: 'press' },
      { field: 'longPressAction', trigger: 'longPress' },
      { field: 'shiftAction', trigger: 'shiftPress' },
      { field: 'shiftLongPressAction', trigger: 'shiftLongPress' },
    ];

    for (const { field, trigger } of buttonTriggerMap) {
      const action = button[field] as Action | undefined;
      if (action) {
        bindings.push({
          id: `binding-${++bindingId}`,
          elementType,
          elementIndex,
          trigger,
          action,
        });
      }
    }
  }

  // Extract bindings from encoders
  for (const encoder of workspace.encoders) {
    const encoderTriggerMap: Array<{ field: keyof typeof encoder; trigger: EncoderTrigger }> = [
      { field: 'pressAction', trigger: 'press' },
      { field: 'longPressAction', trigger: 'longPress' },
      { field: 'clockwiseAction', trigger: 'rotateCW' },
      { field: 'counterClockwiseAction', trigger: 'rotateCCW' },
      { field: 'shiftPressAction', trigger: 'shiftPress' },
      { field: 'shiftLongPressAction', trigger: 'shiftLongPress' },
      { field: 'shiftClockwiseAction', trigger: 'shiftRotateCW' },
      { field: 'shiftCounterClockwiseAction', trigger: 'shiftRotateCCW' },
    ];

    for (const { field, trigger } of encoderTriggerMap) {
      const action = encoder[field] as Action | undefined;
      if (action) {
        bindings.push({
          id: `binding-${++bindingId}`,
          elementType: 'encoder',
          elementIndex: encoder.index,
          trigger,
          action,
        });
      }
    }
  }

  return bindings;
}

/**
 * Hook that bridges device events to action execution
 *
 * This hook:
 * 1. Creates and manages an EventBinder instance
 * 2. Loads action bindings from the active workspace when profile changes
 * 3. Calls EventBinder.handleButtonEvent() when button events arrive
 * 4. Calls EventBinder.handleEncoderEvent() when encoder events arrive
 */
export function useActionBinding(options: UseActionBindingOptions): void {
  const { profile, lastButtonEvent, lastEncoderEvent, isShiftActive } = options;

  // Refs to hold the EventBinder and ActionEngine instances
  const actionEngineRef = useRef<ActionEngine | null>(null);
  const eventBinderRef = useRef<EventBinder | null>(null);

  // Track the last processed events to avoid re-processing
  const lastProcessedButtonEventRef = useRef<ButtonEvent | null>(null);
  const lastProcessedEncoderEventRef = useRef<EncoderEvent | null>(null);

  // Track the current profile/workspace for binding updates
  const currentBindingKeyRef = useRef<string>('');

  // Initialize ActionEngine and EventBinder on mount
  useEffect(() => {
    const engine = createTauriActionEngine();
    const binder = new EventBinder(engine);

    // Set up event listeners for debugging
    binder.on('binding:matched', (binding, event) => {
      log.debug('Binding matched:', binding.id, 'for event:', event);
    });

    binder.on('binding:executed', (binding, result) => {
      log.debug('Binding executed:', binding.id, 'result:', result.status);
    });

    binder.on('binding:error', (binding, error) => {
      log.error('Binding execution error:', binding.id, error.message);
    });

    binder.on('binding:notFound', (event) => {
      log.debug('No binding found for event:', event);
    });

    actionEngineRef.current = engine;
    eventBinderRef.current = binder;

    log.info('Action binding system initialized');

    return () => {
      eventBinderRef.current?.clearBindings();
      actionEngineRef.current = null;
      eventBinderRef.current = null;
      log.info('Action binding system cleaned up');
    };
  }, []);

  // Update bindings when profile or active workspace changes
  useEffect(() => {
    if (!profile || !eventBinderRef.current) {
      return;
    }

    // Create a key to detect profile/workspace changes
    const bindingKey = `${profile.id}:${profile.activeWorkspaceIndex || 0}:${profile.updatedAt}`;
    if (bindingKey === currentBindingKeyRef.current) {
      return; // No change
    }
    currentBindingKeyRef.current = bindingKey;

    // Extract and load bindings
    const bindings = extractBindingsFromProfile(profile);
    eventBinderRef.current.loadBindings(bindings);

    log.info(`Loaded ${bindings.length} bindings for profile "${profile.name}" workspace ${(profile.activeWorkspaceIndex || 0) + 1}`);
  }, [profile, profile?.activeWorkspaceIndex, profile?.updatedAt]);

  // Handle button events
  const handleButtonEvent = useCallback(async (event: ButtonEvent) => {
    if (!eventBinderRef.current) {
      return;
    }

    // Skip special buttons:
    // - Shift button (6): modifier only, no action to execute
    // - Workspace nav buttons (7, 8): handled in App.tsx
    if (
      event.buttonIndex === SHIFT_BUTTON_INDEX ||
      event.buttonIndex === WORKSPACE_PREV_BUTTON_INDEX ||
      event.buttonIndex === WORKSPACE_NEXT_BUTTON_INDEX
    ) {
      return;
    }

    try {
      const result = await eventBinderRef.current.handleButtonEvent(event);
      if (result) {
        log.debug('Button action executed:', result.status, result.actionId);
      }
    } catch (error) {
      log.error('Error handling button event:', error);
    }
  }, []);

  // Handle encoder events
  const handleEncoderEvent = useCallback(async (event: EncoderEvent) => {
    if (!eventBinderRef.current) {
      return;
    }

    try {
      const result = await eventBinderRef.current.handleEncoderEvent(event);
      if (result) {
        log.debug('Encoder action executed:', result.status, result.actionId);
      }
    } catch (error) {
      log.error('Error handling encoder event:', error);
    }
  }, []);

  // Process button events when they arrive
  useEffect(() => {
    if (!lastButtonEvent) {
      return;
    }

    // Check if this is a new event (different from last processed)
    if (
      lastProcessedButtonEventRef.current &&
      lastProcessedButtonEventRef.current.timestamp === lastButtonEvent.timestamp &&
      lastProcessedButtonEventRef.current.buttonIndex === lastButtonEvent.buttonIndex &&
      lastProcessedButtonEventRef.current.type === lastButtonEvent.type
    ) {
      return; // Already processed
    }

    lastProcessedButtonEventRef.current = lastButtonEvent;

    // Use the event's isShiftActive directly from Rust - don't overwrite
    // Rust tracks shift state in the polling thread and includes it in the event payload
    handleButtonEvent(lastButtonEvent);
  }, [lastButtonEvent, handleButtonEvent]);

  // Process encoder events when they arrive
  useEffect(() => {
    if (!lastEncoderEvent) {
      return;
    }

    // Check if this is a new event (different from last processed)
    if (
      lastProcessedEncoderEventRef.current &&
      lastProcessedEncoderEventRef.current.timestamp === lastEncoderEvent.timestamp &&
      lastProcessedEncoderEventRef.current.encoderIndex === lastEncoderEvent.encoderIndex &&
      lastProcessedEncoderEventRef.current.type === lastEncoderEvent.type
    ) {
      return; // Already processed
    }

    lastProcessedEncoderEventRef.current = lastEncoderEvent;

    // Use the event's isShiftActive directly from Rust - don't overwrite
    // Rust tracks shift state in the polling thread and includes it in the event payload
    handleEncoderEvent(lastEncoderEvent);
  }, [lastEncoderEvent, handleEncoderEvent]);
}

export default useActionBinding;
