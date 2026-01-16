/**
 * HID Manager
 * Manages USB HID device connection, discovery, and communication
 */

import { EventEmitter } from 'events';
import * as HID from 'node-hid';
import {
  SOOMFON_VID,
  SOOMFON_PID,
  VENDOR_USAGE_PAGE,
  ConnectionState,
  DeviceInfo,
  DeviceEventMap,
} from '../../shared/types/device';
import { createLogger } from '../../shared/utils/logger';

const log = createLogger('HID-MANAGER');

/** Keyboard usage page (Generic Desktop) */
const KEYBOARD_USAGE_PAGE = 1;
/** Keyboard usage (within Generic Desktop) */
const KEYBOARD_USAGE = 6;

/** Reconnection interval in milliseconds */
const RECONNECT_INTERVAL = 2000;

/** Polling interval in milliseconds for reading HID data (Windows workaround) - must be very fast */
const POLLING_INTERVAL = 1;

/** Read timeout in milliseconds - must be very short (1ms) for reliable polling */
const READ_TIMEOUT = 1;

/** HID Manager class for device connection management */
export class HIDManager extends EventEmitter {
  private vendorDevice: HID.HID | null = null;
  private inputDevice: HID.HID | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private autoReconnect: boolean = true;
  private deviceInfo: DeviceInfo | null = null;

  constructor() {
    super();
  }

