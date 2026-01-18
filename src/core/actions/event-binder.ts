/**
 * Event Binder
 * Maps device events (button presses, encoder rotations) to configured actions
 */

import { EventEmitter } from 'events';
import {
  ActionBinding,
  ElementType,
  ButtonTrigger,
  EncoderTrigger,
  ActionExecutionResult,
} from '../../shared/types/actions';
import {
  ButtonEvent,
  ButtonEventType,
  EncoderEvent,
  EncoderEventType,
  ButtonType,
  LCD_BUTTON_COUNT,
} from '../../shared/types/device';
import { ActionEngine } from './action-engine';

/** Events emitted by EventBinder */
export interface EventBinderEvents {
  'binding:matched': (binding: ActionBinding, event: ButtonEvent | EncoderEvent) => void;
  'binding:executed': (binding: ActionBinding, result: ActionExecutionResult) => void;
  'binding:error': (binding: ActionBinding, error: Error) => void;
  'binding:notFound': (event: ButtonEvent | EncoderEvent) => void;
}

/** Binding key for lookup */
type BindingKey = `${ElementType}:${number}:${string}`;

/**
 * Create a binding lookup key from element properties
 */
function createBindingKey(
  elementType: ElementType,
  elementIndex: number,
  trigger: ButtonTrigger | EncoderTrigger
): BindingKey {
  return `${elementType}:${elementIndex}:${trigger}`;
}

/**
 * Map ButtonEventType to ButtonTrigger
 * When isShiftActive is true, returns shift-prefixed triggers for press/longPress
 */
function mapButtonEventToTrigger(eventType: ButtonEventType, isShiftActive: boolean = false): ButtonTrigger {
  switch (eventType) {
    case ButtonEventType.PRESS:
      return isShiftActive ? 'shiftPress' : 'press';
    case ButtonEventType.RELEASE:
      return 'release'; // Release doesn't have a shift variant
    case ButtonEventType.LONG_PRESS:
      return isShiftActive ? 'shiftLongPress' : 'longPress';
  }
}

/**
 * Map EncoderEventType to EncoderTrigger
 * When isShiftActive is true, returns shift-prefixed triggers for rotation and press events
 */
function mapEncoderEventToTrigger(eventType: EncoderEventType, isShiftActive: boolean = false): EncoderTrigger {
  switch (eventType) {
    case EncoderEventType.ROTATE_CW:
      return isShiftActive ? 'shiftRotateCW' : 'rotateCW';
    case EncoderEventType.ROTATE_CCW:
      return isShiftActive ? 'shiftRotateCCW' : 'rotateCCW';
    case EncoderEventType.PRESS:
      return isShiftActive ? 'shiftPress' : 'press';
    case EncoderEventType.RELEASE:
      return 'release'; // Release doesn't have a shift variant
    case EncoderEventType.LONG_PRESS:
      return isShiftActive ? 'shiftLongPress' : 'longPress';
  }
}

/**
 * Map ButtonType to ElementType
 */
function mapButtonTypeToElement(buttonType: ButtonType): ElementType {
  return buttonType === ButtonType.LCD ? 'lcdButton' : 'normalButton';
}

/**
 * EventBinder - Maps device events to configured actions
 *
 * Provides:
 * - Binding configuration by element type, index, and trigger
 * - Support for button press, release, and long-press triggers
 * - Support for encoder CW, CCW, press, and release triggers
 * - Integration with ActionEngine for execution
 * - Event handling for device events
 */
export class EventBinder extends EventEmitter {
  private bindings: Map<string, ActionBinding> = new Map();
  private bindingsById: Map<string, ActionBinding> = new Map();
  private actionEngine: ActionEngine;

  constructor(actionEngine: ActionEngine) {
    super();
    this.actionEngine = actionEngine;
  }

  /**
   * Add a binding
   * @param binding The binding configuration
   */
  addBinding(binding: ActionBinding): void {
    const key = createBindingKey(binding.elementType, binding.elementIndex, binding.trigger);
    this.bindings.set(key, binding);
    this.bindingsById.set(binding.id, binding);
  }

  /**
   * Remove a binding by ID
   * @param bindingId The binding ID to remove
   * @returns true if binding was removed
   */
  removeBinding(bindingId: string): boolean {
    const binding = this.bindingsById.get(bindingId);
    if (!binding) {
      return false;
    }

    const key = createBindingKey(binding.elementType, binding.elementIndex, binding.trigger);
    this.bindings.delete(key);
    this.bindingsById.delete(bindingId);
    return true;
  }

  /**
   * Get a binding by ID
   */
  getBinding(bindingId: string): ActionBinding | undefined {
    return this.bindingsById.get(bindingId);
  }

  /**
   * Get a binding for a specific element and trigger
   */
  getBindingForElement(
    elementType: ElementType,
    elementIndex: number,
    trigger: ButtonTrigger | EncoderTrigger
  ): ActionBinding | undefined {
    const key = createBindingKey(elementType, elementIndex, trigger);
    return this.bindings.get(key);
  }

