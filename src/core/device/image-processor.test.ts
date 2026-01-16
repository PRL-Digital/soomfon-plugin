/**
 * Image Processor Tests
 *
 * Tests for image conversion to device-compatible RGB565 format.
 *
 * Key behaviors verified:
 * - RGB888 to RGB565 bit conversion accuracy
 * - Solid color buffer generation
 * - Gradient pattern generation
 * - Image processing with sharp library (mocked for unit tests)
 * - Buffer size calculations
 */

import { describe, it, expect } from 'vitest';
import { ImageProcessor } from './image-processor';
import { LCD_WIDTH, LCD_HEIGHT } from '../../shared/types/device';

// Helper to read RGB565 pixel value at position
function readRGB565Pixel(
  buffer: Buffer,
  x: number,
  y: number,
  width: number
): { r5: number; g6: number; b5: number } {
  const offset = (y * width + x) * 2;
  const pixel = buffer.readUInt16LE(offset);
  return {
    r5: (pixel >> 11) & 0x1f,
    g6: (pixel >> 5) & 0x3f,
    b5: pixel & 0x1f,
  };
}

// Helper to convert RGB888 to expected RGB565 values
function rgb888ToRgb565(r: number, g: number, b: number): { r5: number; g6: number; b5: number } {
  return {
    r5: (r >> 3) & 0x1f,
    g6: (g >> 2) & 0x3f,
    b5: (b >> 3) & 0x1f,
  };
}

