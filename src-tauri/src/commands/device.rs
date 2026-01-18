//! Device Commands
//!
//! Tauri commands for HID device operations.
//! Emits Tauri events for device state changes to support frontend reactivity.

use crate::hid::manager::HidManager;
use crate::hid::packets::parse_ack_packet;
use crate::hid::protocol::SoomfonProtocol;
use crate::hid::types::{
    ButtonEventType, ButtonType, ConnectionState, DeviceEvent, DeviceInfo,
    EncoderEventType, EncoderType, EP_IN,
};
use crate::image::processor::{process_base64_image, ImageOptions};
use parking_lot::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

/// Device status response
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStatus {
    pub state: ConnectionState,
    pub device_info: Option<DeviceInfo>,
}

/// Button event payload for frontend (matches src/shared/types/device.ts ButtonEvent)
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ButtonEventPayload {
    /// Event type: "press", "release", "longPress"
    #[serde(rename = "type")]
    pub event_type: String,
    /// Button index (0-5 for LCD, 0-2 for physical)
    pub button_index: u8,
    /// Button type: "lcd" or "normal"
    pub button_type: String,
    /// Timestamp in milliseconds
    pub timestamp: u64,
}

/// Encoder event payload for frontend (matches src/shared/types/device.ts EncoderEvent)
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EncoderEventPayload {
    /// Event type: "rotateCW", "rotateCCW", "press", "release", "longPress"
    #[serde(rename = "type")]
    pub event_type: String,
    /// Encoder index (0=Main, 1=Side1, 2=Side2)
    pub encoder_index: u8,
    /// Rotation delta (for rotate events)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<i32>,
    /// Timestamp in milliseconds
    pub timestamp: u64,
}

