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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionState {
    /// Not connected to any device
    Disconnected,
    /// Currently attempting to connect
    Connecting,
    /// Successfully connected to device
    Connected,
    /// Connection error occurred
    Error,
}

impl Default for ConnectionState {
    fn default() -> Self {
        Self::Disconnected
    }
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
