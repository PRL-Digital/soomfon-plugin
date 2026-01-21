/**
 * useIpc Hook
 * Low-level hook for direct IPC communication
 *
 * For most use cases, prefer the specialized hooks:
 * - useDevice() - for device connection and events
 * - useProfiles() - for profile management
 * - useConfig() - for app configuration
 * - useActions() - for action execution
 */

import { useCallback, useEffect, useRef } from 'react';
import type { InvokeChannel, ListenChannel } from '../../shared/types/ipc';

/**
 * Hook for making IPC invoke calls
 * @returns invoke function for type-safe IPC calls
 */
export function useIpc() {
  /**
   * Invoke an IPC channel
   */
  const invoke = useCallback(async <T>(channel: InvokeChannel, ...args: unknown[]): Promise<T> => {
    if (!window.tauriAPI) {
      throw new Error('Tauri API not available');
    }
    return window.tauriAPI.invoke<T>(channel, ...args);
  }, []);

  /**
   * Subscribe to an IPC channel
   * Returns unsubscribe function
   */
  const subscribe = useCallback((channel: ListenChannel, callback: (...args: unknown[]) => void): (() => void) => {
    if (!window.tauriAPI) {
      return () => {};
    }

    window.tauriAPI.on(channel, callback);

    return () => {
      window.tauriAPI.off(channel, callback);
    };
  }, []);

  return { invoke, subscribe };
}

/**
 * Hook for subscribing to IPC events with automatic cleanup
 * @param channel - The IPC channel to subscribe to
 * @param callback - Callback function to handle events
 */
export function useIpcSubscription<T>(
  channel: ListenChannel,
  callback: (data: T) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!window.tauriAPI) {
      return;
    }

    const handler = (...args: unknown[]) => {
      callbackRef.current(args[0] as T);
    };

    window.tauriAPI.on(channel, handler);

    return () => {
      window.tauriAPI.off(channel, handler);
    };
  }, [channel]);
}

export default useIpc;