  /** Get current connection state */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /** Get connected device info */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /** Check if device is connected */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && this.vendorDevice !== null;
  }

  /** Enable/disable automatic reconnection */
  setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled;
    if (!enabled) {
      this.stopReconnectTimer();
    }
  }

  /** Find SOOMFON device interfaces */
  static enumerateDevices(): DeviceInfo[] {
    const devices = HID.devices(SOOMFON_VID, SOOMFON_PID);
    return devices.map((d) => ({
      vendorId: d.vendorId,
      productId: d.productId,
      path: d.path || '',
      serialNumber: d.serialNumber,
      manufacturer: d.manufacturer,
      product: d.product,
      release: d.release,
      interface: d.interface,
      usagePage: d.usagePage,
      usage: d.usage,
    }));
  }

  /** Find the vendor interface (MI_00) */
  static findVendorInterface(): DeviceInfo | null {
    const devices = HIDManager.enumerateDevices();
    return devices.find((d) => d.usagePage === VENDOR_USAGE_PAGE) || null;
  }

  /** Find the keyboard/input interface (MI_01) */
  static findInputInterface(): DeviceInfo | null {
    const devices = HIDManager.enumerateDevices();
    return devices.find((d) => d.usagePage === KEYBOARD_USAGE_PAGE && d.usage === KEYBOARD_USAGE) || null;
  }

  /** Connect to the SOOMFON device */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      log.debug('[HID-MANAGER] Already connected, skipping');
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);
    log.debug('[HID-MANAGER] Connecting to device...');

    try {
      // Log all available interfaces for debugging
      const allDevices = HIDManager.enumerateDevices();
      log.debug('[HID-MANAGER] Found interfaces:', allDevices.map(d => ({
        interface: d.interface,
        usagePage: d.usagePage,
        usage: d.usage,
        path: d.path
      })));

      const vendorInterface = HIDManager.findVendorInterface();

      if (!vendorInterface || !vendorInterface.path) {
        throw new Error('SOOMFON device not found');
      }

      log.debug('[HID-MANAGER] Using vendor interface:', {
        interface: vendorInterface.interface,
        usagePage: vendorInterface.usagePage,
        usage: vendorInterface.usage,
        path: vendorInterface.path
      });

      this.deviceInfo = vendorInterface;
      this.vendorDevice = new HID.HID(vendorInterface.path);
      log.debug('[HID-MANAGER] Vendor device opened successfully');

      // Set up error handler for vendor device
      this.vendorDevice.on('error', (err: Error) => {
        log.debug('[HID-MANAGER] Vendor device error:', err.message);
        this.handleError(err);
      });

      // Set up async data handler (may not work on Windows, polling is the fallback)
      this.vendorDevice.on('data', (data: Buffer) => {
        log.debug('[HID-MANAGER] Async vendor data received:', data.toString('hex'));
        this.emit('data', data);
      });

      this.setConnectionState(ConnectionState.CONNECTED);
      this.stopReconnectTimer();

      // Start polling for data immediately (Windows workaround - async events don't work reliably)
      this.startPolling();

      this.emit('connected');
      log.debug('[HID-MANAGER] Connection complete, state:', this.connectionState);
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('[HID-MANAGER] Connection failed:', err.message);
      this.emit('error', err);

      if (this.autoReconnect) {
        this.startReconnectTimer();
      }

      throw err;
    }
  }

  /** Disconnect from the device */
  disconnect(): void {
    this.stopReconnectTimer();
    this.stopPolling();

    if (this.inputDevice) {
      try {
        this.inputDevice.close();
      } catch {
        // Ignore close errors
      }
      this.inputDevice = null;
    }

    if (this.vendorDevice) {
      try {
        this.vendorDevice.close();
      } catch {
        // Ignore close errors
      }
      this.vendorDevice = null;
    }

    this.deviceInfo = null;
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.emit('disconnected');
  }

  /** Write data to the vendor interface */
  async write(data: Buffer | number[]): Promise<number> {
    if (!this.vendorDevice) {
      throw new Error('Device not connected');
    }

    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return this.vendorDevice.write([...buffer]);
  }

  /** Send a feature report */
  async sendFeatureReport(data: Buffer | number[]): Promise<void> {
    if (!this.vendorDevice) {
      throw new Error('Device not connected');
    }

    const buffer = Buffer.isBuffer(data) ? [...data] : data;
    this.vendorDevice.sendFeatureReport(buffer);
  }

  /** Get a feature report */
  async getFeatureReport(reportId: number, length: number): Promise<Buffer> {
    if (!this.vendorDevice) {
      throw new Error('Device not connected');
    }

    const data = this.vendorDevice.getFeatureReport(reportId, length);
    return Buffer.from(data);
  }

  /** Set non-blocking mode */
  setNonBlocking(nonBlocking: boolean): void {
    if (this.vendorDevice) {
      this.vendorDevice.setNonBlocking(nonBlocking);
    }
  }

  /** Read data synchronously (non-blocking if set) */
  read(): Buffer | null {
    if (!this.vendorDevice) {
      return null;
    }

    try {
      const data = this.vendorDevice.readSync();
      return data.length > 0 ? Buffer.from(data) : null;
    } catch {
      return null;
    }
  }

  /** Read data with timeout */
  readTimeout(timeout: number): Buffer | null {
    if (!this.vendorDevice) {
      return null;
    }

    try {
      const data = this.vendorDevice.readTimeout(timeout);
      return data.length > 0 ? Buffer.from(data) : null;
    } catch {
      return null;
    }
  }

  /** Handle device errors */
  private handleError(error: Error): void {
    this.setConnectionState(ConnectionState.ERROR);
    this.stopPolling();

    if (this.inputDevice) {
      try {
        this.inputDevice.close();
      } catch {
        // Ignore close errors
      }
      this.inputDevice = null;
    }

    if (this.vendorDevice) {
      try {
        this.vendorDevice.close();
      } catch {
        // Ignore close errors
      }
      this.vendorDevice = null;
    }

    this.emit('error', error);
    this.emit('disconnected');

    if (this.autoReconnect) {
      this.startReconnectTimer();
    }
  }

  /** Set connection state and emit change event */
  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
  }

  /** Start reconnection timer */
  private startReconnectTimer(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setInterval(() => {
      if (this.connectionState !== ConnectionState.CONNECTED) {
        this.connect().catch(() => {
          // Reconnect attempt failed, will try again
        });
      }
    }, RECONNECT_INTERVAL);
  }

  /** Stop reconnection timer */
  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /** Start polling for HID data (Windows workaround) */
  private startPolling(): void {
    if (this.pollingTimer) {
      return;
    }

    log.debug('[HID-MANAGER] Starting data polling...');

    // Log once to confirm polling started
    let pollCount = 0;
    this.pollingTimer = setInterval(() => {
      pollCount++;
      if (pollCount === 1 || pollCount === 100) {
        log.debug('[HID-MANAGER] Poll count:', pollCount);
      }
      this.pollData();
    }, POLLING_INTERVAL);
  }

  /** Stop polling for HID data */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      log.debug('[HID-MANAGER] Stopped data polling');
    }
  }

  /** Poll for HID data */
  private pollData(): void {
    if (this.connectionState !== ConnectionState.CONNECTED) {
      return;
    }

    // Poll vendor device for button/encoder events
    if (this.vendorDevice) {
      try {
        const data = this.vendorDevice.readTimeout(READ_TIMEOUT);
        if (data && data.length > 0) {
          const buffer = Buffer.from(data);
          log.debug('[HID-MANAGER] Vendor data received:', buffer.toString('hex'), 'length:', buffer.length);
          this.emit('data', buffer);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error('[HID-MANAGER] Vendor poll error:', err.message);
      }
    }
  }

  /** Type-safe event emitter methods */
  override on<K extends keyof DeviceEventMap>(
    event: K,
    listener: DeviceEventMap[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof DeviceEventMap>(
    event: K,
    ...args: Parameters<DeviceEventMap[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
