/**
 * Action Engine
 * Core action execution engine with handler registry pattern
 */

import { EventEmitter } from 'events';
import {
  Action,
  ActionType,
  ActionHandler,
  ActionExecutionResult,
  ExecutionStatus,
} from '../../shared/types/actions';

/** Execution history entry with additional metadata */
export interface ExecutionHistoryEntry extends ActionExecutionResult {
  /** The action that was executed */
  action: Action;
}

/** Action engine configuration */
export interface ActionEngineConfig {
  /** Maximum number of history entries to keep */
  maxHistorySize: number;
  /** Default timeout for actions in milliseconds */
  defaultTimeout: number;
}

/** Default configuration */
const DEFAULT_CONFIG: ActionEngineConfig = {
  maxHistorySize: 100,
  defaultTimeout: 30000,
};

/** Events emitted by the action engine */
export interface ActionEngineEvents {
  'execution:start': (action: Action) => void;
  'execution:complete': (result: ExecutionHistoryEntry) => void;
  'execution:error': (action: Action, error: Error) => void;
  'execution:cancelled': (action: Action) => void;
  'handler:registered': (actionType: ActionType) => void;
  'handler:unregistered': (actionType: ActionType) => void;
}

/**
 * ActionEngine - Core action execution engine
 *
 * Provides:
 * - Handler registry pattern for routing actions to handlers
 * - Async execution with proper error handling
 * - Cancellation support for long-running actions
 * - Execution history tracking
 */
export class ActionEngine extends EventEmitter {
  private handlers: Map<ActionType, ActionHandler> = new Map();
  private executionHistory: ExecutionHistoryEntry[] = [];
  private currentExecution: { action: Action; handler: ActionHandler } | null = null;
  private abortController: AbortController | null = null;
  private config: ActionEngineConfig;

  constructor(config: Partial<ActionEngineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a handler for an action type
   * @param handler The handler to register
   * @throws Error if a handler is already registered for the action type
   */
  registerHandler<T extends Action>(handler: ActionHandler<T>): void {
    if (this.handlers.has(handler.actionType)) {
      throw new Error(`Handler already registered for action type: ${handler.actionType}`);
    }
    this.handlers.set(handler.actionType, handler as ActionHandler);
    this.emit('handler:registered', handler.actionType);
  }

  /**
   * Unregister a handler for an action type
   * @param actionType The action type to unregister
   * @returns true if handler was removed, false if not found
   */
  unregisterHandler(actionType: ActionType): boolean {
    const removed = this.handlers.delete(actionType);
    if (removed) {
      this.emit('handler:unregistered', actionType);
    }
    return removed;
  }

  /**
   * Check if a handler is registered for an action type
   * @param actionType The action type to check
   */
  hasHandler(actionType: ActionType): boolean {
    return this.handlers.has(actionType);
  }

  /**
   * Get all registered action types
   */
  getRegisteredTypes(): ActionType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Execute an action
   * @param action The action to execute
   * @returns The execution result
   */
  async execute(action: Action): Promise<ActionExecutionResult> {
    // Check if action is enabled
    if (!action.enabled) {
      return this.createResult(action, 'cancelled', undefined, 'Action is disabled');
    }

    // Get the handler for this action type
    const handler = this.handlers.get(action.type);
    if (!handler) {
      return this.createResult(
        action,
        'failure',
        undefined,
        `No handler registered for action type: ${action.type}`
      );
    }

    // Set up execution tracking
    this.currentExecution = { action, handler };
    this.abortController = new AbortController();
    const startTime = Date.now();

    this.emit('execution:start', action);

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(handler, action);

      // Add to history
      const historyEntry = this.addToHistory(action, result);
      this.emit('execution:complete', historyEntry);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if this was a cancellation
      if (this.abortController?.signal.aborted) {
        const result = this.createResult(action, 'cancelled', startTime, 'Action was cancelled');
        this.addToHistory(action, result);
        this.emit('execution:cancelled', action);
        return result;
      }

      // Regular error
      const result = this.createResult(action, 'failure', startTime, errorMessage);
      this.addToHistory(action, result);
      this.emit('execution:error', action, error instanceof Error ? error : new Error(errorMessage));
      return result;
    } finally {
      this.currentExecution = null;
      this.abortController = null;
    }
  }

