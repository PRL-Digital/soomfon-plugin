/**
 * Device Types
 * Type definitions for SOOMFON device communication
 */

/** SOOMFON device identifiers */
export const SOOMFON_VID = 0x1500;
export const SOOMFON_PID = 0x3001;

/** Device layout constants */
export const LCD_BUTTON_COUNT = 6;
export const NORMAL_BUTTON_COUNT = 3;
export const ENCODER_COUNT = 3;
export const TOTAL_BUTTONS = LCD_BUTTON_COUNT + NORMAL_BUTTON_COUNT;

/** LCD button dimensions (pixels) */
export const LCD_WIDTH = 72;
export const LCD_HEIGHT = 72;

/** HID interface constants */
export const VENDOR_USAGE_PAGE = 0xffa0;
export const KEYBOARD_USAGE_PAGE = 0x0001;
export const KEYBOARD_USAGE = 0x0006;

/** Button types */
export enum ButtonType {
  LCD = 'lcd',
  NORMAL = 'normal',
}

/** Button event types */
export enum ButtonEventType {
  PRESS = 'press',
  RELEASE = 'release',
  LONG_PRESS = 'longPress',
}

/** Encoder event types */
export enum EncoderEventType {
  ROTATE_CW = 'rotateCW',
  ROTATE_CCW = 'rotateCCW',
  PRESS = 'press',
  RELEASE = 'release',
  LONG_PRESS = 'longPress',
}

/** Button event */
export interface ButtonEvent {
  type: ButtonEventType;
  buttonIndex: number;
  buttonType: ButtonType;
  timestamp: number;
  /** Whether the shift button (small button 0) was held when this event occurred */
  isShiftActive?: boolean;
}

/** Encoder event */
export interface EncoderEvent {
  type: EncoderEventType;
  encoderIndex: number;
  delta?: number;
  timestamp: number;
  /** Whether the shift button (small button 0) was held when this event occurred */
  isShiftActive?: boolean;
}

/** Index of the shift button (small button 0, left-most) */
export const SHIFT_BUTTON_INDEX = LCD_BUTTON_COUNT; // Index 6

/** Device connection state */
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  INITIALIZED: 'initialized', // Backend uses this for connected + initialized state
  ERROR: 'error',
} as const;

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

/** Device info from HID enumeration */
export interface DeviceInfo {
  vendorId: number;
  productId: number;
  path: string;
  serialNumber?: string;
  manufacturer?: string;
  product?: string;
  release: number;
  interface: number;
  usagePage?: number;
  usage?: number;
}

/** HID report types */
export enum ReportType {
  BUTTON = 0x01,
  ENCODER = 0x02,
  STATUS = 0x03,
}

/** Raw input report structure */
export interface RawInputReport {
  reportId: number;
  data: Buffer;
}

/** Device events emitted by HID manager */
export type DeviceEventMap = {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  button: (event: ButtonEvent) => void;
  encoder: (event: EncoderEvent) => void;
  data: (data: Buffer) => void;
};
