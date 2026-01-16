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

/** Reconnection interval in milliseconds */
const RECONNECT_INTERVAL = 2000;

/** HID Manager class for device connection management */
export class HIDManager extends EventEmitter {
  private vendorDevice: HID.HID | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
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

  /** Connect to the SOOMFON device */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED) {
      console.log('[HID-MANAGER] Already connected, skipping');
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);
    console.log('[HID-MANAGER] Connecting to device...');

    try {
      // Log all available interfaces for debugging
      const allDevices = HIDManager.enumerateDevices();
      console.log('[HID-MANAGER] Found interfaces:', allDevices.map(d => ({
        interface: d.interface,
        usagePage: d.usagePage,
        usage: d.usage,
        path: d.path
      })));

      const vendorInterface = HIDManager.findVendorInterface();

      if (!vendorInterface || !vendorInterface.path) {
        throw new Error('SOOMFON device not found');
      }

      console.log('[HID-MANAGER] Using vendor interface:', {
        interface: vendorInterface.interface,
        usagePage: vendorInterface.usagePage,
        usage: vendorInterface.usage,
        path: vendorInterface.path
      });

      this.deviceInfo = vendorInterface;
      this.vendorDevice = new HID.HID(vendorInterface.path);
      console.log('[HID-MANAGER] HID device opened successfully');

      // Set up data handler
      this.vendorDevice.on('data', (data: Buffer) => {
        console.log('[HID-MANAGER] Data event received, forwarding...');
        this.emit('data', data);
      });
      console.log('[HID-MANAGER] Data handler registered');

      // Set up error handler
      this.vendorDevice.on('error', (err: Error) => {
        console.log('[HID-MANAGER] Error event:', err.message);
        this.handleError(err);
      });

      this.setConnectionState(ConnectionState.CONNECTED);
      this.stopReconnectTimer();
      this.emit('connected');
      console.log('[HID-MANAGER] Connection complete, state:', this.connectionState);
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[HID-MANAGER] Connection failed:', err.message);
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
