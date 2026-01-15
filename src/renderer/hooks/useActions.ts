/**
 * useActions Hook
 * React hook for action execution
 */

import { useState, useCallback } from 'react';
import type { Action, ActionExecutionResult } from '../../shared/types/actions';

export interface UseActionsReturn {
  /** Whether an action is currently executing */
  isExecuting: boolean;
  /** Last execution result */
  lastResult: ActionExecutionResult | null;
  /** Error message if any */
  error: string | null;
  /** Execute an action */
  execute: (action: Action) => Promise<ActionExecutionResult | null>;
  /** Clear last result and error */
  clear: () => void;
}

/**
 * Hook for executing actions
 */
export function useActions(): UseActionsReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ActionExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (action: Action): Promise<ActionExecutionResult | null> => {
    if (!window.electronAPI?.action) {
      setError('Action API not available');
      return null;
    }

    try {
      setIsExecuting(true);
      setError(null);
      const result = await window.electronAPI.action.execute(action);
      setLastResult(result);

      if (result.status === 'failure') {
        setError(result.error || 'Action execution failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action';
      setError(errorMessage);
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const clear = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  return {
    isExecuting,
    lastResult,
    error,
    execute,
    clear,
  };
}

export default useActions;
