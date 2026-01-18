//! HID Communication Module
//!
//! This module handles all USB HID communication with SOOMFON devices.
//! It provides device discovery, connection management, and data transfer.
//!
//! ## Architecture
//!
//! - `types`: Core types, constants, and error definitions
//! - `packets`: CRT command packet builders and ACK response parsers
//! - `manager`: Low-level USB communication using rusb
//! - `protocol`: High-level protocol interface
//!
//! ## Usage
//!
//! ```no_run
//! use soomfon_controller_lib::hid::{HidManager, SoomfonProtocol};
//!
//! // Create manager and connect
//! let mut manager = HidManager::new();
//! manager.connect()?;
//!
//! // Initialize device (REQUIRED before events work)
//! manager.initialize()?;
//!
//! // Poll for events
//! loop {
//!     if let Some(event) = manager.poll_event()? {
//!         println!("Event: {:?}", event);
//!     }
//! }
//! # Ok::<(), soomfon_controller_lib::hid::HidError>(())
//! ```

pub mod manager;
pub mod packets;
pub mod protocol;
pub mod types;

// Re-export commonly used items
pub use manager::HidManager;
pub use packets::{
    build_brightness_packet, build_clear_buttons_packet, build_clear_lcd_packet,
    build_connect_packet, build_display_init_packet, build_halt_packet, build_quick_command_packet,
    is_ack_response, is_crt_response, parse_ack_packet,
};
pub use protocol::SoomfonProtocol;
pub use types::{
    // Constants
    ACK_PACKET_SIZE,
    CRT_PACKET_SIZE,
    EP_IN,
    EP_OUT,
    FEATURE_REPORT_SIZE,
    KEEPALIVE_INTERVAL_MS,
    LCD_HEIGHT,
    LCD_WIDTH,
    SOOMFON_PID,
    SOOMFON_VID,
    USB_TIMEOUT_MS,
    VENDOR_INTERFACE,
    // Event constants
    lcd_buttons,
    main_encoder,
    side_encoder_1,
    side_encoder_2,
    small_buttons,
    // Types
    ButtonEventType,
    ButtonType,
    ConnectionState,
    DeviceEvent,
    DeviceInfo,
    EncoderEventType,
    EncoderType,
    HidError,
    HidResult,
    RawEvent,
};
