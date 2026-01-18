//! SOOMFON Protocol
//!
//! High-level protocol implementation for SOOMFON device communication.
//! Provides a convenient API for device operations.
//!
//! Based on reverse-engineered protocol from usb-protocol-reverse-engineering.md

use super::manager::HidManager;
use super::packets::*;
use super::types::*;
use std::time::Duration;

/// High-level protocol interface for SOOMFON devices
pub struct SoomfonProtocol<'a> {
    manager: &'a HidManager,
}

impl<'a> SoomfonProtocol<'a> {
    /// Create a new protocol instance
    pub fn new(manager: &'a HidManager) -> Self {
        Self { manager }
    }

    /// Check if the device is ready for commands
    pub fn is_ready(&self) -> bool {
        self.manager.is_initialized()
    }

    /// Set display brightness (0-100)
    pub fn set_brightness(&self, level: u8) -> HidResult<()> {
        self.manager.set_brightness(level)
    }

    /// Send keepalive to maintain connection
    pub fn send_keepalive(&self) -> HidResult<()> {
        self.manager.send_keepalive()
    }

    /// Poll for a device event
    pub fn poll_event(&self) -> HidResult<Option<DeviceEvent>> {
        self.manager.poll_event()
    }

    /// Poll for a device event with timeout
    pub fn poll_event_timeout(&self, timeout: Duration) -> HidResult<Option<DeviceEvent>> {
        self.manager.poll_event_timeout(timeout)
    }

    /// Clear all LCD displays
    pub fn clear_displays(&self) -> HidResult<()> {
        self.manager.send_command(&build_clear_lcd_packet())?;
        Ok(())
    }

    /// Clear all button states
    pub fn clear_buttons(&self) -> HidResult<()> {
        self.manager.send_command(&build_clear_buttons_packet())?;
        Ok(())
    }

    /// Clear screen (clears LCD displays)
    /// If button_index is Some, only that button is cleared (not implemented yet)
    /// If button_index is None, all buttons are cleared
    pub fn clear_screen(&self, _button_index: Option<u8>) -> HidResult<()> {
        // Currently we only support clearing all displays
        // Individual button clearing needs protocol reverse engineering
        self.manager.send_command(&build_clear_lcd_packet())?;
        Ok(())
    }

    /// Send a raw CRT command packet
    pub fn send_raw_command(&self, packet: &[u8; CRT_PACKET_SIZE]) -> HidResult<usize> {
        self.manager.send_command(packet)
    }

    /// Read raw response from device
    pub fn read_raw_response(&self) -> HidResult<Option<Vec<u8>>> {
        self.manager.read_response()
    }

    // =========================================================================
    // Image Transfer (placeholder - needs more reverse engineering)
    // =========================================================================

    /// Set button image from JPEG data
    ///
    /// Note: Image transfer protocol is not fully reverse-engineered yet.
    /// This is a placeholder implementation.
    ///
    /// # Arguments
    /// * `button_index` - Button index (0-5)
    /// * `_jpeg_data` - JPEG image data
    pub fn set_button_image(&self, _button_index: u8, _jpeg_data: &[u8]) -> HidResult<()> {
        // TODO: Implement based on further reverse engineering
        // The device accepts JPEG images with FF D8 FF E0 magic bytes
        // Need to capture actual image transfer packets to understand the protocol
        log::warn!("set_button_image not yet implemented - needs protocol reverse engineering");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    // Protocol tests would require a connected device
    // Unit tests are in the individual modules
}
