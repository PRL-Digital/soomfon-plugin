//! HID Type Definitions
//!
//! Contains constants and types for SOOMFON HID device communication.

use serde::{Deserialize, Serialize};

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

/// HID report size in bytes
pub const REPORT_SIZE: usize = 64;

/// LCD button dimensions (pixels)
pub const LCD_WIDTH: u32 = 72;
pub const LCD_HEIGHT: u32 = 72;

/// Polling interval in milliseconds (Windows workaround)
pub const POLL_INTERVAL_MS: u64 = 1;

/// Long press detection threshold in milliseconds
pub const LONG_PRESS_THRESHOLD_MS: u64 = 500;

/// Debounce time in milliseconds
pub const DEBOUNCE_MS: u64 = 50;

/// Reconnect interval in milliseconds
pub const RECONNECT_INTERVAL_MS: u64 = 2000;

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
    /// Firmware version (if available)
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

/// Device event from SOOMFON hardware
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DeviceEvent {
    /// Button press/release event
    Button {
        index: u8,
        event_type: ButtonEventType,
    },
    /// Encoder rotation/press event
    Encoder {
        index: u8,
        event_type: EncoderEventType,
    },
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

    #[error("Failed to open device: {0}")]
    OpenFailed(String),

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
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==========================================================================
    // Constants Tests
    // ==========================================================================

    #[test]
    fn test_soomfon_vid_is_correct() {
        assert_eq!(SOOMFON_VID, 0x1500);
    }

    #[test]
    fn test_soomfon_pid_is_correct() {
        assert_eq!(SOOMFON_PID, 0x3001);
    }

    #[test]
    fn test_vendor_usage_page_is_correct() {
        assert_eq!(VENDOR_USAGE_PAGE, 0xffa0);
    }

    #[test]
    fn test_report_size_is_64_bytes() {
        assert_eq!(REPORT_SIZE, 64);
    }

    #[test]
    fn test_lcd_dimensions_are_72x72() {
        assert_eq!(LCD_WIDTH, 72);
        assert_eq!(LCD_HEIGHT, 72);
    }

    #[test]
    fn test_poll_interval_is_1ms() {
        assert_eq!(POLL_INTERVAL_MS, 1);
    }

    #[test]
    fn test_long_press_threshold_is_500ms() {
        assert_eq!(LONG_PRESS_THRESHOLD_MS, 500);
    }

    #[test]
    fn test_debounce_time_is_50ms() {
        assert_eq!(DEBOUNCE_MS, 50);
    }

    // ==========================================================================
    // ConnectionState Tests
    // ==========================================================================

    #[test]
    fn test_connection_state_default_is_disconnected() {
        assert_eq!(ConnectionState::default(), ConnectionState::Disconnected);
    }

    #[test]
    fn test_connection_state_serializes_to_camel_case() {
        let json = serde_json::to_string(&ConnectionState::Connected).unwrap();
        assert_eq!(json, "\"connected\"");
    }

    #[test]
    fn test_connection_state_all_variants_serialize() {
        let states = [
            (ConnectionState::Disconnected, "\"disconnected\""),
            (ConnectionState::Connecting, "\"connecting\""),
            (ConnectionState::Connected, "\"connected\""),
            (ConnectionState::Error, "\"error\""),
        ];
        for (state, expected) in states {
            let json = serde_json::to_string(&state).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_connection_state_deserializes_from_camel_case() {
        let state: ConnectionState = serde_json::from_str("\"connected\"").unwrap();
        assert_eq!(state, ConnectionState::Connected);
    }

    #[test]
    fn test_connection_state_equality() {
        assert_eq!(ConnectionState::Connected, ConnectionState::Connected);
        assert_ne!(ConnectionState::Connected, ConnectionState::Disconnected);
    }

    #[test]
    fn test_connection_state_copy() {
        let state = ConnectionState::Connected;
        let copied = state;
        assert_eq!(state, copied);
    }

    // ==========================================================================
    // DeviceInfo Tests
    // ==========================================================================

    #[test]
    fn test_device_info_serializes_to_camel_case() {
        let info = DeviceInfo {
            path: "/dev/hidraw0".to_string(),
            serial_number: Some("SN123".to_string()),
            manufacturer: Some("SOOMFON".to_string()),
            product: Some("Controller".to_string()),
            firmware_version: Some("1.0.0".to_string()),
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"serialNumber\":"));
        assert!(json.contains("\"firmwareVersion\":"));
    }

    #[test]
    fn test_device_info_with_null_fields() {
        let info = DeviceInfo {
            path: "/dev/hidraw0".to_string(),
            serial_number: None,
            manufacturer: None,
            product: None,
            firmware_version: None,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"serialNumber\":null"));
    }

    #[test]
    fn test_device_info_deserializes() {
        let json = r#"{"path":"/test","serialNumber":"123","manufacturer":null,"product":"Test","firmwareVersion":null}"#;
        let info: DeviceInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.path, "/test");
        assert_eq!(info.serial_number, Some("123".to_string()));
        assert_eq!(info.product, Some("Test".to_string()));
    }

    #[test]
    fn test_device_info_clone() {
        let info = DeviceInfo {
            path: "/dev/hidraw0".to_string(),
            serial_number: Some("SN123".to_string()),
            manufacturer: None,
            product: None,
            firmware_version: None,
        };
        let cloned = info.clone();
        assert_eq!(cloned.path, info.path);
        assert_eq!(cloned.serial_number, info.serial_number);
    }

    // ==========================================================================
    // ButtonEventType Tests
    // ==========================================================================

    #[test]
    fn test_button_event_type_serializes_to_camel_case() {
        assert_eq!(
            serde_json::to_string(&ButtonEventType::Press).unwrap(),
            "\"press\""
        );
        assert_eq!(
            serde_json::to_string(&ButtonEventType::Release).unwrap(),
            "\"release\""
        );
        assert_eq!(
            serde_json::to_string(&ButtonEventType::LongPress).unwrap(),
            "\"longPress\""
        );
    }

    #[test]
    fn test_button_event_type_deserializes() {
        let press: ButtonEventType = serde_json::from_str("\"press\"").unwrap();
        assert_eq!(press, ButtonEventType::Press);
    }

    #[test]
    fn test_button_event_type_equality() {
        assert_eq!(ButtonEventType::Press, ButtonEventType::Press);
        assert_ne!(ButtonEventType::Press, ButtonEventType::Release);
    }

    // ==========================================================================
    // EncoderEventType Tests
    // ==========================================================================

    #[test]
    fn test_encoder_event_type_all_variants_serialize() {
        let variants = [
            (EncoderEventType::RotateCW, "\"rotateCW\""),
            (EncoderEventType::RotateCCW, "\"rotateCCW\""),
            (EncoderEventType::Press, "\"press\""),
            (EncoderEventType::Release, "\"release\""),
            (EncoderEventType::LongPress, "\"longPress\""),
        ];
        for (event_type, expected) in variants {
            let json = serde_json::to_string(&event_type).unwrap();
            assert_eq!(json, expected);
        }
    }

    #[test]
    fn test_encoder_event_type_deserializes() {
        let cw: EncoderEventType = serde_json::from_str("\"rotateCW\"").unwrap();
        assert_eq!(cw, EncoderEventType::RotateCW);
    }

    // ==========================================================================
    // DeviceEvent Tests
    // ==========================================================================

    #[test]
    fn test_device_event_button_serializes_with_tag() {
        let event = DeviceEvent::Button {
            index: 0,
            event_type: ButtonEventType::Press,
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"button\""));
        assert!(json.contains("\"index\":0"));
        // Note: serde rename_all on enum applies to variant names only,
        // field names inside variants use snake_case by default
        assert!(json.contains("\"event_type\":\"press\""));
    }

    #[test]
    fn test_device_event_encoder_serializes_with_tag() {
        let event = DeviceEvent::Encoder {
            index: 1,
            event_type: EncoderEventType::RotateCW,
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"encoder\""));
        assert!(json.contains("\"index\":1"));
        // Note: serde rename_all on enum applies to variant names only,
        // field names inside variants use snake_case by default
        assert!(json.contains("\"event_type\":\"rotateCW\""));
    }

    #[test]
    fn test_device_event_button_deserializes() {
        // Note: uses snake_case field name to match serialization format
        let json = r#"{"type":"button","index":2,"event_type":"longPress"}"#;
        let event: DeviceEvent = serde_json::from_str(json).unwrap();
        match event {
            DeviceEvent::Button { index, event_type } => {
                assert_eq!(index, 2);
                assert_eq!(event_type, ButtonEventType::LongPress);
            }
            _ => panic!("Expected Button event"),
        }
    }

    #[test]
    fn test_device_event_encoder_deserializes() {
        // Note: uses snake_case field name to match serialization format
        let json = r#"{"type":"encoder","index":0,"event_type":"rotateCCW"}"#;
        let event: DeviceEvent = serde_json::from_str(json).unwrap();
        match event {
            DeviceEvent::Encoder { index, event_type } => {
                assert_eq!(index, 0);
                assert_eq!(event_type, EncoderEventType::RotateCCW);
            }
            _ => panic!("Expected Encoder event"),
        }
    }

    #[test]
    fn test_device_event_clone() {
        let event = DeviceEvent::Button {
            index: 5,
            event_type: ButtonEventType::Release,
        };
        let cloned = event.clone();
        if let DeviceEvent::Button { index, event_type } = cloned {
            assert_eq!(index, 5);
            assert_eq!(event_type, ButtonEventType::Release);
        } else {
            panic!("Clone failed");
        }
    }

    // ==========================================================================
    // HidError Tests
    // ==========================================================================

    #[test]
    fn test_hid_error_device_not_found_message() {
        let error = HidError::DeviceNotFound;
        assert_eq!(error.to_string(), "Device not found");
    }

    #[test]
    fn test_hid_error_not_connected_message() {
        let error = HidError::NotConnected;
        assert_eq!(error.to_string(), "Device not connected");
    }

    #[test]
    fn test_hid_error_open_failed_message() {
        let error = HidError::OpenFailed("permission denied".to_string());
        assert_eq!(error.to_string(), "Failed to open device: permission denied");
    }

    #[test]
    fn test_hid_error_write_failed_message() {
        let error = HidError::WriteFailed("timeout".to_string());
        assert_eq!(error.to_string(), "Failed to write to device: timeout");
    }

    #[test]
    fn test_hid_error_read_failed_message() {
        let error = HidError::ReadFailed("disconnected".to_string());
        assert_eq!(error.to_string(), "Failed to read from device: disconnected");
    }

    #[test]
    fn test_hid_error_invalid_data_message() {
        let error = HidError::InvalidData("bad checksum".to_string());
        assert_eq!(error.to_string(), "Invalid data: bad checksum");
    }

    #[test]
    fn test_hid_error_connection_lost_message() {
        let error = HidError::ConnectionLost;
        assert_eq!(error.to_string(), "Connection lost");
    }

    #[test]
    fn test_hid_error_timeout_message() {
        let error = HidError::Timeout;
        assert_eq!(error.to_string(), "Timeout");
    }

    #[test]
    fn test_hid_result_ok() {
        let result: HidResult<u8> = Ok(42);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 42);
    }

    #[test]
    fn test_hid_result_err() {
        let result: HidResult<u8> = Err(HidError::Timeout);
        assert!(result.is_err());
    }
}
