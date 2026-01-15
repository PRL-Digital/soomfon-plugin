/**
 * Image Processor
 * Converts images to device-compatible format for LCD button display
 */

import sharp from 'sharp';
import { LCD_WIDTH, LCD_HEIGHT } from '../../shared/types/device';

/** Image input can be file path or buffer */
export type ImageInput = string | Buffer;

/** Image processing options */
export interface ImageProcessorOptions {
  width?: number;
  height?: number;
  rotate?: number;
  flipH?: boolean;
  flipV?: boolean;
  fit?: 'cover' | 'contain' | 'fill';
  background?: { r: number; g: number; b: number };
}

/** Default processing options */
const DEFAULT_OPTIONS: ImageProcessorOptions = {
  width: LCD_WIDTH,
  height: LCD_HEIGHT,
  rotate: 0,
  flipH: false,
  flipV: false,
  fit: 'cover',
  background: { r: 0, g: 0, b: 0 },
};

/**
 * Image Processor class for converting images to device format
 */
export class ImageProcessor {
  /**
   * Process image and convert to RGB565 format for device LCD
   * @param input - Image file path or buffer
   * @param options - Processing options
   * @returns Buffer containing RGB565 pixel data
   */
  static async processImage(
    input: ImageInput,
    options: ImageProcessorOptions = {}
  ): Promise<Buffer> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let image = sharp(input);

    // Apply rotation if needed
    if (opts.rotate && opts.rotate !== 0) {
      image = image.rotate(opts.rotate);
    }

    // Resize to target dimensions
    image = image.resize(opts.width, opts.height, {
      fit: opts.fit,
      background: opts.background,
    });

    // Apply flips if needed
    if (opts.flipH) {
      image = image.flop();
    }
    if (opts.flipV) {
      image = image.flip();
    }

    // Get raw RGB data
    const { data, info } = await image
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert RGB888 to RGB565
    return ImageProcessor.convertToRGB565(data, info.width, info.height);
  }

  /**
   * Convert RGB888 buffer to RGB565 format
   * RGB565: 5 bits red, 6 bits green, 5 bits blue (16 bits total)
   */
  static convertToRGB565(rgb888: Buffer, width: number, height: number): Buffer {
    const pixelCount = width * height;
    const rgb565 = Buffer.alloc(pixelCount * 2);

    for (let i = 0; i < pixelCount; i++) {
      const srcOffset = i * 3;
      const dstOffset = i * 2;

      const r = rgb888[srcOffset];
      const g = rgb888[srcOffset + 1];
      const b = rgb888[srcOffset + 2];

      // Convert to RGB565 (5-6-5 bits)
      const r5 = (r >> 3) & 0x1f;
      const g6 = (g >> 2) & 0x3f;
      const b5 = (b >> 3) & 0x1f;

      // Pack as 16-bit little-endian
      const pixel = (r5 << 11) | (g6 << 5) | b5;
      rgb565.writeUInt16LE(pixel, dstOffset);
    }

    return rgb565;
  }

  /**
   * Create a solid color image
   * @param color - RGB color
   * @param width - Image width
   * @param height - Image height
   * @returns RGB565 buffer
   */
  static createSolidColor(
    color: { r: number; g: number; b: number },
    width: number = LCD_WIDTH,
    height: number = LCD_HEIGHT
  ): Buffer {
    const pixelCount = width * height;
    const rgb565 = Buffer.alloc(pixelCount * 2);

    // Convert color to RGB565
    const r5 = (color.r >> 3) & 0x1f;
    const g6 = (color.g >> 2) & 0x3f;
    const b5 = (color.b >> 3) & 0x1f;
    const pixel = (r5 << 11) | (g6 << 5) | b5;

    // Fill buffer
    for (let i = 0; i < pixelCount; i++) {
      rgb565.writeUInt16LE(pixel, i * 2);
    }

    return rgb565;
  }

  /**
   * Create a gradient image (for testing)
   * @param width - Image width
   * @param height - Image height
   * @returns RGB565 buffer
   */
  static createGradient(
    width: number = LCD_WIDTH,
    height: number = LCD_HEIGHT
  ): Buffer {
    const pixelCount = width * height;
    const rgb565 = Buffer.alloc(pixelCount * 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;

        // Create RGB gradient based on position
        const r = Math.floor((x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = Math.floor(((x + y) / (width + height)) * 255);

        // Convert to RGB565
        const r5 = (r >> 3) & 0x1f;
        const g6 = (g >> 2) & 0x3f;
        const b5 = (b >> 3) & 0x1f;
        const pixel = (r5 << 11) | (g6 << 5) | b5;

        rgb565.writeUInt16LE(pixel, i * 2);
      }
    }

    return rgb565;
  }

  /**
   * Create a test pattern image (for testing)
   * Creates a pattern with button index number
   * @param buttonIndex - Button index to display
   * @returns RGB565 buffer
   */
  static async createTestPattern(buttonIndex: number): Promise<Buffer> {
    // Create SVG with button number
    const svg = `
      <svg width="${LCD_WIDTH}" height="${LCD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#333"/>
        <rect x="4" y="4" width="${LCD_WIDTH - 8}" height="${LCD_HEIGHT - 8}"
              fill="none" stroke="#0af" stroke-width="2" rx="8"/>
        <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
              font-family="Arial" font-size="32" font-weight="bold" fill="#fff">
          ${buttonIndex}
        </text>
      </svg>
    `;

    return ImageProcessor.processImage(Buffer.from(svg));
  }

  /**
   * Get expected image buffer size for device LCD
   */
  static getExpectedImageSize(): number {
    return LCD_WIDTH * LCD_HEIGHT * 2; // RGB565 = 2 bytes per pixel
  }
}
