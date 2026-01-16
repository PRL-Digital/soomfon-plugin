/**
 * Unit tests for SoomfonProtocol
 * Tests validation logic and protocol behavior with mocked HID manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoomfonProtocol } from './soomfon-protocol';
import { HIDManager } from './hid-manager';
import { LCD_BUTTON_COUNT, LCD_WIDTH, LCD_HEIGHT } from '../../shared/types/device';

// Mock the HIDManager module
vi.mock('./hid-manager', () => ({
  HIDManager: vi.fn().mockImplementation(() => ({
    isConnected: vi.fn().mockReturnValue(true),
    write: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('SoomfonProtocol', () => {
  let protocol: SoomfonProtocol;
  let mockHidManager: {
    isConnected: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHidManager = {
      isConnected: vi.fn().mockReturnValue(true),
      write: vi.fn().mockResolvedValue(undefined),
    };
    protocol = new SoomfonProtocol(mockHidManager as unknown as HIDManager);
  });

  describe('isConnected', () => {
    it('returns true when HID manager is connected', () => {
      mockHidManager.isConnected.mockReturnValue(true);
      expect(protocol.isConnected()).toBe(true);
    });

    it('returns false when HID manager is disconnected', () => {
      mockHidManager.isConnected.mockReturnValue(false);
      expect(protocol.isConnected()).toBe(false);
    });

    it('delegates to HID manager isConnected', () => {
      protocol.isConnected();
      expect(mockHidManager.isConnected).toHaveBeenCalled();
    });
  });

  describe('wakeDisplay', () => {
    it('writes wake display packet', async () => {
      await protocol.wakeDisplay();
      expect(mockHidManager.write).toHaveBeenCalledTimes(1);
      const packet = mockHidManager.write.mock.calls[0][0];
      expect(packet.length).toBe(64); // REPORT_SIZE
    });
  });

  describe('clearScreen', () => {
    it('accepts valid button index 0', async () => {
      await expect(protocol.clearScreen(0)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('accepts valid button index 5 (max)', async () => {
      await expect(protocol.clearScreen(5)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('accepts no button index (clears all)', async () => {
      await expect(protocol.clearScreen()).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('accepts undefined button index (clears all)', async () => {
      await expect(protocol.clearScreen(undefined)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('rejects negative button index', async () => {
      await expect(protocol.clearScreen(-1)).rejects.toThrow(
        `Invalid button index: -1. Must be 0-${LCD_BUTTON_COUNT - 1}`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects button index equal to LCD_BUTTON_COUNT', async () => {
      await expect(protocol.clearScreen(LCD_BUTTON_COUNT)).rejects.toThrow(
        `Invalid button index: ${LCD_BUTTON_COUNT}. Must be 0-${LCD_BUTTON_COUNT - 1}`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects button index greater than LCD_BUTTON_COUNT', async () => {
      await expect(protocol.clearScreen(10)).rejects.toThrow(
        `Invalid button index: 10. Must be 0-${LCD_BUTTON_COUNT - 1}`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('writes 64-byte packet', async () => {
      await protocol.clearScreen(0);
      const packet = mockHidManager.write.mock.calls[0][0];
      expect(packet.length).toBe(64);
    });
  });

  describe('clearAllScreens', () => {
    it('delegates to clearScreen without index', async () => {
      await protocol.clearAllScreens();
      expect(mockHidManager.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('setBrightness', () => {
    it('accepts brightness 0', async () => {
      await expect(protocol.setBrightness(0)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('accepts brightness 50', async () => {
      await expect(protocol.setBrightness(50)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('accepts brightness 100', async () => {
      await expect(protocol.setBrightness(100)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('rejects negative brightness', async () => {
      await expect(protocol.setBrightness(-1)).rejects.toThrow(
        'Brightness level must be between 0 and 100'
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects brightness over 100', async () => {
      await expect(protocol.setBrightness(101)).rejects.toThrow(
        'Brightness level must be between 0 and 100'
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects brightness far over 100', async () => {
      await expect(protocol.setBrightness(255)).rejects.toThrow(
        'Brightness level must be between 0 and 100'
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('writes 64-byte packet', async () => {
      await protocol.setBrightness(75);
      const packet = mockHidManager.write.mock.calls[0][0];
      expect(packet.length).toBe(64);
    });
  });

  describe('refreshSync', () => {
    it('writes refresh sync packet', async () => {
      await protocol.refreshSync();
      expect(mockHidManager.write).toHaveBeenCalledTimes(1);
      const packet = mockHidManager.write.mock.calls[0][0];
      expect(packet.length).toBe(64);
    });
  });

  describe('setButtonImage', () => {
    const EXPECTED_IMAGE_SIZE = LCD_WIDTH * LCD_HEIGHT * 2; // RGB565 = 2 bytes per pixel

    it('accepts valid button index 0 with correct image size', async () => {
      const imageData = Buffer.alloc(EXPECTED_IMAGE_SIZE);
      await expect(protocol.setButtonImage(0, imageData)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('accepts valid button index 5 (max) with correct image size', async () => {
      const imageData = Buffer.alloc(EXPECTED_IMAGE_SIZE);
      await expect(protocol.setButtonImage(5, imageData)).resolves.toBeUndefined();
      expect(mockHidManager.write).toHaveBeenCalled();
    });

    it('rejects negative button index', async () => {
      const imageData = Buffer.alloc(EXPECTED_IMAGE_SIZE);
      await expect(protocol.setButtonImage(-1, imageData)).rejects.toThrow(
        `Invalid button index: -1. Must be 0-${LCD_BUTTON_COUNT - 1}`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects button index equal to LCD_BUTTON_COUNT', async () => {
      const imageData = Buffer.alloc(EXPECTED_IMAGE_SIZE);
      await expect(protocol.setButtonImage(LCD_BUTTON_COUNT, imageData)).rejects.toThrow(
        `Invalid button index: ${LCD_BUTTON_COUNT}. Must be 0-${LCD_BUTTON_COUNT - 1}`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects button index greater than LCD_BUTTON_COUNT', async () => {
      const imageData = Buffer.alloc(EXPECTED_IMAGE_SIZE);
      await expect(protocol.setButtonImage(10, imageData)).rejects.toThrow(
        `Invalid button index: 10. Must be 0-${LCD_BUTTON_COUNT - 1}`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects image data that is too small', async () => {
      const imageData = Buffer.alloc(100);
      await expect(protocol.setButtonImage(0, imageData)).rejects.toThrow(
        `Invalid image data size: 100. Expected ${EXPECTED_IMAGE_SIZE} bytes`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects image data that is too large', async () => {
      const imageData = Buffer.alloc(EXPECTED_IMAGE_SIZE + 100);
      await expect(protocol.setButtonImage(0, imageData)).rejects.toThrow(
        `Invalid image data size: ${EXPECTED_IMAGE_SIZE + 100}. Expected ${EXPECTED_IMAGE_SIZE} bytes`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('rejects empty image data', async () => {
      const imageData = Buffer.alloc(0);
      await expect(protocol.setButtonImage(0, imageData)).rejects.toThrow(
        `Invalid image data size: 0. Expected ${EXPECTED_IMAGE_SIZE} bytes`
      );
      expect(mockHidManager.write).not.toHaveBeenCalled();
    });

    it('sends header packet followed by data packets', async () => {
      const imageData = Buffer.alloc(EXPECTED_IMAGE_SIZE);
      await protocol.setButtonImage(0, imageData);

      // Expect header + multiple data packets
      // Image size = 10368 bytes, max payload = 59 bytes
      // Packets = ceil(10368 / 59) = 176 data packets + 1 header = 177 total
      const expectedDataPackets = Math.ceil(EXPECTED_IMAGE_SIZE / 59);
      const expectedTotalPackets = 1 + expectedDataPackets; // header + data

      expect(mockHidManager.write).toHaveBeenCalledTimes(expectedTotalPackets);
    });

    it('validates button index before image size', async () => {
      // Both invalid - should fail on button index first
      const imageData = Buffer.alloc(100);
      await expect(protocol.setButtonImage(-1, imageData)).rejects.toThrow(
        `Invalid button index: -1. Must be 0-${LCD_BUTTON_COUNT - 1}`
      );
    });
  });

  describe('sendRawPacket', () => {
    it('writes raw packet to HID manager', async () => {
      const rawData = Buffer.alloc(64);
      await protocol.sendRawPacket(rawData);
      expect(mockHidManager.write).toHaveBeenCalledWith(rawData);
    });
  });

  describe('initialize', () => {
    it('wakes display and refreshes', async () => {
      await protocol.initialize();
      // Should call write at least twice (wake + refresh)
      expect(mockHidManager.write.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('constant validation', () => {
    it('LCD_BUTTON_COUNT is 6', () => {
      expect(LCD_BUTTON_COUNT).toBe(6);
    });

    it('LCD_WIDTH is 72', () => {
      expect(LCD_WIDTH).toBe(72);
    });

    it('LCD_HEIGHT is 72', () => {
      expect(LCD_HEIGHT).toBe(72);
    });

    it('expected image size is 10368 bytes (72x72x2)', () => {
      expect(LCD_WIDTH * LCD_HEIGHT * 2).toBe(10368);
    });
  });
});
