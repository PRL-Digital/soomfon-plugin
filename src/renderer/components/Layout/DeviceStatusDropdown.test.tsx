/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceStatusDropdown } from './DeviceStatusDropdown';
import { ConnectionState } from '@shared/types/device';

describe('DeviceStatusDropdown', () => {
  const defaultProps = {
    connectionState: ConnectionState.DISCONNECTED,
    deviceInfo: undefined,
    isConnected: false,
    isConnecting: false,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection States', () => {
    it('renders "Disconnected" when disconnected', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      expect(screen.getByText('Disconnected')).toBeTruthy();
    });

    it('renders "Connected" when connected', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
        />
      );

      expect(screen.getByText('Connected')).toBeTruthy();
    });

    it('renders "Connected" when initialized', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.INITIALIZED}
          isConnected={true}
        />
      );

      expect(screen.getByText('Connected')).toBeTruthy();
    });

    it('renders "Connecting..." when connecting', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTING}
          isConnecting={true}
        />
      );

      expect(screen.getByText('Connecting...')).toBeTruthy();
    });

    it('renders "Error" when in error state', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.ERROR}
        />
      );

      expect(screen.getByText('Error')).toBeTruthy();
    });

    it('shows correct status dot class for connected state', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
        />
      );

      const trigger = screen.getByTestId('device-status-trigger');
      const statusDot = trigger.querySelector('.status-dot');
      expect(statusDot?.classList.contains('status-dot--connected')).toBe(true);
    });

    it('shows correct status dot class for disconnected state', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      const trigger = screen.getByTestId('device-status-trigger');
      const statusDot = trigger.querySelector('.status-dot');
      expect(statusDot?.classList.contains('status-dot--disconnected')).toBe(true);
    });
  });

  describe('Dropdown Toggle', () => {
    it('dropdown is closed by default', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      expect(screen.queryByTestId('device-status-panel')).toBeNull();
    });

    it('opens dropdown on click', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      expect(screen.getByTestId('device-status-panel')).toBeTruthy();
    });

    it('closes dropdown on second click', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      const trigger = screen.getByTestId('device-status-trigger');
      fireEvent.click(trigger);
      expect(screen.getByTestId('device-status-panel')).toBeTruthy();

      fireEvent.click(trigger);
      expect(screen.queryByTestId('device-status-panel')).toBeNull();
    });

    it('closes dropdown on Escape key', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      fireEvent.click(screen.getByTestId('device-status-trigger'));
      expect(screen.getByTestId('device-status-panel')).toBeTruthy();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByTestId('device-status-panel')).toBeNull();
    });

    it('closes dropdown on click outside', () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <DeviceStatusDropdown {...defaultProps} />
        </div>
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));
      expect(screen.getByTestId('device-status-panel')).toBeTruthy();

      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByTestId('device-status-panel')).toBeNull();
    });

    it('has correct aria-expanded attribute', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      const trigger = screen.getByTestId('device-status-trigger');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Connect Button', () => {
    it('shows connect button when disconnected', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      expect(screen.getByTestId('connect-button')).toBeTruthy();
      expect(screen.getByTestId('connect-button').textContent).toBe('Connect Device');
    });

    it('shows "Connecting..." on button when connecting', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          isConnecting={true}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      const button = screen.getByTestId('connect-button');
      expect(button.textContent).toBe('Connecting...');
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('calls onConnect when connect button is clicked', () => {
      const onConnect = vi.fn();
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          onConnect={onConnect}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));
      fireEvent.click(screen.getByTestId('connect-button'));

      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('closes dropdown after connect button click', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      fireEvent.click(screen.getByTestId('device-status-trigger'));
      fireEvent.click(screen.getByTestId('connect-button'));

      expect(screen.queryByTestId('device-status-panel')).toBeNull();
    });
  });

  describe('Disconnect Button', () => {
    it('shows disconnect button when connected', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      expect(screen.getByTestId('disconnect-button')).toBeTruthy();
      expect(screen.getByTestId('disconnect-button').textContent).toBe('Disconnect');
    });

    it('calls onDisconnect when disconnect button is clicked', () => {
      const onDisconnect = vi.fn();
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
          onDisconnect={onDisconnect}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));
      fireEvent.click(screen.getByTestId('disconnect-button'));

      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    it('closes dropdown after disconnect button click', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));
      fireEvent.click(screen.getByTestId('disconnect-button'));

      expect(screen.queryByTestId('device-status-panel')).toBeNull();
    });
  });

  describe('Device Info', () => {
    it('shows device info when connected and info is available', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
          deviceInfo={{
            product: 'SOOMFON CN002-4B27',
            serialNumber: 'ABC123',
          }}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      expect(screen.getByText('SOOMFON CN002-4B27')).toBeTruthy();
      expect(screen.getByText('ABC123')).toBeTruthy();
    });

    it('shows "Unknown" for missing product name', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
          deviceInfo={{}}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      expect(screen.getByText('Unknown')).toBeTruthy();
    });

    it('shows "N/A" for missing serial number', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          connectionState={ConnectionState.CONNECTED}
          isConnected={true}
          deviceInfo={{}}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      expect(screen.getByText('N/A')).toBeTruthy();
    });

    it('does not show device info when disconnected', () => {
      render(
        <DeviceStatusDropdown
          {...defaultProps}
          deviceInfo={{
            product: 'SOOMFON CN002-4B27',
            serialNumber: 'ABC123',
          }}
        />
      );

      fireEvent.click(screen.getByTestId('device-status-trigger'));

      expect(screen.queryByText('SOOMFON CN002-4B27')).toBeNull();
      expect(screen.queryByText('ABC123')).toBeNull();
    });
  });

  describe('Chevron', () => {
    it('chevron rotates when dropdown is open', () => {
      render(<DeviceStatusDropdown {...defaultProps} />);

      const trigger = screen.getByTestId('device-status-trigger');
      let chevron = trigger.querySelector('.device-status-dropdown__chevron');
      expect(chevron?.classList.contains('device-status-dropdown__chevron--open')).toBe(false);

      fireEvent.click(trigger);
      chevron = trigger.querySelector('.device-status-dropdown__chevron');
      expect(chevron?.classList.contains('device-status-dropdown__chevron--open')).toBe(true);
    });
  });
});
