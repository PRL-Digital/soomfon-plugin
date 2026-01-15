/**
 * DeviceSettings Component
 * Device-specific settings: brightness, sleep timeout, screen saver
 */

import React, { useState, useEffect, useRef } from 'react';
import type { DeviceSettings as DeviceSettingsType } from '@shared/types/config';
import type { ConnectionState } from '@shared/types/device';
import { ConnectionState as CS } from '@shared/types/device';

export interface DeviceSettingsProps {
  deviceSettings: DeviceSettingsType | null;
  connectionState?: ConnectionState;
  onSettingsChange: (settings: DeviceSettingsType) => Promise<void>;
  onBrightnessChange?: (brightness: number) => void;
  isLoading: boolean;
}

const SLEEP_TIMEOUT_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({
  deviceSettings,
  connectionState,
  onSettingsChange,
  onBrightnessChange,
  isLoading,
}) => {
  // Local state for immediate UI updates
  const [brightness, setBrightness] = useState(deviceSettings?.brightness ?? 80);
  const [sleepTimeout, setSleepTimeout] = useState(deviceSettings?.sleepTimeout ?? 5);
  const [screensaverEnabled, setScreensaverEnabled] = useState(deviceSettings?.screensaverEnabled ?? false);

  // Debounce timer for brightness slider
  const brightnessDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with props
  useEffect(() => {
    if (deviceSettings) {
      setBrightness(deviceSettings.brightness);
      setSleepTimeout(deviceSettings.sleepTimeout);
      setScreensaverEnabled(deviceSettings.screensaverEnabled);
    }
  }, [deviceSettings]);

  // Handle brightness change with debounced save
  const handleBrightnessChange = (newBrightness: number) => {
    setBrightness(newBrightness);

    // Immediately send to device for live preview
    onBrightnessChange?.(newBrightness);

    // Debounce the config save
    if (brightnessDebounceRef.current) {
      clearTimeout(brightnessDebounceRef.current);
    }

    brightnessDebounceRef.current = setTimeout(() => {
      if (deviceSettings) {
        onSettingsChange({
          ...deviceSettings,
          brightness: newBrightness,
        });
      }
    }, 500);
  };

  // Handle sleep timeout change
  const handleSleepTimeoutChange = (newTimeout: number) => {
    setSleepTimeout(newTimeout);
    if (deviceSettings) {
      onSettingsChange({
        ...deviceSettings,
        sleepTimeout: newTimeout,
      });
    }
  };

  // Handle screensaver toggle
  const handleScreensaverToggle = (enabled: boolean) => {
    setScreensaverEnabled(enabled);
    if (deviceSettings) {
      onSettingsChange({
        ...deviceSettings,
        screensaverEnabled: enabled,
      });
    }
  };

  const isConnected = connectionState === CS.CONNECTED;

  if (isLoading) {
    return (
      <div className="settings-section">
        <p className="text-text-muted italic">Loading device settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-section" data-testid="device-settings-content">
      {/* Connection Status */}
      <div className="settings-group">
        <h3 className="settings-group__title">Connection Status</h3>
        <div className="settings-field">
          <div className="settings-field__row">
            <span className="settings-field__label">Device</span>
            <div className="settings-field__value">
              <span
                className={`status-dot ${
                  isConnected ? 'status-dot--connected' : 'status-dot--disconnected'
                }`}
              />
              <span className={isConnected ? 'text-success' : 'text-text-muted'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          {!isConnected && (
            <p className="settings-field__hint">
              Connect a device to adjust hardware settings.
            </p>
          )}
        </div>
      </div>

      {/* Brightness Control */}
      <div className="settings-group">
        <h3 className="settings-group__title">Display</h3>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label" htmlFor="brightness-slider">
              Brightness
            </label>
            <span className="settings-field__value">{brightness}%</span>
          </div>
          <div className="settings-slider">
            <span className="settings-slider__icon">🔅</span>
            <input
              id="brightness-slider"
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              className="settings-slider__input"
              disabled={!isConnected}
            />
            <span className="settings-slider__icon">🔆</span>
          </div>
          <p className="settings-field__hint">
            Adjust the LCD display brightness. Changes apply immediately.
          </p>
        </div>
      </div>

      {/* Sleep Settings */}
      <div className="settings-group">
        <h3 className="settings-group__title">Power Saving</h3>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label" htmlFor="sleep-timeout">
              Sleep Timeout
            </label>
            <select
              id="sleep-timeout"
              value={sleepTimeout}
              onChange={(e) => handleSleepTimeoutChange(Number(e.target.value))}
              className="settings-select"
            >
              {SLEEP_TIMEOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="settings-field__hint">
            Time of inactivity before the device display turns off.
          </p>
        </div>

        <div className="settings-field">
          <div className="settings-field__row">
            <label className="settings-field__label" htmlFor="screensaver-toggle">
              Screen Saver
            </label>
            <label className="settings-toggle">
              <input
                id="screensaver-toggle"
                type="checkbox"
                checked={screensaverEnabled}
                onChange={(e) => handleScreensaverToggle(e.target.checked)}
                className="settings-toggle__input"
              />
              <span className="settings-toggle__slider"></span>
            </label>
          </div>
          <p className="settings-field__hint">
            Enable a screen saver to prevent burn-in on LCD buttons.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeviceSettings;
