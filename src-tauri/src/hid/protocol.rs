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

    /// Clear all LCD displays to black
    ///
    /// Uses native CLE command with TG0=0x00, TG1=0xFF to clear all buttons to black.
    /// Sends STP to commit the change (required for protocol v2+).
    pub fn clear_displays(&self) -> HidResult<()> {
        log::info!("Clearing all LCD displays with CLE command");

        // Send CLE command to clear all buttons to black
        self.manager.send_command(&build_clear_all_to_black_packet())?;

        // Send STP to commit (required for protocol v2+)
        self.manager.send_command(&build_stp_packet())?;

        Ok(())
    }

    /// Clear all button states
    pub fn clear_buttons(&self) -> HidResult<()> {
        self.manager.send_command(&build_clear_buttons_packet())?;
        Ok(())
    }

    /// Clear screen (clears LCD displays to black)
    /// If button_index is Some, only that button is cleared
    /// If button_index is None, all buttons are cleared
    pub fn clear_screen(&self, button_index: Option<u8>) -> HidResult<()> {
        match button_index {
            Some(index) => self.clear_button_image(index),
            None => self.clear_displays(),
        }
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
    // Image Transfer (based on mirajazz library protocol)
    // =========================================================================

    /// Set button image from JPEG data
    ///
    /// Protocol based on mirajazz library reverse engineering:
    /// 1. Send BAT header packet with button index and data size
    /// 2. Send image data in 1024-byte chunks
    /// 3. Send STP packet to commit the image
    ///
    /// # Arguments
    /// * `button_index` - Button index (0-5)
    /// * `jpeg_data` - JPEG image data (should be 60x60 from image processor)
    pub fn set_button_image(&self, button_index: u8, jpeg_data: &[u8]) -> HidResult<()> {
        // Validate button index
        if button_index > 5 {
            return Err(HidError::InvalidData(format!(
                "Button index {} out of range (0-5)",
                button_index
            )));
        }

        // Validate JPEG data
        if jpeg_data.len() < 3 {
            return Err(HidError::InvalidData("Image data too small".to_string()));
        }

        // Check JPEG magic bytes (FF D8 FF)
        if jpeg_data[0] != 0xFF || jpeg_data[1] != 0xD8 || jpeg_data[2] != 0xFF {
            return Err(HidError::InvalidData(
                "Invalid JPEG data - missing magic bytes".to_string(),
            ));
        }

        log::info!(
            "Setting button {} image ({} bytes JPEG)",
            button_index,
            jpeg_data.len()
        );

        // Step 1: Send BAT header packet
        let bat_packet = build_image_bat_packet(button_index, jpeg_data.len() as u32);
        self.manager.send_command(&bat_packet)?;
        log::debug!("Sent BAT header for button {}", button_index);

        // Step 2: Send image data in chunks
        let chunk_size = CRT_PACKET_SIZE;
        let mut offset = 0;

        while offset < jpeg_data.len() {
            let end = (offset + chunk_size).min(jpeg_data.len());
            let chunk = &jpeg_data[offset..end];
            let data_packet = build_image_data_packet(chunk, offset);
            self.manager.send_command(&data_packet)?;
            log::trace!("Sent image chunk at offset {}", offset);
            offset = end;
        }

        log::debug!(
            "Sent {} image data chunks",
            (jpeg_data.len() + chunk_size - 1) / chunk_size
        );

        // Step 3: Send STP packet to commit
        self.manager.send_command(&build_stp_packet())?;
        log::debug!("Sent STP to commit image");

        log::info!("Button {} image set successfully", button_index);
        Ok(())
    }

    /// Clear a single button's image to black
    ///
    /// Uses native CLE command with TG0=0x00, TG1=button_index to clear to black.
    /// Sends STP to commit the change (required for protocol v2+).
    pub fn clear_button_image(&self, button_index: u8) -> HidResult<()> {
        // Validate button index
        if button_index > 5 {
            return Err(HidError::InvalidData(format!(
                "Button index {} out of range (0-5)",
                button_index
            )));
        }

        log::info!("Clearing button {} with CLE command", button_index);

        // Send CLE command with button target
        self.manager.send_command(&build_clear_button_to_black_packet(button_index))?;

        // Send STP to commit (required for protocol v2+)
        self.manager.send_command(&build_stp_packet())?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    // Protocol tests would require a connected device
    // Unit tests are in the individual modules
}
