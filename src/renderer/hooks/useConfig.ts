/**
 * useConfig Hook
 * React hook for app configuration management
 */

import { useState, useEffect, useCallback } from 'react';
import type { AppConfig, DeviceSettings, AppSettings, IntegrationSettings } from '../../shared/types/config';
import type { ConfigChangeEvent } from '../../shared/types/ipc';

export interface UseConfigReturn {
  /** Full app configuration */
  config: AppConfig | null;
  /** Device settings */
  deviceSettings: DeviceSettings | null;
  /** App settings */
  appSettings: AppSettings | null;
  /** Integration settings */
  integrations: IntegrationSettings | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Update device settings */
  setDeviceSettings: (settings: DeviceSettings) => Promise<void>;
  /** Update app settings */
  setAppSettings: (settings: AppSettings) => Promise<void>;
  /** Update integration settings */
  setIntegrations: (settings: IntegrationSettings) => Promise<void>;
  /** Reset configuration to defaults */
  reset: () => Promise<void>;
  /** Reload configuration */
  reload: () => Promise<void>;
}

/**
 * Hook for managing app configuration
 */
export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load configuration
  const loadConfig = useCallback(async () => {
    if (!window.electronAPI?.config) {
      setError('Config API not available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const fullConfig = await window.electronAPI.config.get();
      setConfig(fullConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Subscribe to config changes
  useEffect(() => {
    if (!window.electronAPI?.config) {
      return;
    }

    const unsubscribe = window.electronAPI.config.onChanged((event: ConfigChangeEvent) => {
      // Reload config on any change
      loadConfig();
    });

    return unsubscribe;
  }, [loadConfig]);

  const setDeviceSettings = useCallback(async (settings: DeviceSettings) => {
    if (!window.electronAPI?.config) {
      setError('Config API not available');
      return;
    }

    try {
      setError(null);
      await window.electronAPI.config.setDeviceSettings(settings);
      // Config will be updated by the change event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update device settings');
    }
  }, []);

  const setAppSettings = useCallback(async (settings: AppSettings) => {
    if (!window.electronAPI?.config) {
      setError('Config API not available');
      return;
    }

    try {
      setError(null);
      await window.electronAPI.config.setAppSettings(settings);
      // Config will be updated by the change event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update app settings');
    }
  }, []);

  const setIntegrations = useCallback(async (settings: IntegrationSettings) => {
    if (!window.electronAPI?.config) {
      setError('Config API not available');
      return;
    }

    try {
      setError(null);
      await window.electronAPI.config.setIntegrations(settings);
      // Config will be updated by the change event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update integration settings');
    }
  }, []);

  const reset = useCallback(async () => {
    if (!window.electronAPI?.config) {
      setError('Config API not available');
      return;
    }

    try {
      setError(null);
      await window.electronAPI.config.reset();
      // Config will be updated by the change event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configuration');
    }
  }, []);

  return {
    config,
    deviceSettings: config?.deviceSettings ?? null,
    appSettings: config?.appSettings ?? null,
    integrations: config?.integrations ?? null,
    isLoading,
    error,
    setDeviceSettings,
    setAppSettings,
    setIntegrations,
    reset,
    reload: loadConfig,
  };
}

export default useConfig;