describe('ImageProcessor', () => {
  describe('getExpectedImageSize', () => {
    it('should return correct size for LCD dimensions', () => {
      const expected = LCD_WIDTH * LCD_HEIGHT * 2; // RGB565 = 2 bytes per pixel
      expect(ImageProcessor.getExpectedImageSize()).toBe(expected);
    });

    it('should return 10368 for 72x72 LCD', () => {
      // 72 * 72 * 2 = 10368 bytes
      expect(ImageProcessor.getExpectedImageSize()).toBe(10368);
    });
  });

  describe('convertToRGB565', () => {
    it('should convert pure black (0,0,0) to 0x0000', () => {
      const rgb888 = Buffer.from([0, 0, 0]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);
      expect(rgb565.readUInt16LE(0)).toBe(0x0000);
    });

    it('should convert pure white (255,255,255) to 0xFFFF', () => {
      const rgb888 = Buffer.from([255, 255, 255]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);
      expect(rgb565.readUInt16LE(0)).toBe(0xffff);
    });

    it('should convert pure red (255,0,0) correctly', () => {
      const rgb888 = Buffer.from([255, 0, 0]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);
      const pixel = rgb565.readUInt16LE(0);
      // Red: 255 >> 3 = 31 (0x1F), shifted left 11 = 0xF800
      expect(pixel).toBe(0xf800);
    });

    it('should convert pure green (0,255,0) correctly', () => {
      const rgb888 = Buffer.from([0, 255, 0]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);
      const pixel = rgb565.readUInt16LE(0);
      // Green: 255 >> 2 = 63 (0x3F), shifted left 5 = 0x07E0
      expect(pixel).toBe(0x07e0);
    });

    it('should convert pure blue (0,0,255) correctly', () => {
      const rgb888 = Buffer.from([0, 0, 255]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);
      const pixel = rgb565.readUInt16LE(0);
      // Blue: 255 >> 3 = 31 (0x1F)
      expect(pixel).toBe(0x001f);
    });

    it('should handle mid-range gray (128,128,128)', () => {
      const rgb888 = Buffer.from([128, 128, 128]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);
      const { r5, g6, b5 } = readRGB565Pixel(rgb565, 0, 0, 1);

      expect(r5).toBe((128 >> 3) & 0x1f); // 16
      expect(g6).toBe((128 >> 2) & 0x3f); // 32
      expect(b5).toBe((128 >> 3) & 0x1f); // 16
    });

    it('should create correct output buffer size', () => {
      const width = 10;
      const height = 10;
      const rgb888 = Buffer.alloc(width * height * 3); // 3 bytes per pixel input
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, width, height);
      expect(rgb565.length).toBe(width * height * 2); // 2 bytes per pixel output
    });

    it('should handle multiple pixels correctly', () => {
      // Create 2x2 image with distinct colors
      const rgb888 = Buffer.from([
        255, 0, 0, // Red (0,0)
        0, 255, 0, // Green (1,0)
        0, 0, 255, // Blue (0,1)
        255, 255, 0, // Yellow (1,1)
      ]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 2, 2);

      expect(rgb565.readUInt16LE(0)).toBe(0xf800); // Red
      expect(rgb565.readUInt16LE(2)).toBe(0x07e0); // Green
      expect(rgb565.readUInt16LE(4)).toBe(0x001f); // Blue
      // Yellow: R=31<<11 | G=63<<5 | B=0 = 0xFFE0
      expect(rgb565.readUInt16LE(6)).toBe(0xffe0);
    });

    it('should store pixels in little-endian format', () => {
      const rgb888 = Buffer.from([255, 0, 0]); // Pure red = 0xF800
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);

      // Little-endian: LSB first
      expect(rgb565[0]).toBe(0x00); // Low byte of 0xF800
      expect(rgb565[1]).toBe(0xf8); // High byte of 0xF800
    });

    it('should handle 1x1 single pixel image', () => {
      const rgb888 = Buffer.from([100, 150, 200]);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, 1, 1);
      expect(rgb565.length).toBe(2);
    });

    it('should handle LCD dimensions (72x72)', () => {
      const rgb888 = Buffer.alloc(LCD_WIDTH * LCD_HEIGHT * 3, 0x80);
      const rgb565 = ImageProcessor.convertToRGB565(rgb888, LCD_WIDTH, LCD_HEIGHT);
      expect(rgb565.length).toBe(ImageProcessor.getExpectedImageSize());
    });
  });

  describe('createSolidColor', () => {
    it('should create buffer of correct size with default dimensions', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 0, g: 0, b: 0 });
      expect(buffer.length).toBe(ImageProcessor.getExpectedImageSize());
    });

    it('should create buffer of correct size with custom dimensions', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 0, g: 0, b: 0 }, 10, 10);
      expect(buffer.length).toBe(10 * 10 * 2);
    });

    it('should fill all pixels with same value for solid color', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 255, g: 0, b: 0 }, 10, 10);
      const expectedPixel = 0xf800; // Pure red

      for (let i = 0; i < 100; i++) {
        expect(buffer.readUInt16LE(i * 2)).toBe(expectedPixel);
      }
    });

    it('should create pure black (0,0,0) correctly', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 0, g: 0, b: 0 }, 1, 1);
      expect(buffer.readUInt16LE(0)).toBe(0x0000);
    });

    it('should create pure white (255,255,255) correctly', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 255, g: 255, b: 255 }, 1, 1);
      expect(buffer.readUInt16LE(0)).toBe(0xffff);
    });

    it('should create pure red correctly', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 255, g: 0, b: 0 }, 1, 1);
      expect(buffer.readUInt16LE(0)).toBe(0xf800);
    });

    it('should create pure green correctly', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 0, g: 255, b: 0 }, 1, 1);
      expect(buffer.readUInt16LE(0)).toBe(0x07e0);
    });

    it('should create pure blue correctly', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 0, g: 0, b: 255 }, 1, 1);
      expect(buffer.readUInt16LE(0)).toBe(0x001f);
    });

    it('should handle mid-range colors', () => {
      const buffer = ImageProcessor.createSolidColor({ r: 128, g: 128, b: 128 }, 1, 1);
      const { r5, g6, b5 } = readRGB565Pixel(buffer, 0, 0, 1);

      expect(r5).toBe((128 >> 3) & 0x1f);
      expect(g6).toBe((128 >> 2) & 0x3f);
      expect(b5).toBe((128 >> 3) & 0x1f);
    });
  });

  describe('createGradient', () => {
    it('should create buffer of correct size with default dimensions', () => {
      const buffer = ImageProcessor.createGradient();
      expect(buffer.length).toBe(ImageProcessor.getExpectedImageSize());
    });

    it('should create buffer of correct size with custom dimensions', () => {
      const buffer = ImageProcessor.createGradient(10, 10);
      expect(buffer.length).toBe(10 * 10 * 2);
    });

    it('should have top-left corner (0,0) with minimal color', () => {
      const width = 72;
      const buffer = ImageProcessor.createGradient(width, 72);
      const { r5, g6, b5 } = readRGB565Pixel(buffer, 0, 0, width);

      // At (0,0): r = 0/72*255 = 0, g = 0/72*255 = 0, b = 0
      expect(r5).toBe(0);
      expect(g6).toBe(0);
      expect(b5).toBe(0);
    });

    it('should increase red as x increases', () => {
      const width = 72;
      const buffer = ImageProcessor.createGradient(width, 72);

      const { r5: r5_left } = readRGB565Pixel(buffer, 0, 0, width);
      const { r5: r5_right } = readRGB565Pixel(buffer, width - 1, 0, width);

      // Red should be higher on the right
      expect(r5_right).toBeGreaterThan(r5_left);
    });

    it('should increase green as y increases', () => {
      const width = 72;
      const height = 72;
      const buffer = ImageProcessor.createGradient(width, height);

      const { g6: g6_top } = readRGB565Pixel(buffer, 0, 0, width);
      const { g6: g6_bottom } = readRGB565Pixel(buffer, 0, height - 1, width);

      // Green should be higher at the bottom
      expect(g6_bottom).toBeGreaterThan(g6_top);
    });

    it('should increase blue diagonally', () => {
      const width = 72;
      const height = 72;
      const buffer = ImageProcessor.createGradient(width, height);

      const { b5: b5_topLeft } = readRGB565Pixel(buffer, 0, 0, width);
      const { b5: b5_bottomRight } = readRGB565Pixel(buffer, width - 1, height - 1, width);

      // Blue should be higher at bottom-right
      expect(b5_bottomRight).toBeGreaterThan(b5_topLeft);
    });

    it('should produce deterministic results', () => {
      const buffer1 = ImageProcessor.createGradient(10, 10);
      const buffer2 = ImageProcessor.createGradient(10, 10);
      expect(buffer1.equals(buffer2)).toBe(true);
    });
  });

  describe('processImage', () => {
    // Integration test using real sharp library with valid image data
    it('should process a valid solid color PNG and return RGB565 buffer', async () => {
      // Create a minimal 1x1 white PNG (smallest valid PNG)
      // This is a pre-computed valid 1x1 white PNG
      const whitePng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, // bit depth, color type, CRC
        0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk header
        0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0xff, 0x00, // compressed white pixel
        0x05, 0xfe, 0x02, 0xfe, 0xa3, 0x21, 0xcd, 0x47, // CRC
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
        0xae, 0x42, 0x60, 0x82, // IEND CRC
      ]);

      const result = await ImageProcessor.processImage(whitePng);

      // Should be resized to LCD dimensions and converted to RGB565
      expect(result.length).toBe(ImageProcessor.getExpectedImageSize());
    });

    it('should throw error for invalid image data', async () => {
      const invalidData = Buffer.from('not a valid image');

      await expect(ImageProcessor.processImage(invalidData)).rejects.toThrow();
    });
  });

  describe('createTestPattern', () => {
    it('should return RGB565 buffer of expected size', async () => {
      const result = await ImageProcessor.createTestPattern(0);

      expect(result.length).toBe(ImageProcessor.getExpectedImageSize());
    });

    it('should work for different button indices', async () => {
      for (const index of [0, 1, 5]) {
        const result = await ImageProcessor.createTestPattern(index);
        expect(result.length).toBe(ImageProcessor.getExpectedImageSize());
      }
    });
  });

  describe('integration: RGB565 conversion accuracy', () => {
    it('should maintain color distinction between similar colors', () => {
      // Colors that differ by 4 in each channel should produce different RGB565 values
      // because the conversion divides by 8 for R/B and 4 for G
      const colors = [
        { r: 0, g: 0, b: 0 },
        { r: 8, g: 4, b: 8 }, // Minimum difference that changes RGB565
        { r: 255, g: 255, b: 255 },
      ];

      const buffers = colors.map((c) => ImageProcessor.createSolidColor(c, 1, 1));
      const pixels = buffers.map((b) => b.readUInt16LE(0));

      // All should be distinct
      const uniquePixels = new Set(pixels);
      expect(uniquePixels.size).toBe(colors.length);
    });

    it('should handle full-scale color range', () => {
      // Test that extreme values don't overflow or underflow
      const extremes = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
        { r: 255, g: 255, b: 255 },
      ];

      extremes.forEach((color) => {
        const buffer = ImageProcessor.createSolidColor(color, 1, 1);
        const pixel = buffer.readUInt16LE(0);

        // Verify pixel value is within valid 16-bit range
        expect(pixel).toBeGreaterThanOrEqual(0);
        expect(pixel).toBeLessThanOrEqual(0xffff);
      });
    });
  });
});