/// Global flag to control event polling
static POLLING_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Connect to a SOOMFON device and initialize it
/// Emits `device:connected` event on success, then starts event polling
#[tauri::command]
pub fn connect_device(
    app: AppHandle,
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<DeviceInfo, String> {
    // Check if already connected and polling
    if POLLING_ACTIVE.load(Ordering::SeqCst) {
        let mgr = manager.lock();
        if let Some(info) = mgr.get_device_info() {
            log::info!("Already connected and polling, returning existing device info");
            // Still emit the connected event so frontend updates its state
            if let Err(e) = app.emit("device:connected", ()) {
                log::warn!("Failed to emit device:connected event: {}", e);
            }
            return Ok(info.clone());
        }
    }

    let mut mgr = manager.lock();

    // Connect to the device
    let result = mgr.connect().map_err(|e| e.to_string())?;

    // Initialize the device (CRITICAL - sends HID Feature Report to wake it up)
    log::info!("Initializing device...");
    match mgr.initialize() {
        Ok(version) => {
            log::info!("Device initialized, firmware: {}", version);
        }
        Err(e) => {
            log::error!("Failed to initialize device: {}", e);
            mgr.disconnect();
            return Err(format!("Failed to initialize device: {}", e));
        }
    }

    // Test: try reading events in the SAME thread before transferring
    log::info!("Testing event read in main thread (press a button within 3 seconds)...");
    for i in 0..3 {
        match mgr.read_response_timeout(Duration::from_millis(1000)) {
            Ok(Some(data)) => {
                log::info!("Main thread read {} bytes: {:02X?}", data.len(), &data[..data.len().min(16)]);
            }
            Ok(None) => {
                log::info!("Main thread read attempt {}: no data (timeout)", i + 1);
            }
            Err(e) => {
                log::warn!("Main thread read attempt {}: error {}", i + 1, e);
            }
        }
    }

    // Transfer the device handle to the polling thread for direct USB reads
    // This is the same pattern as init_test.rs - single handle, no mutex contention
    let polling_handle = match mgr.take_polling_handle() {
        Ok(handle) => handle,
        Err(e) => {
            log::error!("Failed to take polling handle: {}", e);
            mgr.disconnect();
            return Err(format!("Failed to take polling handle: {}", e));
        }
    };

    // Drop the lock before starting the polling thread
    drop(mgr);

    // Emit device connected event
    if let Err(e) = app.emit("device:connected", ()) {
        log::warn!("Failed to emit device:connected event: {}", e);
    }

    // Start event polling in a background thread with dedicated USB handle
    POLLING_ACTIVE.store(true, Ordering::SeqCst);
    let app_clone = app.clone();

    std::thread::spawn(move || {
        log::info!("Event polling thread started with dedicated handle");
        // Use 1024 bytes buffer - device may return up to 513 bytes (512 + report ID)
        let mut buf = [0u8; 1024];

        // Test read to verify handle works
        log::info!("Testing handle with a single read...");
        match polling_handle.read_interrupt(EP_IN, &mut buf, Duration::from_millis(500)) {
            Ok(n) => log::info!("Test read returned {} bytes", n),
            Err(e) => log::warn!("Test read error: {}", e),
        }

        let mut poll_count = 0u64;
        while POLLING_ACTIVE.load(Ordering::SeqCst) {
            poll_count += 1;
            // Log every 50 polls (~5 seconds) to show thread is alive
            if poll_count % 50 == 0 {
                log::info!("Polling thread alive, iteration {}", poll_count);
            }

            // Direct USB read - no mutex needed
            match polling_handle.read_interrupt(EP_IN, &mut buf, Duration::from_millis(100)) {
                Ok(n) if n > 0 => {
                    log::debug!("Read {} bytes from device: {:02X?}", n, &buf[..n.min(16)]);
                    // Parse ACK packet for events
                    if let Some(raw_event) = parse_ack_packet(&buf[..n]) {
                        log::debug!("Parsed raw event: id=0x{:02X}, state=0x{:02X}", raw_event.event_id, raw_event.state);
                        if let Some(device_event) = raw_event.parse() {
                            log::info!(">>> Device event: {:?}", device_event);

                            // Get current timestamp
                            let timestamp = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_millis() as u64)
                                .unwrap_or(0);

                            // Emit appropriately typed event to frontend
                            match &device_event {
                                DeviceEvent::Button { index, button_type, event_type } => {
                                    let payload = ButtonEventPayload {
                                        event_type: match event_type {
                                            ButtonEventType::Press => "press".to_string(),
                                            ButtonEventType::Release => "release".to_string(),
                                            ButtonEventType::LongPress => "longPress".to_string(),
                                        },
                                        button_index: *index,
                                        button_type: match button_type {
                                            ButtonType::Lcd => "lcd".to_string(),
                                            ButtonType::Physical => "normal".to_string(),
                                        },
                                        timestamp,
                                    };

                                    let event_name = match event_type {
                                        ButtonEventType::Press | ButtonEventType::LongPress => "device:buttonPress",
                                        ButtonEventType::Release => "device:buttonRelease",
                                    };

                                    if let Err(e) = app_clone.emit(event_name, &payload) {
                                        log::warn!("Failed to emit {}: {}", event_name, e);
                                    }
                                }
                                DeviceEvent::Encoder { encoder_type, event_type } => {
                                    let encoder_index = match encoder_type {
                                        EncoderType::Main => 0u8,
                                        EncoderType::Side1 => 1u8,
                                        EncoderType::Side2 => 2u8,
                                    };

                                    let payload = EncoderEventPayload {
                                        event_type: match event_type {
                                            EncoderEventType::RotateCW => "rotateCW".to_string(),
                                            EncoderEventType::RotateCCW => "rotateCCW".to_string(),
                                            EncoderEventType::Press => "press".to_string(),
                                            EncoderEventType::Release => "release".to_string(),
                                            EncoderEventType::LongPress => "longPress".to_string(),
                                        },
                                        encoder_index,
                                        delta: match event_type {
                                            EncoderEventType::RotateCW => Some(1),
                                            EncoderEventType::RotateCCW => Some(-1),
                                            _ => None,
                                        },
                                        timestamp,
                                    };

                                    let event_name = match event_type {
                                        EncoderEventType::RotateCW | EncoderEventType::RotateCCW => "device:encoderRotate",
                                        EncoderEventType::Press | EncoderEventType::Release | EncoderEventType::LongPress => "device:encoderPress",
                                    };

                                    if let Err(e) = app_clone.emit(event_name, &payload) {
                                        log::warn!("Failed to emit {}: {}", event_name, e);
                                    }
                                }
                            }
                        }
                    }
                }
                Ok(0) => {
                    // 0 bytes read, continue polling
                }
                Ok(_) => {
                    // Shouldn't happen with the guard above
                }
                Err(rusb::Error::Timeout) => {
                    // Timeout is normal, continue polling
                }
                Err(e) => {
                    log::warn!("Polling read error: {} - continuing...", e);
                }
            }
        }

        // Release the interface when stopping
        if let Err(e) = polling_handle.release_interface(crate::hid::types::VENDOR_INTERFACE) {
            log::warn!("Failed to release polling interface: {}", e);
        }
        log::info!("Event polling thread stopped");
    });

    Ok(result)
}

/// Disconnect from the device
/// Emits `device:disconnected` event on success
#[tauri::command]
pub fn disconnect_device(
    app: AppHandle,
    manager: State<Arc<Mutex<HidManager>>>,
) -> Result<(), String> {
    // Stop the polling thread first
    POLLING_ACTIVE.store(false, Ordering::SeqCst);

    // Give the polling thread time to stop
    std::thread::sleep(Duration::from_millis(150));

    let mut mgr = manager.lock();
    mgr.disconnect();

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
    let mut manager = manager.lock();
    // Reopen handle if it was transferred to polling thread
    manager.reopen_for_commands().map_err(|e| e.to_string())?;
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
    let mut manager = manager.lock();
    // Reopen handle if it was transferred to polling thread
    manager.reopen_for_commands().map_err(|e| e.to_string())?;

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
    let mut manager = manager.lock();
    // Reopen handle if it was transferred to polling thread
    manager.reopen_for_commands().map_err(|e| e.to_string())?;
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
