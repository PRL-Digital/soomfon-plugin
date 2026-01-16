//! SOOMFON Protocol
//!
//! High-level protocol implementation for SOOMFON device communication.
//! Provides a convenient API for device operations.

use super::manager::HidManager;
use super::packets::*;
use super::types::*;

/// High-level protocol interface for SOOMFON devices
pub struct SoomfonProtocol<'a> {
    manager: &'a HidManager,
}

impl<'a> SoomfonProtocol<'a> {
    /// Create a new protocol instance
    pub fn new(manager: &'a HidManager) -> Self {
        Self { manager }
    }

    /// Wake the display from sleep
    pub fn wake_display(&self) -> HidResult<()> {
        let packet = build_wake_display_packet();
        self.manager.write(&packet)?;
        Ok(())
    }

    /// Clear the screen
    /// If button_index is None, clears all buttons
    pub fn clear_screen(&self, button_index: Option<u8>) -> HidResult<()> {
        let packet = build_clear_screen_packet(button_index);
        self.manager.write(&packet)?;
        Ok(())
    }

    /// Set display brightness (0-100)
    pub fn set_brightness(&self, level: u8) -> HidResult<()> {
        let packet = build_brightness_packet(level);
        self.manager.write(&packet)?;
        Ok(())
    }

    /// Refresh/sync the display
    pub fn refresh_sync(&self) -> HidResult<()> {
        let packet = build_refresh_sync_packet();
        self.manager.write(&packet)?;
        Ok(())
    }

    /// Set button image from RGB565 data
    ///
    /// # Arguments
    /// * `button_index` - Button index (0-5)
    /// * `image_data` - RGB565 image data (must be 10368 bytes for 72x72)
    pub fn set_button_image(&self, button_index: u8, image_data: &[u8]) -> HidResult<()> {
        let data_length = image_data.len() as u32;

        // Send header packet
        let header = build_image_header_packet(
            button_index,
            data_length,
            LCD_WIDTH as u16,
            LCD_HEIGHT as u16,
        );
        self.manager.write(&header)?;

        // Send data packets
        let bytes_per_packet = REPORT_SIZE - 6;
        let total_packets = calculate_packet_count(image_data.len());

        for (i, chunk) in image_data.chunks(bytes_per_packet).enumerate() {
            let is_last = i == total_packets - 1;
            let packet = build_image_data_packet(i as u16, chunk, is_last);
            self.manager.write(&packet)?;
        }

        // Refresh display
        self.refresh_sync()?;

        Ok(())
    }
}
