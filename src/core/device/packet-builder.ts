/**
 * Packet Builder Utility
 * Constructs HID packets for SOOMFON device communication
 */

/** Standard HID report size for SOOMFON device */
export const REPORT_SIZE = 64;

/** Command identifiers for SOOMFON protocol */
export enum CommandId {
  WAKE_DISPLAY = 0x01,
  CLEAR_SCREEN = 0x02,
  SET_BRIGHTNESS = 0x03,
  REFRESH_SYNC = 0x04,
  SET_IMAGE = 0x10,
  SET_IMAGE_DATA = 0x11,
}

/** Report ID for output commands */
export const OUTPUT_REPORT_ID = 0x00;

/**
 * Creates a base packet buffer with report ID
 * @param reportId - HID report ID (default 0x00)
 * @returns Buffer initialized with report ID
 */
export function createPacket(reportId: number = OUTPUT_REPORT_ID): Buffer {
  const packet = Buffer.alloc(REPORT_SIZE);
  packet[0] = reportId;
  return packet;
}

/**
 * Builds a command packet with optional data payload
 * @param commandId - Command identifier
 * @param data - Optional data bytes
 * @returns Complete packet buffer
 */
export function buildCommandPacket(
  commandId: CommandId,
  data?: number[] | Buffer
): Buffer {
  const packet = createPacket();
  packet[1] = commandId;

  if (data) {
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    dataBuffer.copy(packet, 2, 0, Math.min(dataBuffer.length, REPORT_SIZE - 2));
  }

  return packet;
}

/**
 * Builds wake display command packet
 * Wakes the device display from sleep/standby mode
 * @returns Wake display packet
 */
export function buildWakeDisplayPacket(): Buffer {
  return buildCommandPacket(CommandId.WAKE_DISPLAY);
}

/**
 * Builds clear screen command packet
 * Clears all button displays to black
 * @param buttonIndex - Optional specific button to clear (undefined = all)
 * @returns Clear screen packet
 */
export function buildClearScreenPacket(buttonIndex?: number): Buffer {
  const data = buttonIndex !== undefined ? [buttonIndex] : [];
  return buildCommandPacket(CommandId.CLEAR_SCREEN, data);
}

/**
 * Builds brightness control packet
 * @param level - Brightness level (0-100)
 * @returns Brightness control packet
 */
export function buildBrightnessPacket(level: number): Buffer {
  const clampedLevel = Math.max(0, Math.min(100, Math.round(level)));
  return buildCommandPacket(CommandId.SET_BRIGHTNESS, [clampedLevel]);
}

/**
 * Builds refresh/sync command packet
 * Forces device to refresh display state
 * @returns Refresh sync packet
 */
export function buildRefreshSyncPacket(): Buffer {
  return buildCommandPacket(CommandId.REFRESH_SYNC);
}

/**
 * Builds image header packet
 * @param buttonIndex - Target button index
 * @param imageSize - Total image data size in bytes
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Image header packet
 */
export function buildImageHeaderPacket(
  buttonIndex: number,
  imageSize: number,
  width: number,
  height: number
): Buffer {
  const packet = createPacket();
  packet[1] = CommandId.SET_IMAGE;
  packet[2] = buttonIndex;
  // Image size as 32-bit little-endian
  packet.writeUInt32LE(imageSize, 3);
  // Dimensions as 16-bit little-endian
  packet.writeUInt16LE(width, 7);
  packet.writeUInt16LE(height, 9);
  return packet;
}

/**
 * Builds image data chunk packet
 * @param sequenceNumber - Chunk sequence number
 * @param data - Image data chunk
 * @param isLast - Whether this is the last chunk
 * @returns Image data packet
 */
export function buildImageDataPacket(
  sequenceNumber: number,
  data: Buffer,
  isLast: boolean
): Buffer {
  const packet = createPacket();
  packet[1] = CommandId.SET_IMAGE_DATA;
  packet.writeUInt16LE(sequenceNumber, 2);
  packet[4] = isLast ? 1 : 0;

  // Copy image data (max payload is REPORT_SIZE - 5)
  const maxPayload = REPORT_SIZE - 5;
  data.copy(packet, 5, 0, Math.min(data.length, maxPayload));

  return packet;
}

/**
 * Calculates checksum for packet validation
 * @param packet - Packet buffer
 * @returns 8-bit checksum
 */
export function calculateChecksum(packet: Buffer): number {
  let sum = 0;
  for (let i = 0; i < packet.length; i++) {
    sum = (sum + packet[i]) & 0xff;
  }
  return sum;
}

/**
 * Validates packet structure
 * @param packet - Packet to validate
 * @returns True if packet is valid
 */
export function isValidPacket(packet: Buffer): boolean {
  if (!packet || packet.length !== REPORT_SIZE) {
    return false;
  }
  return true;
}