  /**
   * Get all bindings
   */
  getAllBindings(): ActionBinding[] {
    return Array.from(this.bindingsById.values());
  }

  /**
   * Get all bindings for an element (all triggers)
   */
  getBindingsForElement(
    elementType: ElementType,
    elementIndex: number
  ): ActionBinding[] {
    return this.getAllBindings().filter(
      (b) => b.elementType === elementType && b.elementIndex === elementIndex
    );
  }

  /**
   * Clear all bindings
   */
  clearBindings(): void {
    this.bindings.clear();
    this.bindingsById.clear();
  }

  /**
   * Load bindings from an array
   * @param bindings Array of binding configurations
   */
  loadBindings(bindings: ActionBinding[]): void {
    this.clearBindings();
    for (const binding of bindings) {
      this.addBinding(binding);
    }
  }

  /**
   * Handle a button event
   * Finds matching binding and executes the action
   * If shift is active, looks for shift trigger first, then falls back to normal trigger
   */
  async handleButtonEvent(event: ButtonEvent): Promise<ActionExecutionResult | null> {
    const elementType = mapButtonTypeToElement(event.buttonType);
    const isShiftActive = event.isShiftActive || false;
    const trigger = mapButtonEventToTrigger(event.type, isShiftActive);

    // For normal buttons, adjust index to be 0-based within normal button range
    let elementIndex = event.buttonIndex;
    if (elementType === 'normalButton') {
      elementIndex = event.buttonIndex - LCD_BUTTON_COUNT;
    }

    // Try shift trigger first if shift is active
    let result = await this.executeBindingForElement(elementType, elementIndex, trigger, event);

    // If shift is active but no shift binding found, fall back to normal trigger
    if (result === null && isShiftActive && event.type !== ButtonEventType.RELEASE) {
      const normalTrigger = mapButtonEventToTrigger(event.type, false);
      result = await this.executeBindingForElement(elementType, elementIndex, normalTrigger, event);
    }

    return result;
  }

  /**
   * Handle an encoder event
   * Finds matching binding and executes the action
   * If shift is active, looks for shift trigger first, then falls back to normal trigger
   */
  async handleEncoderEvent(event: EncoderEvent): Promise<ActionExecutionResult | null> {
    const isShiftActive = event.isShiftActive || false;
    const trigger = mapEncoderEventToTrigger(event.type, isShiftActive);

    // Try shift trigger first if shift is active
    let result = await this.executeBindingForElement('encoder', event.encoderIndex, trigger, event);

    // If shift is active but no shift binding found, fall back to normal trigger
    if (result === null && isShiftActive && event.type !== EncoderEventType.RELEASE) {
      const normalTrigger = mapEncoderEventToTrigger(event.type, false);
      result = await this.executeBindingForElement('encoder', event.encoderIndex, normalTrigger, event);
    }

    return result;
  }

  /**
   * Handle any device event (button or encoder)
   * Determines event type and routes to appropriate handler
   */
  async handleEvent(event: ButtonEvent | EncoderEvent): Promise<ActionExecutionResult | null> {
    if ('buttonType' in event) {
      return this.handleButtonEvent(event as ButtonEvent);
    } else {
      return this.handleEncoderEvent(event as EncoderEvent);
    }
  }

  /**
   * Execute a binding for a specific element
   */
  private async executeBindingForElement(
    elementType: ElementType,
    elementIndex: number,
    trigger: ButtonTrigger | EncoderTrigger,
    event: ButtonEvent | EncoderEvent
  ): Promise<ActionExecutionResult | null> {
    const binding = this.getBindingForElement(elementType, elementIndex, trigger);

    if (!binding) {
      this.emit('binding:notFound', event);
      return null;
    }

    this.emit('binding:matched', binding, event);

    try {
      const result = await this.actionEngine.execute(binding.action);
      this.emit('binding:executed', binding, result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('binding:error', binding, err);
      throw err;
    }
  }

  /**
   * Get the action engine instance
   */
  getActionEngine(): ActionEngine {
    return this.actionEngine;
  }

  /**
   * Type-safe event emitter methods
   */
  override on<K extends keyof EventBinderEvents>(
    event: K,
    listener: EventBinderEvents[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof EventBinderEvents>(
    event: K,
    ...args: Parameters<EventBinderEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

/**
 * Create a new EventBinder instance
 * @param actionEngine The action engine to use for execution
 */
export function createEventBinder(actionEngine: ActionEngine): EventBinder {
  return new EventBinder(actionEngine);
}

/**
 * Helper to create an action binding
 */
export function createBinding(
  id: string,
  elementType: ElementType,
  elementIndex: number,
  trigger: ButtonTrigger | EncoderTrigger,
  action: ActionBinding['action']
): ActionBinding {
  return {
    id,
    elementType,
    elementIndex,
    trigger,
    action,
  };
}
