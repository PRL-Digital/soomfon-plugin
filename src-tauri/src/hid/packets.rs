//! HID Packet Builder
//!
//! Functions for building HID packets for SOOMFON device communication.
//! Based on the protocol defined in the Electron implementation.

use super::types::REPORT_SIZE;

/// Command IDs for SOOMFON protocol
pub mod commands {
    pub const WAKE_DISPLAY: u8 = 0x01;
    pub const CLEAR_SCREEN: u8 = 0x02;
    pub const SET_BRIGHTNESS: u8 = 0x03;
    pub const REFRESH_SYNC: u8 = 0x04;
    pub const IMAGE_HEADER: u8 = 0x10;
    pub const IMAGE_DATA: u8 = 0x11;
}

/// Build a wake display packet
pub fn build_wake_display_packet() -> [u8; REPORT_SIZE] {
    let mut packet = [0u8; REPORT_SIZE];
    packet[0] = 0x00; // Report ID
    packet[1] = commands::WAKE_DISPLAY;
    packet
}

/// Build a clear screen packet
/// If button_index is None, clears all buttons
pub fn build_clear_screen_packet(button_index: Option<u8>) -> [u8; REPORT_SIZE] {
    let mut packet = [0u8; REPORT_SIZE];
    packet[0] = 0x00; // Report ID
    packet[1] = commands::CLEAR_SCREEN;
    packet[2] = button_index.map(|i| i + 1).unwrap_or(0); // 0 = all, 1-6 = specific button
    packet
}

/// Build a brightness control packet
/// Level: 0-100
pub fn build_brightness_packet(level: u8) -> [u8; REPORT_SIZE] {
    let mut packet = [0u8; REPORT_SIZE];
    packet[0] = 0x00; // Report ID
    packet[1] = commands::SET_BRIGHTNESS;
    packet[2] = level.min(100); // Clamp to 0-100
    packet
}

/// Build a refresh/sync packet
pub fn build_refresh_sync_packet() -> [u8; REPORT_SIZE] {
    let mut packet = [0u8; REPORT_SIZE];
    packet[0] = 0x00; // Report ID
    packet[1] = commands::REFRESH_SYNC;
    packet
}

/// Build an image header packet
/// This packet initiates image transfer to a button's LCD
pub fn build_image_header_packet(
    button_index: u8,
    data_length: u32,
    width: u16,
    height: u16,
) -> [u8; REPORT_SIZE] {
    let mut packet = [0u8; REPORT_SIZE];
    packet[0] = 0x00; // Report ID
    packet[1] = commands::IMAGE_HEADER;
    packet[2] = button_index;

    // Data length as little-endian u32
    let len_bytes = data_length.to_le_bytes();
    packet[3..7].copy_from_slice(&len_bytes);

    // Width as little-endian u16
    let width_bytes = width.to_le_bytes();
    packet[7..9].copy_from_slice(&width_bytes);

    // Height as little-endian u16
    let height_bytes = height.to_le_bytes();
    packet[9..11].copy_from_slice(&height_bytes);

    // Calculate checksum (sum of all data bytes)
    let checksum: u8 = packet[1..11].iter().fold(0u8, |acc, &x| acc.wrapping_add(x));
    packet[11] = checksum;

    packet
}

/// Build an image data packet
/// Used to send chunks of image data after the header
pub fn build_image_data_packet(
    sequence_number: u16,
    data: &[u8],
    is_last: bool,
) -> [u8; REPORT_SIZE] {
    let mut packet = [0u8; REPORT_SIZE];
    packet[0] = 0x00; // Report ID
    packet[1] = commands::IMAGE_DATA;

    // Sequence number as little-endian u16
    let seq_bytes = sequence_number.to_le_bytes();
    packet[2..4].copy_from_slice(&seq_bytes);

    // Flags: bit 0 = is_last
    packet[4] = if is_last { 0x01 } else { 0x00 };

    // Data length (max 58 bytes per packet: 64 - 6 header bytes)
    let max_data_len = REPORT_SIZE - 6;
    let data_len = data.len().min(max_data_len);
    packet[5] = data_len as u8;

    // Copy data
    packet[6..6 + data_len].copy_from_slice(&data[..data_len]);

    packet
}

/// Calculate the number of packets needed for image data
pub fn calculate_packet_count(data_length: usize) -> usize {
    let bytes_per_packet = REPORT_SIZE - 6; // 58 bytes
    (data_length + bytes_per_packet - 1) / bytes_per_packet
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wake_display_packet() {
        let packet = build_wake_display_packet();
        assert_eq!(packet[0], 0x00); // Report ID
        assert_eq!(packet[1], commands::WAKE_DISPLAY);
    }

    #[test]
    fn test_clear_screen_all() {
        let packet = build_clear_screen_packet(None);
        assert_eq!(packet[1], commands::CLEAR_SCREEN);
        assert_eq!(packet[2], 0); // All buttons
    }

    #[test]
    fn test_clear_screen_specific() {
        let packet = build_clear_screen_packet(Some(2));
        assert_eq!(packet[1], commands::CLEAR_SCREEN);
        assert_eq!(packet[2], 3); // Button 2 -> index 3 (1-based)
    }

    #[test]
    fn test_brightness_packet() {
        let packet = build_brightness_packet(75);
        assert_eq!(packet[1], commands::SET_BRIGHTNESS);
        assert_eq!(packet[2], 75);
    }

    #[test]
    fn test_brightness_clamping() {
        let packet = build_brightness_packet(150);
        assert_eq!(packet[2], 100); // Clamped to max
    }

    #[test]
    fn test_image_header_packet() {
        let packet = build_image_header_packet(0, 10368, 72, 72);
        assert_eq!(packet[1], commands::IMAGE_HEADER);
        assert_eq!(packet[2], 0); // Button index

        // Check data length (little-endian)
        let len = u32::from_le_bytes([packet[3], packet[4], packet[5], packet[6]]);
        assert_eq!(len, 10368);

        // Check dimensions
        let width = u16::from_le_bytes([packet[7], packet[8]]);
        let height = u16::from_le_bytes([packet[9], packet[10]]);
        assert_eq!(width, 72);
        assert_eq!(height, 72);
    }

    #[test]
    fn test_image_data_packet() {
        let data = vec![0xAB; 50];
        let packet = build_image_data_packet(5, &data, false);

        assert_eq!(packet[1], commands::IMAGE_DATA);

        // Check sequence number
        let seq = u16::from_le_bytes([packet[2], packet[3]]);
        assert_eq!(seq, 5);

        // Check flags
        assert_eq!(packet[4], 0x00); // Not last

        // Check data length
        assert_eq!(packet[5], 50);

        // Check data content
        assert_eq!(&packet[6..56], &data[..]);
    }

    #[test]
    fn test_image_data_packet_last() {
        let data = vec![0xCD; 30];
        let packet = build_image_data_packet(10, &data, true);

        assert_eq!(packet[4], 0x01); // Is last
        assert_eq!(packet[5], 30);
    }

    #[test]
    fn test_calculate_packet_count() {
        // 72x72 RGB565 = 10368 bytes, 58 bytes per packet
        assert_eq!(calculate_packet_count(10368), 179);
        assert_eq!(calculate_packet_count(58), 1);
        assert_eq!(calculate_packet_count(59), 2);
        assert_eq!(calculate_packet_count(0), 0);
    }
}
