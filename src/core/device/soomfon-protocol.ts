/**
 * SOOMFON Protocol
 * High-level protocol commands for device control
 */

import { HIDManager } from './hid-manager';
import {
  buildWakeDisplayPacket,
  buildClearScreenPacket,
  buildBrightnessPacket,
  buildRefreshSyncPacket,
  buildImageHeaderPacket,
  buildImageDataPacket,
  REPORT_SIZE,
} from './packet-builder';
import { LCD_BUTTON_COUNT, LCD_WIDTH, LCD_HEIGHT } from '../../shared/types/device';

/** Delay between image data packets (ms) to avoid buffer overflow */
const IMAGE_PACKET_DELAY = 5;

/** Maximum image data per packet (REPORT_SIZE minus header bytes) */
const MAX_IMAGE_PAYLOAD = REPORT_SIZE - 5;

/** SOOMFON protocol handler */
export class SoomfonProtocol {
  private hidManager: HIDManager;

  constructor(hidManager: HIDManager) {
    this.hidManager = hidManager;
  }

  /** Check if device is connected */
  isConnected(): boolean {
    return this.hidManager.isConnected();
  }

  /** Wake the device display from sleep/standby */
  async wakeDisplay(): Promise<void> {
    const packet = buildWakeDisplayPacket();
    await this.hidManager.write(packet);
  }

  /** Clear screen (all buttons or specific button) */
  async clearScreen(buttonIndex?: number): Promise<void> {
    if (buttonIndex !== undefined) {
      if (buttonIndex < 0 || buttonIndex >= LCD_BUTTON_COUNT) {
        throw new Error(`Invalid button index: ${buttonIndex}. Must be 0-${LCD_BUTTON_COUNT - 1}`);
      }
    }

    const packet = buildClearScreenPacket(buttonIndex);
    await this.hidManager.write(packet);
  }

  /** Clear all LCD button screens */
  async clearAllScreens(): Promise<void> {
    await this.clearScreen();
  }

  /** Set display brightness */
  async setBrightness(level: number): Promise<void> {
    if (level < 0 || level > 100) {
      throw new Error('Brightness level must be between 0 and 100');
    }

    const packet = buildBrightnessPacket(level);
    await this.hidManager.write(packet);
  }

  /** Force display refresh/sync */
  async refreshSync(): Promise<void> {
    const packet = buildRefreshSyncPacket();
    await this.hidManager.write(packet);
  }

  /**
   * Send image data to a button LCD
   * @param buttonIndex - Target button index (0-5)
   * @param imageData - Raw image data (RGB565 format, 72x72 pixels)
   */
  async setButtonImage(buttonIndex: number, imageData: Buffer): Promise<void> {
    if (buttonIndex < 0 || buttonIndex >= LCD_BUTTON_COUNT) {
      throw new Error(`Invalid button index: ${buttonIndex}. Must be 0-${LCD_BUTTON_COUNT - 1}`);
    }

    const expectedSize = LCD_WIDTH * LCD_HEIGHT * 2; // RGB565 = 2 bytes per pixel
    if (imageData.length !== expectedSize) {
      throw new Error(`Invalid image data size: ${imageData.length}. Expected ${expectedSize} bytes`);
    }

    // Send image header
    const headerPacket = buildImageHeaderPacket(
      buttonIndex,
      imageData.length,
      LCD_WIDTH,
      LCD_HEIGHT
    );
    await this.hidManager.write(headerPacket);

    // Send image data in chunks
    let sequenceNumber = 0;
    let offset = 0;

    while (offset < imageData.length) {
      const remaining = imageData.length - offset;
      const chunkSize = Math.min(remaining, MAX_IMAGE_PAYLOAD);
      const chunk = imageData.subarray(offset, offset + chunkSize);
      const isLast = offset + chunkSize >= imageData.length;

      const dataPacket = buildImageDataPacket(sequenceNumber, chunk, isLast);
      await this.hidManager.write(dataPacket);

      offset += chunkSize;
      sequenceNumber++;

      // Small delay to prevent buffer overflow
      if (!isLast) {
        await this.delay(IMAGE_PACKET_DELAY);
      }
    }
  }

  /**
   * Send raw command packet
   * For advanced use when protocol specifics are known
   */
  async sendRawPacket(data: Buffer): Promise<void> {
    await this.hidManager.write(data);
  }

  /** Initialize device (wake + refresh) */
  async initialize(): Promise<void> {
    await this.wakeDisplay();
    await this.delay(50);
    await this.refreshSync();
  }

  /** Utility delay function */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
