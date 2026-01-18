//! HID Packet Builder
//!
//! Functions for building CRT command packets and parsing ACK response packets
//! for SOOMFON device communication.
//!
//! Protocol based on reverse-engineered USB captures from usb-protocol-reverse-engineering.md

use super::types::{RawEvent, CRT_PACKET_SIZE};

// =============================================================================
// CRT Command Packet Builders
// =============================================================================

/// Build a CRT..DIS packet (Display initialization)
///
/// This command initializes the device display system.
/// Should be sent as part of the initialization sequence.
pub fn build_display_init_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // packet[3..5] are already 0x00
    // Command: DIS
    packet[5..8].copy_from_slice(b"DIS");
    packet
}

/// Build a CRT..LIG packet (Set brightness)
///
/// # Arguments
/// * `level` - Brightness level (0-100)
///
/// This command sets the display brightness.
pub fn build_brightness_packet(level: u8) -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: LIG
    packet[5..8].copy_from_slice(b"LIG");
    // Brightness value at offset 10 (0x0A)
    packet[10] = level.min(100);
    packet
}

/// Build a CRT..QUCMD packet (Quick Command setup)
///
/// This command configures quick command settings.
/// The exact meaning of parameters is not fully documented.
/// Parameters observed in official software: 11 11 00 11 00 11
pub fn build_quick_command_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: QUCMD
    packet[5..10].copy_from_slice(b"QUCMD");
    // Parameters at offset 10-15
    packet[10] = 0x11;
    packet[11] = 0x11;
    packet[12] = 0x00;
    packet[13] = 0x11;
    packet[14] = 0x00;
    packet[15] = 0x11;
    packet
}

/// Build a CRT..CONNECT packet (Connection/keepalive)
///
/// This command maintains the connection to the device.
/// Should be sent periodically (every ~10 seconds) to keep device active.
pub fn build_connect_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: CONNECT
    packet[5..12].copy_from_slice(b"CONNECT");
    packet
}

/// Build a CRT..STP packet (Stop/Commit)
///
/// This command finalizes/commits pending operations.
/// CRITICAL for enabling button event mode - must be sent after DIS and LIG.
/// Discovered from mirajazz library reverse engineering.
pub fn build_stp_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: STP
    packet[5..8].copy_from_slice(b"STP");
    packet
}

/// Build a CRT..CLE packet (Clear screens - simple version)
///
/// This command clears the LCD screens.
/// CRITICAL for enabling button event mode - must be sent during initialization.
/// This is a simpler version than CLE.DC used in shutdown sequence.
pub fn build_clear_screens_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: CLE
    packet[5..8].copy_from_slice(b"CLE");
    packet
}

/// Build a CRT..CLE.DC packet (Clear LCD displays)
///
/// This command clears the LCD button displays.
/// Part of the shutdown sequence.
pub fn build_clear_lcd_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: CLE + null + DC
    packet[5..8].copy_from_slice(b"CLE");
    // packet[8] is 0x00
    packet[9..11].copy_from_slice(b"DC");
    packet
}

/// Build a CRT..CLB.DC packet (Clear button states)
///
/// This command clears button states.
/// Part of the shutdown sequence.
pub fn build_clear_buttons_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: CLB + null + DC
    packet[5..8].copy_from_slice(b"CLB");
    // packet[8] is 0x00
    packet[9..11].copy_from_slice(b"DC");
    packet
}

/// Build a CRT..HAH packet (Halt/shutdown device)
///
/// This command shuts down the device.
/// Should be the last command in the shutdown sequence.
pub fn build_halt_packet() -> [u8; CRT_PACKET_SIZE] {
    let mut packet = [0u8; CRT_PACKET_SIZE];
    // Header: CRT + 2 null bytes
    packet[0..3].copy_from_slice(b"CRT");
    // Command: HAH
    packet[5..8].copy_from_slice(b"HAH");
    packet
}

// =============================================================================
// ACK Response Packet Parser
// =============================================================================

/// ACK packet header signature
const ACK_HEADER: &[u8] = b"ACK";
/// ACK OK signature
const ACK_OK: &[u8] = b"OK";

/// Parse an ACK packet to extract event information
///
/// ACK packet structure (from reverse engineering):
/// - Offset 0-2: "ACK" header
/// - Offset 3-4: Padding (0x00)
/// - Offset 5-6: "OK"
/// - Offset 7-8: Padding (0x00)
/// - Offset 9: Event ID
/// - Offset 10: State (0x01 = press, 0x00 = release)
///
/// Returns `Some(RawEvent)` if valid ACK packet with event, `None` otherwise.
pub fn parse_ack_packet(data: &[u8]) -> Option<RawEvent> {
    // Minimum length check
    if data.len() < 11 {
        return None;
    }

    // Check ACK header
    if &data[0..3] != ACK_HEADER {
        return None;
    }

    // Check OK signature
    if &data[5..7] != ACK_OK {
        return None;
    }

    // Extract event data
    let event_id = data[9];
    let state = data[10];

    // Ignore empty events
    if event_id == 0x00 {
        return None;
    }

    Some(RawEvent { event_id, state })
}

/// Check if a packet is a valid ACK response (even without an event)
pub fn is_ack_response(data: &[u8]) -> bool {
    data.len() >= 7 && &data[0..3] == ACK_HEADER && &data[5..7] == ACK_OK
}

/// Check if a packet is a CRT response
pub fn is_crt_response(data: &[u8]) -> bool {
    data.len() >= 3 && &data[0..3] == b"CRT"
}

