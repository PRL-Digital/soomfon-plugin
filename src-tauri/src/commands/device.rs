//! Device Commands
//!
//! Tauri commands for HID device operations.

use crate::hid::manager::HidManager;
use crate::hid::protocol::SoomfonProtocol;
use crate::hid::types::{ConnectionState, DeviceInfo};
use crate::image::processor::{create_solid_color, process_base64_image, ImageOptions};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

/// Device status response
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub state: ConnectionState,
    pub device_info: Option<DeviceInfo>,
}

/// Connect to a SOOMFON device
#[tauri::command]
pub fn connect_device(
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<DeviceInfo, String> {
    let mut manager = manager.lock();
    manager.connect().map_err(|e| e.to_string())
}

/// Disconnect from the device
#[tauri::command]
pub fn disconnect_device(
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<(), String> {
    let mut manager = manager.lock();
    manager.disconnect();
    Ok(())
}

/// Get current device status
#[tauri::command]
pub fn get_device_status(
    manager: State<Arc<Mutex<HidManager>>>,
) -> DeviceStatus {
    let manager = manager.lock();
    DeviceStatus {
        state: manager.get_connection_state(),
        device_info: manager.get_device_info().cloned(),
    }
}

/// Set display brightness
#[tauri::command]
pub fn set_brightness(
    level: u8,
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<(), String> {
    let manager = manager.lock();
    let protocol = SoomfonProtocol::new(&manager);
    protocol.set_brightness(level).map_err(|e| e.to_string())
}

/// Set button image from base64 data
#[tauri::command]
pub fn set_button_image(
    index: u8,
    image_data: String,
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<(), String> {
    let manager = manager.lock();

    // Process image to RGB565
    let options = ImageOptions::default();
    let rgb565_data = process_base64_image(&image_data, &options)?;

    // Send to device
    let protocol = SoomfonProtocol::new(&manager);
    protocol.set_button_image(index, &rgb565_data).map_err(|e| e.to_string())
}

/// Clear a button display
#[tauri::command]
pub fn clear_button(
    index: Option<u8>,
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<(), String> {
    let manager = manager.lock();
    let protocol = SoomfonProtocol::new(&manager);
    protocol.clear_screen(index).map_err(|e| e.to_string())
}

/// Enumerate available SOOMFON devices
#[tauri::command]
pub fn enumerate_devices(
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<Vec<DeviceInfo>, String> {
    let mut manager = manager.lock();
    manager.enumerate_devices().map_err(|e| e.to_string())
}
