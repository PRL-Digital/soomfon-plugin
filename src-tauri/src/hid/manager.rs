//! HID Manager
//!
//! Manages connection lifecycle and communication with SOOMFON HID devices.
//! Handles device enumeration, connection, disconnection, and data transfer.

use super::types::*;
use hidapi::{HidApi, HidDevice};
use std::sync::Arc;
use parking_lot::RwLock;

/// Manages HID device connections
pub struct HidManager {
    /// Current connection state
    state: ConnectionState,
    /// Connected device info
    device_info: Option<DeviceInfo>,
    /// HID API instance
    hid_api: Option<HidApi>,
    /// Vendor interface device handle
    vendor_device: Option<HidDevice>,
    /// Whether auto-reconnect is enabled
    auto_reconnect: bool,
}

impl HidManager {
    /// Create a new HID manager instance
    pub fn new() -> Self {
        Self {
            state: ConnectionState::Disconnected,
            device_info: None,
            hid_api: None,
            vendor_device: None,
            auto_reconnect: true,
        }
    }

    /// Get current connection state
    pub fn get_connection_state(&self) -> ConnectionState {
        self.state
    }

    /// Get connected device info
    pub fn get_device_info(&self) -> Option<&DeviceInfo> {
        self.device_info.as_ref()
    }

    /// Check if device is connected
    pub fn is_connected(&self) -> bool {
        self.state == ConnectionState::Connected && self.vendor_device.is_some()
    }

    /// Set auto-reconnect behavior
    pub fn set_auto_reconnect(&mut self, enabled: bool) {
        self.auto_reconnect = enabled;
    }

    /// Enumerate all SOOMFON devices
    pub fn enumerate_devices(&mut self) -> HidResult<Vec<DeviceInfo>> {
        let api = self.get_or_init_api()?;

        let devices: Vec<DeviceInfo> = api
            .device_list()
            .filter(|d| d.vendor_id() == SOOMFON_VID && d.product_id() == SOOMFON_PID)
            .filter(|d| d.usage_page() == VENDOR_USAGE_PAGE)
            .map(|d| DeviceInfo {
                path: d.path().to_string_lossy().to_string(),
                serial_number: d.serial_number().map(|s| s.to_string()),
                manufacturer: d.manufacturer_string().map(|s| s.to_string()),
                product: d.product_string().map(|s| s.to_string()),
                firmware_version: None,
            })
            .collect();

        Ok(devices)
    }

    /// Connect to a SOOMFON device
    pub fn connect(&mut self) -> HidResult<DeviceInfo> {
        if self.is_connected() {
            if let Some(info) = &self.device_info {
                return Ok(info.clone());
            }
        }

        self.state = ConnectionState::Connecting;
        log::info!("Attempting to connect to SOOMFON device...");

        let api = self.get_or_init_api()?;

        // Find vendor interface
        let vendor_info = api
            .device_list()
            .filter(|d| d.vendor_id() == SOOMFON_VID && d.product_id() == SOOMFON_PID)
            .find(|d| d.usage_page() == VENDOR_USAGE_PAGE)
            .ok_or(HidError::DeviceNotFound)?;

        let path = vendor_info.path().to_owned();
        let device_info = DeviceInfo {
            path: path.to_string_lossy().to_string(),
            serial_number: vendor_info.serial_number().map(|s| s.to_string()),
            manufacturer: vendor_info.manufacturer_string().map(|s| s.to_string()),
            product: vendor_info.product_string().map(|s| s.to_string()),
            firmware_version: None,
        };

        // Open the device
        let device = api
            .open_path(&path)
            .map_err(|e| HidError::OpenFailed(e.to_string()))?;

        // Set non-blocking mode
        device
            .set_blocking_mode(false)
            .map_err(|e| HidError::OpenFailed(e.to_string()))?;

        self.vendor_device = Some(device);
        self.device_info = Some(device_info.clone());
        self.state = ConnectionState::Connected;

        log::info!("Connected to SOOMFON device: {:?}", device_info.path);
        Ok(device_info)
    }

    /// Disconnect from the device
    pub fn disconnect(&mut self) {
        log::info!("Disconnecting from SOOMFON device...");

        self.vendor_device = None;
        self.device_info = None;
        self.state = ConnectionState::Disconnected;

        log::info!("Disconnected from SOOMFON device");
    }

    /// Write data to the device
    pub fn write(&self, data: &[u8]) -> HidResult<usize> {
        let device = self.vendor_device.as_ref().ok_or(HidError::NotConnected)?;

        device
            .write(data)
            .map_err(|e| HidError::WriteFailed(e.to_string()))
    }

    /// Send a feature report to the device
    pub fn send_feature_report(&self, data: &[u8]) -> HidResult<()> {
        let device = self.vendor_device.as_ref().ok_or(HidError::NotConnected)?;

        device
            .send_feature_report(data)
            .map_err(|e| HidError::WriteFailed(e.to_string()))
    }

    /// Get a feature report from the device
    pub fn get_feature_report(&self, report_id: u8, length: usize) -> HidResult<Vec<u8>> {
        let device = self.vendor_device.as_ref().ok_or(HidError::NotConnected)?;

        let mut buf = vec![0u8; length];
        buf[0] = report_id;

        let bytes_read = device
            .get_feature_report(&mut buf)
            .map_err(|e| HidError::ReadFailed(e.to_string()))?;

        buf.truncate(bytes_read);
        Ok(buf)
    }

    /// Read data from the device (non-blocking)
    pub fn read(&self) -> HidResult<Option<Vec<u8>>> {
        let device = self.vendor_device.as_ref().ok_or(HidError::NotConnected)?;

        let mut buf = [0u8; REPORT_SIZE];
        match device.read(&mut buf) {
            Ok(0) => Ok(None),
            Ok(n) => Ok(Some(buf[..n].to_vec())),
            Err(e) => Err(HidError::ReadFailed(e.to_string())),
        }
    }

    /// Read data from the device with timeout
    pub fn read_timeout(&self, timeout_ms: i32) -> HidResult<Option<Vec<u8>>> {
        let device = self.vendor_device.as_ref().ok_or(HidError::NotConnected)?;

        let mut buf = [0u8; REPORT_SIZE];
        match device.read_timeout(&mut buf, timeout_ms) {
            Ok(0) => Ok(None),
            Ok(n) => Ok(Some(buf[..n].to_vec())),
            Err(e) => Err(HidError::ReadFailed(e.to_string())),
        }
    }

    /// Get or initialize the HID API
    fn get_or_init_api(&mut self) -> HidResult<&HidApi> {
        if self.hid_api.is_none() {
            let api = HidApi::new().map_err(|e| HidError::OpenFailed(e.to_string()))?;
            self.hid_api = Some(api);
        }
        Ok(self.hid_api.as_ref().unwrap())
    }
}

impl Default for HidManager {
    fn default() -> Self {
        Self::new()
    }
}
