/**
 * Packet Builder Tests
 *
 * Tests for HID packet construction functions used for SOOMFON device communication.
 * All functions are pure (no side effects, no dependencies) making them highly testable.
 *
 * Key behaviors verified:
 * - Correct packet structure (64 bytes, report ID at byte 0)
 * - Command ID placement at byte 1
 * - Data payload handling and truncation
 * - Multi-byte encoding (UInt32LE, UInt16LE)
 * - Checksum calculation with 8-bit overflow
 * - Input validation and clamping
 */

import { describe, it, expect } from 'vitest';
import {
  REPORT_SIZE,
  OUTPUT_REPORT_ID,
  CommandId,
  createPacket,
  buildCommandPacket,
  buildWakeDisplayPacket,
  buildClearScreenPacket,
  buildBrightnessPacket,
  buildRefreshSyncPacket,
  buildImageHeaderPacket,
  buildImageDataPacket,
  calculateChecksum,
  isValidPacket,
} from './packet-builder';

describe('packet-builder', () => {
  describe('constants', () => {
    it('should define REPORT_SIZE as 64 bytes', () => {
      expect(REPORT_SIZE).toBe(64);
    });

    it('should define OUTPUT_REPORT_ID as 0x00', () => {
      expect(OUTPUT_REPORT_ID).toBe(0x00);
    });

    it('should define all CommandId values', () => {
      expect(CommandId.WAKE_DISPLAY).toBe(0x01);
      expect(CommandId.CLEAR_SCREEN).toBe(0x02);
      expect(CommandId.SET_BRIGHTNESS).toBe(0x03);
      expect(CommandId.REFRESH_SYNC).toBe(0x04);
      expect(CommandId.SET_IMAGE).toBe(0x10);
      expect(CommandId.SET_IMAGE_DATA).toBe(0x11);
    });
  });

  describe('createPacket', () => {
    it('should create a 64-byte buffer', () => {
      const packet = createPacket();
      expect(packet.length).toBe(REPORT_SIZE);
    });

    it('should set default report ID (0x00) at byte 0', () => {
      const packet = createPacket();
      expect(packet[0]).toBe(OUTPUT_REPORT_ID);
    });

    it('should set custom report ID at byte 0', () => {
      const packet = createPacket(0x05);
      expect(packet[0]).toBe(0x05);
    });

    it('should zero-fill remaining bytes', () => {
      const packet = createPacket();
      for (let i = 1; i < REPORT_SIZE; i++) {
        expect(packet[i]).toBe(0);
      }
    });

    it('should handle edge case report IDs', () => {
      expect(createPacket(0)[0]).toBe(0);
      expect(createPacket(255)[0]).toBe(255);
    });
  });

  describe('buildCommandPacket', () => {
    it('should set report ID at byte 0', () => {
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY);
      expect(packet[0]).toBe(OUTPUT_REPORT_ID);
    });

    it('should set command ID at byte 1', () => {
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY);
      expect(packet[1]).toBe(CommandId.WAKE_DISPLAY);
    });

    it('should handle all command IDs', () => {
      Object.values(CommandId)
        .filter((v): v is number => typeof v === 'number')
        .forEach((cmdId) => {
          const packet = buildCommandPacket(cmdId);
          expect(packet[1]).toBe(cmdId);
        });
    });

    it('should copy number[] data starting at byte 2', () => {
      const data = [0x10, 0x20, 0x30];
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY, data);
      expect(packet[2]).toBe(0x10);
      expect(packet[3]).toBe(0x20);
      expect(packet[4]).toBe(0x30);
    });

    it('should copy Buffer data starting at byte 2', () => {
      const data = Buffer.from([0xaa, 0xbb, 0xcc]);
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY, data);
      expect(packet[2]).toBe(0xaa);
      expect(packet[3]).toBe(0xbb);
      expect(packet[4]).toBe(0xcc);
    });

    it('should truncate data exceeding max payload (62 bytes)', () => {
      const data = Buffer.alloc(100, 0xff);
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY, data);

      // Data should be truncated at position 62 (REPORT_SIZE - 2)
      expect(packet[63]).toBe(0xff); // Last byte should have data
      expect(packet.length).toBe(REPORT_SIZE); // Packet size unchanged
    });

    it('should handle empty data array', () => {
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY, []);
      expect(packet[2]).toBe(0);
    });

    it('should handle undefined data', () => {
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY);
      expect(packet[2]).toBe(0);
    });

    it('should zero-fill bytes after data', () => {
      const data = [0x01, 0x02];
      const packet = buildCommandPacket(CommandId.WAKE_DISPLAY, data);
      expect(packet[4]).toBe(0); // After data
      expect(packet[63]).toBe(0); // Last byte
    });
  });

  describe('buildWakeDisplayPacket', () => {
    it('should create packet with WAKE_DISPLAY command', () => {
      const packet = buildWakeDisplayPacket();
      expect(packet[1]).toBe(CommandId.WAKE_DISPLAY);
    });

    it('should be 64 bytes', () => {
      const packet = buildWakeDisplayPacket();
      expect(packet.length).toBe(REPORT_SIZE);
    });

    it('should have no data payload', () => {
      const packet = buildWakeDisplayPacket();
      expect(packet[2]).toBe(0);
    });
  });

  describe('buildClearScreenPacket', () => {
    it('should create packet with CLEAR_SCREEN command', () => {
      const packet = buildClearScreenPacket();
      expect(packet[1]).toBe(CommandId.CLEAR_SCREEN);
    });

    it('should have no button index when not specified (clear all)', () => {
      const packet = buildClearScreenPacket();
      expect(packet[2]).toBe(0);
    });

    it('should set button index when specified', () => {
      const packet = buildClearScreenPacket(3);
      expect(packet[2]).toBe(3);
    });

    it('should handle button index 0', () => {
      const packet = buildClearScreenPacket(0);
      expect(packet[2]).toBe(0);
    });

    it('should handle high button indices', () => {
      const packet = buildClearScreenPacket(5);
      expect(packet[2]).toBe(5);
    });
  });

  describe('buildBrightnessPacket', () => {
    it('should create packet with SET_BRIGHTNESS command', () => {
      const packet = buildBrightnessPacket(50);
      expect(packet[1]).toBe(CommandId.SET_BRIGHTNESS);
    });

    it('should set brightness level at byte 2', () => {
      const packet = buildBrightnessPacket(75);
      expect(packet[2]).toBe(75);
    });

    it('should clamp negative values to 0', () => {
      const packet = buildBrightnessPacket(-50);
      expect(packet[2]).toBe(0);
    });

    it('should clamp values above 100 to 100', () => {
      const packet = buildBrightnessPacket(150);
      expect(packet[2]).toBe(100);
    });

    it('should handle boundary values', () => {
      expect(buildBrightnessPacket(0)[2]).toBe(0);
      expect(buildBrightnessPacket(100)[2]).toBe(100);
    });

    it('should round decimal values', () => {
      expect(buildBrightnessPacket(50.4)[2]).toBe(50);
      expect(buildBrightnessPacket(50.5)[2]).toBe(51); // Math.round rounds .5 up
      expect(buildBrightnessPacket(50.9)[2]).toBe(51);
    });

    it('should handle NaN by clamping to 0', () => {
      const packet = buildBrightnessPacket(NaN);
      expect(packet[2]).toBe(0);
    });
  });

  describe('buildRefreshSyncPacket', () => {
    it('should create packet with REFRESH_SYNC command', () => {
      const packet = buildRefreshSyncPacket();
      expect(packet[1]).toBe(CommandId.REFRESH_SYNC);
    });

    it('should be 64 bytes', () => {
      const packet = buildRefreshSyncPacket();
      expect(packet.length).toBe(REPORT_SIZE);
    });

    it('should have no data payload', () => {
      const packet = buildRefreshSyncPacket();
      expect(packet[2]).toBe(0);
    });
  });

  describe('buildImageHeaderPacket', () => {
    it('should create packet with SET_IMAGE command', () => {
      const packet = buildImageHeaderPacket(0, 1000, 72, 72);
      expect(packet[1]).toBe(CommandId.SET_IMAGE);
    });

    it('should set button index at byte 2', () => {
      const packet = buildImageHeaderPacket(3, 1000, 72, 72);
      expect(packet[2]).toBe(3);
    });

    it('should encode imageSize as UInt32LE at bytes 3-6', () => {
      const packet = buildImageHeaderPacket(0, 0x12345678, 0, 0);
      expect(packet.readUInt32LE(3)).toBe(0x12345678);
    });

    it('should encode imageSize little-endian byte order', () => {
      const packet = buildImageHeaderPacket(0, 0x12345678, 0, 0);
      expect(packet[3]).toBe(0x78); // LSB first
      expect(packet[4]).toBe(0x56);
      expect(packet[5]).toBe(0x34);
      expect(packet[6]).toBe(0x12); // MSB last
    });

    it('should encode width as UInt16LE at bytes 7-8', () => {
      const packet = buildImageHeaderPacket(0, 0, 0x1234, 0);
      expect(packet.readUInt16LE(7)).toBe(0x1234);
      expect(packet[7]).toBe(0x34); // LSB
      expect(packet[8]).toBe(0x12); // MSB
    });

    it('should encode height as UInt16LE at bytes 9-10', () => {
      const packet = buildImageHeaderPacket(0, 0, 0, 0x5678);
      expect(packet.readUInt16LE(9)).toBe(0x5678);
      expect(packet[9]).toBe(0x78); // LSB
      expect(packet[10]).toBe(0x56); // MSB
    });

    it('should handle typical LCD dimensions (72x72)', () => {
      const imageSize = 72 * 72 * 2; // RGB565 = 10368 bytes
      const packet = buildImageHeaderPacket(0, imageSize, 72, 72);
      expect(packet.readUInt32LE(3)).toBe(10368);
      expect(packet.readUInt16LE(7)).toBe(72);
      expect(packet.readUInt16LE(9)).toBe(72);
    });

    it('should handle zero values', () => {
      const packet = buildImageHeaderPacket(0, 0, 0, 0);
      expect(packet[2]).toBe(0);
      expect(packet.readUInt32LE(3)).toBe(0);
      expect(packet.readUInt16LE(7)).toBe(0);
      expect(packet.readUInt16LE(9)).toBe(0);
    });

    it('should handle max UInt16 dimensions', () => {
      const packet = buildImageHeaderPacket(0, 0, 65535, 65535);
      expect(packet.readUInt16LE(7)).toBe(65535);
      expect(packet.readUInt16LE(9)).toBe(65535);
    });
  });

  describe('buildImageDataPacket', () => {
    it('should create packet with SET_IMAGE_DATA command', () => {
      const data = Buffer.alloc(10);
      const packet = buildImageDataPacket(0, data, false);
      expect(packet[1]).toBe(CommandId.SET_IMAGE_DATA);
    });

    it('should encode sequence number as UInt16LE at bytes 2-3', () => {
      const data = Buffer.alloc(10);
      const packet = buildImageDataPacket(0x1234, data, false);
      expect(packet.readUInt16LE(2)).toBe(0x1234);
      expect(packet[2]).toBe(0x34); // LSB
      expect(packet[3]).toBe(0x12); // MSB
    });

    it('should set isLast flag at byte 4', () => {
      const data = Buffer.alloc(10);
      expect(buildImageDataPacket(0, data, false)[4]).toBe(0);
      expect(buildImageDataPacket(0, data, true)[4]).toBe(1);
    });

    it('should copy image data starting at byte 5', () => {
      const data = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);
      const packet = buildImageDataPacket(0, data, false);
      expect(packet[5]).toBe(0xaa);
      expect(packet[6]).toBe(0xbb);
      expect(packet[7]).toBe(0xcc);
      expect(packet[8]).toBe(0xdd);
    });

    it('should truncate data exceeding max payload (59 bytes)', () => {
      const maxPayload = REPORT_SIZE - 5; // 59 bytes
      const data = Buffer.alloc(100, 0xff);
      const packet = buildImageDataPacket(0, data, false);

      // Verify data was copied up to max payload
      expect(packet[5 + maxPayload - 1]).toBe(0xff); // Last byte of payload
      expect(packet.length).toBe(REPORT_SIZE);
    });

    it('should handle empty data buffer', () => {
      const data = Buffer.alloc(0);
      const packet = buildImageDataPacket(0, data, true);
      expect(packet[5]).toBe(0);
    });

    it('should handle sequence number 0', () => {
      const data = Buffer.alloc(10);
      const packet = buildImageDataPacket(0, data, false);
      expect(packet.readUInt16LE(2)).toBe(0);
    });

    it('should handle max sequence number (65535)', () => {
      const data = Buffer.alloc(10);
      const packet = buildImageDataPacket(65535, data, false);
      expect(packet.readUInt16LE(2)).toBe(65535);
    });

    it('should handle exact max payload size (59 bytes)', () => {
      const maxPayload = REPORT_SIZE - 5;
      const data = Buffer.alloc(maxPayload, 0xab);
      const packet = buildImageDataPacket(0, data, true);

      // Verify all 59 bytes copied correctly
      for (let i = 0; i < maxPayload; i++) {
        expect(packet[5 + i]).toBe(0xab);
      }
    });
  });

  describe('calculateChecksum', () => {
    it('should return 0 for zero-filled buffer', () => {
      const packet = Buffer.alloc(REPORT_SIZE);
      expect(calculateChecksum(packet)).toBe(0);
    });

    it('should sum all bytes', () => {
      const packet = Buffer.alloc(REPORT_SIZE);
      packet[0] = 1;
      packet[1] = 2;
      packet[2] = 3;
      expect(calculateChecksum(packet)).toBe(6);
    });

    it('should handle 8-bit overflow (wrap at 256)', () => {
      const packet = Buffer.alloc(REPORT_SIZE);
      packet[0] = 200;
      packet[1] = 100; // Sum = 300, wraps to 44 (300 & 0xFF)
      expect(calculateChecksum(packet)).toBe(44);
    });

    it('should handle all bytes set to 255', () => {
      const packet = Buffer.alloc(REPORT_SIZE, 0xff);
      // 255 * 64 = 16320, 16320 & 0xFF = 192
      expect(calculateChecksum(packet)).toBe(192);
    });

    it('should handle all bytes set to 1', () => {
      const packet = Buffer.alloc(REPORT_SIZE, 0x01);
      // 1 * 64 = 64
      expect(calculateChecksum(packet)).toBe(64);
    });

    it('should produce deterministic results', () => {
      const packet = Buffer.from(Array(REPORT_SIZE).fill(0).map((_, i) => i % 256));
      const checksum1 = calculateChecksum(packet);
      const checksum2 = calculateChecksum(packet);
      expect(checksum1).toBe(checksum2);
    });

    it('should handle non-standard buffer lengths', () => {
      const shortPacket = Buffer.from([10, 20, 30]);
      expect(calculateChecksum(shortPacket)).toBe(60);
    });
  });

  describe('isValidPacket', () => {
    it('should return true for valid 64-byte packet', () => {
      const packet = Buffer.alloc(REPORT_SIZE);
      expect(isValidPacket(packet)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidPacket(null as unknown as Buffer)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidPacket(undefined as unknown as Buffer)).toBe(false);
    });

    it('should return false for too short packet (63 bytes)', () => {
      const packet = Buffer.alloc(63);
      expect(isValidPacket(packet)).toBe(false);
    });

    it('should return false for too long packet (65 bytes)', () => {
      const packet = Buffer.alloc(65);
      expect(isValidPacket(packet)).toBe(false);
    });

    it('should return false for empty buffer', () => {
      const packet = Buffer.alloc(0);
      expect(isValidPacket(packet)).toBe(false);
    });
  });

  describe('integration: packet structure compliance', () => {
    it('should produce valid packets from all builder functions', () => {
      const packets = [
        buildWakeDisplayPacket(),
        buildClearScreenPacket(),
        buildClearScreenPacket(0),
        buildBrightnessPacket(50),
        buildRefreshSyncPacket(),
        buildImageHeaderPacket(0, 10368, 72, 72),
        buildImageDataPacket(0, Buffer.alloc(50), false),
        buildImageDataPacket(100, Buffer.alloc(50), true),
      ];

      packets.forEach((packet, index) => {
        expect(isValidPacket(packet)).toBe(true);
        expect(packet[0]).toBe(OUTPUT_REPORT_ID);
      });
    });

    it('should have correct command IDs for all packet types', () => {
      expect(buildWakeDisplayPacket()[1]).toBe(CommandId.WAKE_DISPLAY);
      expect(buildClearScreenPacket()[1]).toBe(CommandId.CLEAR_SCREEN);
      expect(buildBrightnessPacket(50)[1]).toBe(CommandId.SET_BRIGHTNESS);
      expect(buildRefreshSyncPacket()[1]).toBe(CommandId.REFRESH_SYNC);
      expect(buildImageHeaderPacket(0, 0, 0, 0)[1]).toBe(CommandId.SET_IMAGE);
      expect(buildImageDataPacket(0, Buffer.alloc(1), false)[1]).toBe(
        CommandId.SET_IMAGE_DATA
      );
    });
  });
});
