import React, { useState, useRef, useEffect } from 'react';
import { ConnectionState } from '@shared/types/device';

export interface DeviceStatusDropdownProps {
  connectionState: ConnectionState;
  deviceInfo?: { product?: string; serialNumber?: string };
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

/**
 * Get the display text for a connection state
 */
const getConnectionText = (state: ConnectionState): string => {
  switch (state) {
    case ConnectionState.CONNECTED:
    case ConnectionState.INITIALIZED:
      return 'Connected';
    case ConnectionState.CONNECTING:
      return 'Connecting...';
    case ConnectionState.ERROR:
      return 'Error';
    case ConnectionState.DISCONNECTED:
    default:
      return 'Disconnected';
  }
};

/**
 * Get the status dot CSS class modifier for a connection state
 */
const getStatusDotClass = (state: ConnectionState): string => {
  switch (state) {
    case ConnectionState.CONNECTED:
    case ConnectionState.INITIALIZED:
      return 'status-dot--connected';
    case ConnectionState.CONNECTING:
      return 'status-dot--connecting';
    case ConnectionState.ERROR:
      return 'status-dot--error';
    case ConnectionState.DISCONNECTED:
    default:
      return 'status-dot--disconnected';
  }
};

/**
 * DeviceStatusDropdown - Compact device status indicator with expandable dropdown
 *
 * Shows connection status in the header. Clicking expands to show device info
 * and connect/disconnect controls.
 */
export const DeviceStatusDropdown: React.FC<DeviceStatusDropdownProps> = ({
  connectionState,
  deviceInfo,
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const statusText = getConnectionText(connectionState);
  const statusDotClass = getStatusDotClass(connectionState);

  return (
    <div className="device-status-dropdown" ref={dropdownRef} data-testid="device-status-dropdown">
      {/* Trigger button */}
      <button
        className="device-status-dropdown__trigger"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="device-status-trigger"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={`status-dot ${statusDotClass}`} />
        <span className="device-status-dropdown__text">{statusText}</span>
        <span className={`device-status-dropdown__chevron ${isOpen ? 'device-status-dropdown__chevron--open' : ''}`}>
          &#9662;
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="device-status-dropdown__dropdown" data-testid="device-status-panel">
          {/* Connection row */}
          <div className="device-status-dropdown__row">
            <span className="device-status-dropdown__label">Connection</span>
            <div className="device-status-dropdown__value">
              <span className={`status-dot ${statusDotClass}`} />
              <span>{statusText}</span>
            </div>
          </div>

          {/* Device info - only show when connected */}
          {isConnected && deviceInfo && (
            <>
              <div className="device-status-dropdown__row">
                <span className="device-status-dropdown__label">Product</span>
                <span className="device-status-dropdown__value">
                  {deviceInfo.product || 'Unknown'}
                </span>
              </div>
              <div className="device-status-dropdown__row">
                <span className="device-status-dropdown__label">Serial</span>
                <span className="device-status-dropdown__value">
                  {deviceInfo.serialNumber || 'N/A'}
                </span>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="device-status-dropdown__actions">
            {!isConnected ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onConnect();
                  setIsOpen(false);
                }}
                disabled={isConnecting}
                data-testid="connect-button"
              >
                {isConnecting ? 'Connecting...' : 'Connect Device'}
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onDisconnect();
                  setIsOpen(false);
                }}
                data-testid="disconnect-button"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceStatusDropdown;