// =============================================================================
// Image Transfer (placeholder - needs more reverse engineering)
// =============================================================================

/// Build an image transfer header packet
///
/// Note: Image transfer protocol is not fully reverse-engineered yet.
/// The device accepts JPEG images, but the exact command format needs verification.
pub fn build_image_header_packet(
    _button_index: u8,
    _data_length: u32,
    _width: u16,
    _height: u16,
) -> [u8; CRT_PACKET_SIZE] {
    // TODO: Implement based on further reverse engineering
    // The device accepts JPEG images with FF D8 FF E0 magic bytes
    [0u8; CRT_PACKET_SIZE]
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_init_packet_format() {
        let packet = build_display_init_packet();
        assert_eq!(&packet[0..3], b"CRT");
        assert_eq!(packet[3], 0x00);
        assert_eq!(packet[4], 0x00);
        assert_eq!(&packet[5..8], b"DIS");
    }

    #[test]
    fn test_brightness_packet_format() {
        let packet = build_brightness_packet(75);
        assert_eq!(&packet[0..3], b"CRT");
        assert_eq!(&packet[5..8], b"LIG");
        assert_eq!(packet[10], 75);
    }

    #[test]
    fn test_brightness_packet_clamped() {
        let packet = build_brightness_packet(150);
        assert_eq!(packet[10], 100); // Clamped to max
    }

    #[test]
    fn test_quick_command_packet_format() {
        let packet = build_quick_command_packet();
        assert_eq!(&packet[0..3], b"CRT");
        assert_eq!(&packet[5..10], b"QUCMD");
        assert_eq!(packet[10], 0x11);
        assert_eq!(packet[11], 0x11);
        assert_eq!(packet[12], 0x00);
        assert_eq!(packet[13], 0x11);
        assert_eq!(packet[14], 0x00);
        assert_eq!(packet[15], 0x11);
    }

    #[test]
    fn test_connect_packet_format() {
        let packet = build_connect_packet();
        assert_eq!(&packet[0..3], b"CRT");
        assert_eq!(&packet[5..12], b"CONNECT");
    }

    #[test]
    fn test_clear_lcd_packet_format() {
        let packet = build_clear_lcd_packet();
        assert_eq!(&packet[0..3], b"CRT");
        assert_eq!(&packet[5..8], b"CLE");
        assert_eq!(packet[8], 0x00);
        assert_eq!(&packet[9..11], b"DC");
    }

    #[test]
    fn test_clear_buttons_packet_format() {
        let packet = build_clear_buttons_packet();
        assert_eq!(&packet[0..3], b"CRT");
        assert_eq!(&packet[5..8], b"CLB");
        assert_eq!(packet[8], 0x00);
        assert_eq!(&packet[9..11], b"DC");
    }

    #[test]
    fn test_halt_packet_format() {
        let packet = build_halt_packet();
        assert_eq!(&packet[0..3], b"CRT");
        assert_eq!(&packet[5..8], b"HAH");
    }

    #[test]
    fn test_parse_ack_button_press() {
        // Sample button 1 press event from capture
        let mut data = [0u8; ACK_PACKET_SIZE];
        data[0..3].copy_from_slice(b"ACK");
        data[5..7].copy_from_slice(b"OK");
        data[9] = 0x01; // Button 1
        data[10] = 0x01; // Press

        let event = parse_ack_packet(&data).unwrap();
        assert_eq!(event.event_id, 0x01);
        assert_eq!(event.state, 0x01);
    }

    #[test]
    fn test_parse_ack_encoder_rotation() {
        // Sample dial left event from capture
        let mut data = [0u8; ACK_PACKET_SIZE];
        data[0..3].copy_from_slice(b"ACK");
        data[5..7].copy_from_slice(b"OK");
        data[9] = 0x51; // Dial right (CW)
        data[10] = 0x00; // Rotation tick (always 0)

        let event = parse_ack_packet(&data).unwrap();
        assert_eq!(event.event_id, 0x51);
        assert_eq!(event.state, 0x00);
    }

    #[test]
    fn test_parse_ack_invalid_header() {
        let data = [0u8; ACK_PACKET_SIZE];
        assert!(parse_ack_packet(&data).is_none());
    }

    #[test]
    fn test_parse_ack_too_short() {
        let data = [0u8; 5];
        assert!(parse_ack_packet(&data).is_none());
    }

    #[test]
    fn test_parse_ack_empty_event() {
        let mut data = [0u8; ACK_PACKET_SIZE];
        data[0..3].copy_from_slice(b"ACK");
        data[5..7].copy_from_slice(b"OK");
        data[9] = 0x00; // No event
        data[10] = 0x00;

        assert!(parse_ack_packet(&data).is_none());
    }

    #[test]
    fn test_is_ack_response() {
        let mut data = [0u8; ACK_PACKET_SIZE];
        data[0..3].copy_from_slice(b"ACK");
        data[5..7].copy_from_slice(b"OK");

        assert!(is_ack_response(&data));
        assert!(!is_ack_response(&[0u8; 10]));
    }

    #[test]
    fn test_is_crt_response() {
        let mut data = [0u8; 10];
        data[0..3].copy_from_slice(b"CRT");

        assert!(is_crt_response(&data));
        assert!(!is_crt_response(&[0u8; 10]));
    }

    #[test]
    fn test_packet_size_is_1024() {
        assert_eq!(build_display_init_packet().len(), 1024);
        assert_eq!(build_brightness_packet(50).len(), 1024);
        assert_eq!(build_connect_packet().len(), 1024);
    }
}
