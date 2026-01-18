//! HID Type Definitions
//!
//! Contains constants and types for SOOMFON HID device communication.
//! Based on reverse-engineered USB protocol from usb-protocol-reverse-engineering.md

use serde::{Deserialize, Serialize};

// =============================================================================
// Device Identification
// =============================================================================

/// SOOMFON device Vendor ID
pub const SOOMFON_VID: u16 = 0x1500;

/// SOOMFON device Product ID
pub const SOOMFON_PID: u16 = 0x3001;

/// Vendor usage page for control interface
pub const VENDOR_USAGE_PAGE: u16 = 0xffa0;

/// Keyboard usage page for input interface
pub const KEYBOARD_USAGE_PAGE: u16 = 0x0001;

/// Keyboard usage for input interface
pub const KEYBOARD_USAGE: u16 = 0x0006;

// =============================================================================
// USB Protocol Constants (from reverse engineering)
// =============================================================================

/// Endpoint for receiving ACK packets (events from device)
pub const EP_IN: u8 = 0x82;

/// Endpoint for sending CRT command packets (commands to device)
pub const EP_OUT: u8 = 0x03;

/// CRT command packet size (sent to device)
pub const CRT_PACKET_SIZE: usize = 1024;

/// ACK response packet size (received from device)
pub const ACK_PACKET_SIZE: usize = 512;

/// HID Feature Report buffer size
pub const FEATURE_REPORT_SIZE: usize = 512;

/// USB Interface number for vendor protocol
pub const VENDOR_INTERFACE: u8 = 0;

/// Legacy report size (kept for hidapi compatibility)
pub const REPORT_SIZE: usize = 64;

// =============================================================================
// LCD Display Constants
// =============================================================================

/// LCD button dimensions (pixels)
pub const LCD_WIDTH: u32 = 72;
pub const LCD_HEIGHT: u32 = 72;

// =============================================================================
// Timing Constants
// =============================================================================

/// USB timeout in milliseconds
pub const USB_TIMEOUT_MS: u64 = 500;

/// Polling interval in milliseconds
pub const POLL_INTERVAL_MS: u64 = 1;

/// Long press detection threshold in milliseconds
pub const LONG_PRESS_THRESHOLD_MS: u64 = 500;

/// Debounce time in milliseconds
pub const DEBOUNCE_MS: u64 = 50;

/// Reconnect interval in milliseconds
pub const RECONNECT_INTERVAL_MS: u64 = 2000;

/// Keep-alive interval in milliseconds (for CRT..CONNECT packets)
pub const KEEPALIVE_INTERVAL_MS: u64 = 10000;

// =============================================================================
// Event ID Mapping (from reverse engineering)
// =============================================================================

/// Event IDs for LCD buttons (1-6)
pub mod lcd_buttons {
    pub const BUTTON_1: u8 = 0x01;
    pub const BUTTON_2: u8 = 0x02;
    pub const BUTTON_3: u8 = 0x03;
    pub const BUTTON_4: u8 = 0x04;
    pub const BUTTON_5: u8 = 0x05;
    pub const BUTTON_6: u8 = 0x06;
}

/// Event IDs for small physical buttons (no display)
pub mod small_buttons {
    pub const BUTTON_1: u8 = 0x25; // '%'
    pub const BUTTON_2: u8 = 0x30; // '0'
    pub const BUTTON_3: u8 = 0x31; // '1'
}

/// Event IDs for main encoder (Dial 1 - large center dial)
pub mod main_encoder {
    pub const ROTATE_CCW: u8 = 0x50; // 'P' - Counter-clockwise
    pub const ROTATE_CW: u8 = 0x51;  // 'Q' - Clockwise
    pub const PUSH: u8 = 0x35;       // '5' - Push/press
}

/// Event IDs for side encoder 1 (Dial 2 - small)
pub mod side_encoder_1 {
    pub const ROTATE_CCW: u8 = 0x90; // Counter-clockwise
    pub const ROTATE_CW: u8 = 0x91;  // Clockwise
    pub const PUSH: u8 = 0x33;       // '3' - Push/press
}

/// Event IDs for side encoder 2 (Dial 3 - small)
pub mod side_encoder_2 {
    pub const ROTATE_CCW: u8 = 0x60; // '`' - Counter-clockwise
    pub const ROTATE_CW: u8 = 0x61;  // 'a' - Clockwise
    pub const PUSH: u8 = 0x34;       // '4' - Push/press
}

/// Event states
pub mod event_state {
    pub const RELEASE: u8 = 0x00;
    pub const PRESS: u8 = 0x01;
}

// =============================================================================
// Types
// =============================================================================

/// Connection state of the HID device
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionState {
    /// Not connected to any device
    #[default]
    Disconnected,
    /// Currently attempting to connect
    Connecting,
    /// Successfully connected to device
    Connected,
    /// Device initialized and ready for events
    Initialized,
    /// Connection error occurred
    Error,
}

