//! Device Commands
//!
//! Tauri commands for HID device operations.
//! Emits Tauri events for device state changes to support frontend reactivity.

use crate::hid::manager::HidManager;
use crate::hid::protocol::SoomfonProtocol;
use crate::hid::types::{ConnectionState, DeviceInfo};
use crate::image::processor::{process_base64_image, ImageOptions};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

/// Device status response
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub state: ConnectionState,
    pub device_info: Option<DeviceInfo>,
}

/// Connect to a SOOMFON device
/// Emits `device:connected` event on success
#[tauri::command]
pub fn connect_device(
    app: AppHandle,
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<DeviceInfo, String> {
    let mut manager = manager.lock();
    let result = manager.connect().map_err(|e| e.to_string())?;

    // Emit device connected event
    if let Err(e) = app.emit("device:connected", ()) {
        log::warn!("Failed to emit device:connected event: {}", e);
    }

    Ok(result)
}

/// Disconnect from the device
/// Emits `device:disconnected` event on success
#[tauri::command]
pub fn disconnect_device(
    app: AppHandle,
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<(), String> {
    let mut manager = manager.lock();
    manager.disconnect();

    // Emit device disconnected event
    if let Err(e) = app.emit("device:disconnected", ()) {
        log::warn!("Failed to emit device:disconnected event: {}", e);
    }

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
