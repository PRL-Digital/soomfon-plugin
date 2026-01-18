/**
 * useDevice Hook
 * React hook for device connection status and events
 */

import { useState, useEffect, useCallback } from 'react';
import type { DeviceStatus } from '@shared/types/ipc';
import type { ButtonEvent, EncoderEvent, ButtonEventType } from '@shared/types/device';
import { ConnectionState, SHIFT_BUTTON_INDEX } from '@shared/types/device';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('RENDERER');

export interface UseDeviceReturn {
  /** Current device status */
  status: DeviceStatus;
  /** Whether device is connected */
  isConnected: boolean;
  /** Whether connecting is in progress */
  isConnecting: boolean;
  /** Error message if any */
  error: string | null;
  /** Connect to device */
  connect: () => Promise<void>;
  /** Disconnect from device */
  disconnect: () => Promise<void>;
  /** Set display brightness (0-100) */
  setBrightness: (brightness: number) => Promise<void>;
  /** Set button image */
  setButtonImage: (buttonIndex: number, imageData: string) => Promise<void>;
  /** Latest button event */
  lastButtonEvent: ButtonEvent | null;
  /** Latest encoder event */
  lastEncoderEvent: EncoderEvent | null;
  /** Whether shift button is currently held */
  isShiftActive: boolean;
}

const initialStatus: DeviceStatus = {
  connectionState: ConnectionState.DISCONNECTED,
  deviceInfo: null,
  isConnected: false,
};

/**
 * Hook for managing device connection and events
 */
export function useDevice(): UseDeviceReturn {
  const [status, setStatus] = useState<DeviceStatus>(initialStatus);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastButtonEvent, setLastButtonEvent] = useState<ButtonEvent | null>(null);
  const [lastEncoderEvent, setLastEncoderEvent] = useState<EncoderEvent | null>(null);
  const [isShiftActive, setIsShiftActive] = useState(false);

  // Fetch initial status and auto-connect
  useEffect(() => {
    const initializeDevice = async () => {
      try {
        if (!window.electronAPI?.device) return;

        // Get current status
        const deviceStatus = await window.electronAPI.device.getStatus();
        setStatus(deviceStatus);

        // Auto-connect if not already connected
        if (!deviceStatus.isConnected) {
          log.info('[RENDERER] Auto-connecting to device...');
          setIsConnecting(true);
          setStatus((prev) => ({
            ...prev,
            connectionState: ConnectionState.CONNECTING,
          }));
          try {
            await window.electronAPI.device.connect();
            // Status will be updated by the connected event
          } catch (connectErr) {
            log.warn('[RENDERER] Auto-connect failed:', connectErr);
            setIsConnecting(false);
            setStatus((prev) => ({
              ...prev,
              connectionState: ConnectionState.DISCONNECTED,
            }));
            // Don't set error for auto-connect failure - user can manually retry
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get device status');
      }
    };

    initializeDevice();
  }, []);

  // Subscribe to device events
  useEffect(() => {
    if (!window.electronAPI?.device) {
      return;
    }

    const device = window.electronAPI.device;

    // Connection events
    const unsubConnected = device.onConnected(() => {
      setStatus((prev) => ({
        ...prev,
        connectionState: ConnectionState.CONNECTED,
        isConnected: true,
      }));
      setIsConnecting(false);
      setError(null);
    });

    const unsubDisconnected = device.onDisconnected(() => {
      setStatus((prev) => ({
        ...prev,
        connectionState: ConnectionState.DISCONNECTED,
        deviceInfo: null,
        isConnected: false,
      }));
      setIsConnecting(false);
    });

    // Button events - track shift state when shift button is pressed/released
    const unsubButtonPress = device.onButtonPress((event) => {
      log.debug('[RENDERER] Button press received:', event);
      setLastButtonEvent(event);
      // Track shift button state
      if (event.buttonIndex === SHIFT_BUTTON_INDEX) {
        setIsShiftActive(true);
      }
    });

    const unsubButtonRelease = device.onButtonRelease((event) => {
      log.debug('[RENDERER] Button release received:', event);
      setLastButtonEvent(event);
      // Track shift button state
      if (event.buttonIndex === SHIFT_BUTTON_INDEX) {
        setIsShiftActive(false);
      }
    });

    // Encoder events
    const unsubEncoderRotate = device.onEncoderRotate((event) => {
      log.debug('[RENDERER] Encoder rotate received:', event);
      setLastEncoderEvent(event);
    });

    const unsubEncoderPress = device.onEncoderPress((event) => {
      log.debug('[RENDERER] Encoder press received:', event);
      setLastEncoderEvent(event);
    });

    // Cleanup
    return () => {
      unsubConnected();
      unsubDisconnected();
      unsubButtonPress();
      unsubButtonRelease();
      unsubEncoderRotate();
      unsubEncoderPress();
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.electronAPI?.device) {
      setError('Device API not available');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setStatus((prev) => ({
        ...prev,
        connectionState: ConnectionState.CONNECTING,
      }));
      await window.electronAPI.device.connect();
      // Status will be updated by the connected event
    } catch (err) {
      setIsConnecting(false);
      setStatus((prev) => ({
        ...prev,
        connectionState: ConnectionState.ERROR,
      }));
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!window.electronAPI?.device) {
      setError('Device API not available');
      return;
    }

    try {
      await window.electronAPI.device.disconnect();
      // Status will be updated by the disconnected event
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  }, []);

  const setBrightness = useCallback(async (brightness: number) => {
    if (!window.electronAPI?.device) {
      setError('Device API not available');
      return;
    }

    try {
      await window.electronAPI.device.setBrightness(brightness);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set brightness');
    }
  }, []);

  const setButtonImage = useCallback(async (buttonIndex: number, imageData: string) => {
    if (!window.electronAPI?.device) {
      setError('Device API not available');
      return;
    }

    try {
      await window.electronAPI.device.setButtonImage(buttonIndex, imageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set button image');
    }
  }, []);

  return {
    status,
    isConnected: status.isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    setBrightness,
    setButtonImage,
    lastButtonEvent,
    lastEncoderEvent,
    isShiftActive,
  };
}

export default useDevice;