/// Information about a connected SOOMFON device
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    /// Device path (platform-specific)
    pub path: String,
    /// Device serial number
    pub serial_number: Option<String>,
    /// Manufacturer name
    pub manufacturer: Option<String>,
    /// Product name
    pub product: Option<String>,
    /// Firmware version (from HID feature report)
    pub firmware_version: Option<String>,
}

/// Event types from button interactions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ButtonEventType {
    Press,
    Release,
    LongPress,
}

/// Event types from encoder interactions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EncoderEventType {
    RotateCW,
    RotateCCW,
    Press,
    Release,
    LongPress,
}

/// Button type classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ButtonType {
    /// LCD button with display (1-6)
    Lcd,
    /// Small physical button without display (1-3)
    Physical,
}

/// Encoder identification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EncoderType {
    /// Main encoder (large center dial)
    Main,
    /// Side encoder 1 (small dial)
    Side1,
    /// Side encoder 2 (small dial)
    Side2,
}

/// Device event from SOOMFON hardware
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DeviceEvent {
    /// Button press/release event
    Button {
        /// Button index (0-5 for LCD, 0-2 for physical)
        index: u8,
        /// Type of button
        button_type: ButtonType,
        /// Event type
        event_type: ButtonEventType,
    },
    /// Encoder rotation/press event
    Encoder {
        /// Encoder identification
        encoder_type: EncoderType,
        /// Event type
        event_type: EncoderEventType,
    },
}

/// Raw ACK packet event data
#[derive(Debug, Clone, Copy)]
pub struct RawEvent {
    /// Event ID byte from ACK packet
    pub event_id: u8,
    /// State byte (press/release)
    pub state: u8,
}

impl RawEvent {
    /// Parse raw event into a DeviceEvent
    pub fn parse(&self) -> Option<DeviceEvent> {
        let is_press = self.state == event_state::PRESS;

        // Check LCD buttons (0x01-0x06)
        if (lcd_buttons::BUTTON_1..=lcd_buttons::BUTTON_6).contains(&self.event_id) {
            let index = self.event_id - lcd_buttons::BUTTON_1;
            return Some(DeviceEvent::Button {
                index,
                button_type: ButtonType::Lcd,
                event_type: if is_press {
                    ButtonEventType::Press
                } else {
                    ButtonEventType::Release
                },
            });
        }

        // Check small buttons
        let small_button_index = match self.event_id {
            small_buttons::BUTTON_1 => Some(0),
            small_buttons::BUTTON_2 => Some(1),
            small_buttons::BUTTON_3 => Some(2),
            _ => None,
        };
        if let Some(index) = small_button_index {
            return Some(DeviceEvent::Button {
                index,
                button_type: ButtonType::Physical,
                event_type: if is_press {
                    ButtonEventType::Press
                } else {
                    ButtonEventType::Release
                },
            });
        }

        // Check main encoder
        match self.event_id {
            main_encoder::ROTATE_CCW => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Main,
                    event_type: EncoderEventType::RotateCCW,
                });
            }
            main_encoder::ROTATE_CW => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Main,
                    event_type: EncoderEventType::RotateCW,
                });
            }
            main_encoder::PUSH => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Main,
                    event_type: if is_press {
                        EncoderEventType::Press
                    } else {
                        EncoderEventType::Release
                    },
                });
            }
            _ => {}
        }

        // Check side encoder 1
        match self.event_id {
            side_encoder_1::ROTATE_CCW => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Side1,
                    event_type: EncoderEventType::RotateCCW,
                });
            }
            side_encoder_1::ROTATE_CW => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Side1,
                    event_type: EncoderEventType::RotateCW,
                });
            }
            side_encoder_1::PUSH => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Side1,
                    event_type: if is_press {
                        EncoderEventType::Press
                    } else {
                        EncoderEventType::Release
                    },
                });
            }
            _ => {}
        }

        // Check side encoder 2
        match self.event_id {
            side_encoder_2::ROTATE_CCW => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Side2,
                    event_type: EncoderEventType::RotateCCW,
                });
            }
            side_encoder_2::ROTATE_CW => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Side2,
                    event_type: EncoderEventType::RotateCW,
                });
            }
            side_encoder_2::PUSH => {
                return Some(DeviceEvent::Encoder {
                    encoder_type: EncoderType::Side2,
                    event_type: if is_press {
                        EncoderEventType::Press
                    } else {
                        EncoderEventType::Release
                    },
                });
            }
            _ => {}
        }

        None
    }
}

/// Result of HID operations
pub type HidResult<T> = Result<T, HidError>;

/// HID-specific error types
#[derive(Debug, thiserror::Error)]
pub enum HidError {
    #[error("Device not found")]
    DeviceNotFound,