  /**
   * Execute an action with timeout
   */
  private async executeWithTimeout(
    handler: ActionHandler,
    action: Action
  ): Promise<ActionExecutionResult> {
    const timeout = this.getActionTimeout(action);

    return new Promise<ActionExecutionResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Action execution timed out after ${timeout}ms`));
      }, timeout);

      // Listen for abort signal
      const abortListener = () => {
        clearTimeout(timeoutId);
        reject(new Error('Action was cancelled'));
      };
      this.abortController?.signal.addEventListener('abort', abortListener);

      handler
        .execute(action)
        .then((result) => {
          clearTimeout(timeoutId);
          this.abortController?.signal.removeEventListener('abort', abortListener);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          this.abortController?.signal.removeEventListener('abort', abortListener);
          reject(error);
        });
    });
  }

  /**
   * Get the timeout for an action
   */
  private getActionTimeout(action: Action): number {
    // Some action types have their own timeout property
    if ('timeout' in action && typeof action.timeout === 'number') {
      return action.timeout;
    }
    return this.config.defaultTimeout;
  }

  /**
   * Cancel the currently executing action
   */
  async cancel(): Promise<void> {
    if (!this.currentExecution) {
      return;
    }

    // Signal abort
    this.abortController?.abort();

    // Call handler's cancel method if available
    const { handler } = this.currentExecution;
    if (handler.cancel) {
      await handler.cancel();
    }
  }

  /**
   * Check if an action is currently executing
   */
  isExecuting(): boolean {
    return this.currentExecution !== null;
  }

  /**
   * Get the currently executing action
   */
  getCurrentAction(): Action | null {
    return this.currentExecution?.action ?? null;
  }

  /**
   * Get execution history
   * @param limit Maximum number of entries to return
   */
  getHistory(limit?: number): ExecutionHistoryEntry[] {
    if (limit === undefined || limit >= this.executionHistory.length) {
      return [...this.executionHistory];
    }
    return this.executionHistory.slice(-limit);
  }

  /**
   * Get history for a specific action
   * @param actionId The action ID to filter by
   */
  getHistoryByActionId(actionId: string): ExecutionHistoryEntry[] {
    return this.executionHistory.filter((entry) => entry.actionId === actionId);
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Create an execution result
   */
  private createResult(
    action: Action,
    status: ExecutionStatus,
    startTime?: number,
    error?: string,
    data?: unknown
  ): ActionExecutionResult {
    const start = startTime ?? Date.now();
    const end = Date.now();
    return {
      status,
      actionId: action.id,
      startTime: start,
      endTime: end,
      duration: end - start,
      error,
      data,
    };
  }

  /**
   * Add an entry to the execution history
   */
  private addToHistory(
    action: Action,
    result: ActionExecutionResult
  ): ExecutionHistoryEntry {
    const entry: ExecutionHistoryEntry = {
      ...result,
      action,
    };

    this.executionHistory.push(entry);

    // Trim history if needed
    if (this.executionHistory.length > this.config.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.config.maxHistorySize);
    }

    return entry;
  }

  /**
   * Get statistics about execution history
   */
  getStats(): {
    total: number;
    success: number;
    failure: number;
    cancelled: number;
    averageDuration: number;
  } {
    const stats = {
      total: this.executionHistory.length,
      success: 0,
      failure: 0,
      cancelled: 0,
      averageDuration: 0,
    };

    if (stats.total === 0) {
      return stats;
    }

    let totalDuration = 0;
    for (const entry of this.executionHistory) {
      totalDuration += entry.duration;
      switch (entry.status) {
        case 'success':
          stats.success++;
          break;
        case 'failure':
          stats.failure++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    }

    stats.averageDuration = totalDuration / stats.total;
    return stats;
  }
}