    #[error("Device not connected")]
    NotConnected,

    #[error("Device not initialized - call initialize() first")]
    NotInitialized,

    #[error("Failed to open device: {0}")]
    OpenFailed(String),

    #[error("Failed to claim interface: {0}")]
    ClaimFailed(String),

    #[error("Failed to write to device: {0}")]
    WriteFailed(String),

    #[error("Failed to read from device: {0}")]
    ReadFailed(String),

    #[error("Invalid data: {0}")]
    InvalidData(String),

    #[error("Connection lost")]
    ConnectionLost,

    #[error("Timeout")]
    Timeout,

    #[error("USB error: {0}")]
    UsbError(String),
}

impl From<rusb::Error> for HidError {
    fn from(e: rusb::Error) -> Self {
        match e {
            rusb::Error::NotFound => HidError::DeviceNotFound,
            rusb::Error::NoDevice => HidError::ConnectionLost,
            rusb::Error::Timeout => HidError::Timeout,
            rusb::Error::Access => HidError::OpenFailed("Access denied".to_string()),
            rusb::Error::Busy => HidError::OpenFailed("Device busy".to_string()),
            _ => HidError::UsbError(e.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_soomfon_vid_is_correct() {
        assert_eq!(SOOMFON_VID, 0x1500);
    }

    #[test]
    fn test_soomfon_pid_is_correct() {
        assert_eq!(SOOMFON_PID, 0x3001);
    }

    #[test]
    fn test_crt_packet_size_is_1024() {
        assert_eq!(CRT_PACKET_SIZE, 1024);
    }

    #[test]
    fn test_ack_packet_size_is_512() {
        assert_eq!(ACK_PACKET_SIZE, 512);
    }

    #[test]
    fn test_endpoint_in_is_0x82() {
        assert_eq!(EP_IN, 0x82);
    }

    #[test]
    fn test_endpoint_out_is_0x03() {
        assert_eq!(EP_OUT, 0x03);
    }

    #[test]
    fn test_lcd_button_events() {
        assert_eq!(lcd_buttons::BUTTON_1, 0x01);
        assert_eq!(lcd_buttons::BUTTON_6, 0x06);
    }

    #[test]
    fn test_small_button_events() {
        assert_eq!(small_buttons::BUTTON_1, 0x25);
        assert_eq!(small_buttons::BUTTON_2, 0x30);
        assert_eq!(small_buttons::BUTTON_3, 0x31);
    }

    #[test]
    fn test_main_encoder_events() {
        assert_eq!(main_encoder::ROTATE_CCW, 0x50);
        assert_eq!(main_encoder::ROTATE_CW, 0x51);
        assert_eq!(main_encoder::PUSH, 0x35);
    }

    #[test]
    fn test_side_encoder_1_events() {
        assert_eq!(side_encoder_1::ROTATE_CCW, 0x90);
        assert_eq!(side_encoder_1::ROTATE_CW, 0x91);
        assert_eq!(side_encoder_1::PUSH, 0x33);
    }

    #[test]
    fn test_side_encoder_2_events() {
        assert_eq!(side_encoder_2::ROTATE_CCW, 0x60);
        assert_eq!(side_encoder_2::ROTATE_CW, 0x61);
        assert_eq!(side_encoder_2::PUSH, 0x34);
    }

    #[test]
    fn test_raw_event_parse_lcd_button_press() {
        let raw = RawEvent {
            event_id: 0x01,
            state: event_state::PRESS,
        };
        let event = raw.parse().unwrap();
        match event {
            DeviceEvent::Button {
                index,
                button_type,
                event_type,
            } => {
                assert_eq!(index, 0);
                assert_eq!(button_type, ButtonType::Lcd);
                assert_eq!(event_type, ButtonEventType::Press);
            }
            _ => panic!("Expected Button event"),
        }
    }

    #[test]
    fn test_raw_event_parse_main_encoder_cw() {
        let raw = RawEvent {
            event_id: main_encoder::ROTATE_CW,
            state: 0x00,
        };
        let event = raw.parse().unwrap();
        match event {
            DeviceEvent::Encoder {
                encoder_type,
                event_type,
            } => {
                assert_eq!(encoder_type, EncoderType::Main);
                assert_eq!(event_type, EncoderEventType::RotateCW);
            }
            _ => panic!("Expected Encoder event"),
        }
    }

    #[test]
    fn test_raw_event_parse_unknown() {
        let raw = RawEvent {
            event_id: 0xFF,
            state: 0x00,
        };
        assert!(raw.parse().is_none());
    }

    #[test]
    fn test_connection_state_default() {
        assert_eq!(ConnectionState::default(), ConnectionState::Disconnected);
    }

    #[test]
    fn test_hid_error_from_rusb() {
        let err: HidError = rusb::Error::NotFound.into();
        assert!(matches!(err, HidError::DeviceNotFound));
    }
}
