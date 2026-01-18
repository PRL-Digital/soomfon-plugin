//! HID Manager
//!
//! Manages connection lifecycle and communication with SOOMFON HID devices.
//! Uses rusb for low-level USB communication to support the device's protocol.
//!
//! Based on reverse-engineered protocol from usb-protocol-reverse-engineering.md

use super::packets::*;
use super::types::*;
use rusb::{Context, DeviceHandle, UsbContext};
use std::time::Duration;

/// USB timeout for operations
const USB_TIMEOUT: Duration = Duration::from_millis(USB_TIMEOUT_MS);

/// Manages HID device connections using rusb
pub struct HidManager {
    /// Current connection state
    state: ConnectionState,
    /// Connected device info
    device_info: Option<DeviceInfo>,
    /// USB context
    context: Option<Context>,
    /// Device handle
    handle: Option<DeviceHandle<Context>>,
    /// Whether device has been initialized
    initialized: bool,
    /// Whether auto-reconnect is enabled
    auto_reconnect: bool,
}

impl HidManager {
    /// Create a new HID manager instance
    pub fn new() -> Self {
        Self {
            state: ConnectionState::Disconnected,
            device_info: None,
            context: None,
            handle: None,
            initialized: false,
            auto_reconnect: true,
        }
    }

    /// Use hidapi to get feature report (uses Windows HID driver)
    /// This may work where rusb control transfers fail
    fn get_feature_report_via_hidapi() -> Result<String, String> {
        let api = hidapi::HidApi::new().map_err(|e| format!("hidapi init failed: {}", e))?;

        // Find and open the SOOMFON device
        let device = api
            .open(SOOMFON_VID, SOOMFON_PID)
            .map_err(|e| format!("hidapi open failed: {}", e))?;

        // Get feature report with report ID 0
        let mut buf = [0u8; 512];
        buf[0] = 0; // Report ID

        let n = device
            .get_feature_report(&mut buf)
            .map_err(|e| format!("get_feature_report failed: {}", e))?;

        let version = std::str::from_utf8(&buf[1..n])
            .unwrap_or("")
            .trim_matches('\0')
            .to_string();

        Ok(version)
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
        self.state == ConnectionState::Connected || self.state == ConnectionState::Initialized
    }

    /// Check if device is initialized and ready for events
    pub fn is_initialized(&self) -> bool {
        self.initialized && self.state == ConnectionState::Initialized
    }

    /// Set auto-reconnect behavior
    pub fn set_auto_reconnect(&mut self, enabled: bool) {
        self.auto_reconnect = enabled;
    }

    /// Get or initialize the USB context
    fn get_or_init_context(&mut self) -> HidResult<&Context> {
        if self.context.is_none() {
            let ctx = Context::new().map_err(|e| HidError::OpenFailed(e.to_string()))?;
            self.context = Some(ctx);
        }
        Ok(self.context.as_ref().unwrap())
    }

    /// Enumerate all SOOMFON devices
    pub fn enumerate_devices(&mut self) -> HidResult<Vec<DeviceInfo>> {
        let ctx = self.get_or_init_context()?;

        let devices: Vec<DeviceInfo> = ctx
            .devices()
            .map_err(|e| HidError::OpenFailed(e.to_string()))?
            .iter()
            .filter_map(|device| {
                let desc = device.device_descriptor().ok()?;
                if desc.vendor_id() == SOOMFON_VID && desc.product_id() == SOOMFON_PID {
                    // Get string descriptors if possible
                    let handle = device.open().ok();
                    let (serial, manufacturer, product) = if let Some(ref h) = handle {
                        (
                            h.read_serial_number_string_ascii(&desc).ok(),
                            h.read_manufacturer_string_ascii(&desc).ok(),
                            h.read_product_string_ascii(&desc).ok(),
                        )
                    } else {
                        (None, None, None)
                    };

                    Some(DeviceInfo {
                        path: format!(
                            "{}:{}:{}",
                            device.bus_number(),
                            device.address(),
                            device.port_number()
                        ),
                        serial_number: serial,
                        manufacturer,
                        product,
                        firmware_version: None,
                    })
                } else {
                    None
                }
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

        // Create new context for this connection
        let ctx = Context::new().map_err(|e| HidError::OpenFailed(e.to_string()))?;

        // Find the device
        let device = ctx
            .devices()
            .map_err(|e| HidError::OpenFailed(e.to_string()))?
            .iter()
            .find(|d| {
                d.device_descriptor().map_or(false, |desc| {
                    desc.vendor_id() == SOOMFON_VID && desc.product_id() == SOOMFON_PID
                })
            })
            .ok_or(HidError::DeviceNotFound)?;

        let desc = device
            .device_descriptor()
            .map_err(|e| HidError::OpenFailed(e.to_string()))?;

        // Open the device
        let handle = device
            .open()
            .map_err(|e| HidError::OpenFailed(e.to_string()))?;

        // Get device info
        let serial = handle.read_serial_number_string_ascii(&desc).ok();
        let manufacturer = handle.read_manufacturer_string_ascii(&desc).ok();
        let product = handle.read_product_string_ascii(&desc).ok();

        let device_info = DeviceInfo {
            path: format!(
                "{}:{}:{}",
                device.bus_number(),
                device.address(),
                device.port_number()
            ),
            serial_number: serial,
            manufacturer,
            product,
            firmware_version: None,
        };

        // Claim interface 0 (vendor interface)
        // On Windows, we may need to detach kernel driver first
        #[cfg(not(target_os = "windows"))]
        {
            if handle.kernel_driver_active(VENDOR_INTERFACE).unwrap_or(false) {
                handle
                    .detach_kernel_driver(VENDOR_INTERFACE)
                    .map_err(|e| HidError::ClaimFailed(e.to_string()))?;
            }
        }

        handle
            .claim_interface(VENDOR_INTERFACE)
            .map_err(|e| HidError::ClaimFailed(e.to_string()))?;

        self.context = Some(ctx);
        self.handle = Some(handle);
        self.device_info = Some(device_info.clone());
        self.state = ConnectionState::Connected;
        self.initialized = false;

        log::info!("Connected to SOOMFON device: {:?}", device_info.path);
        Ok(device_info)
    }

    /// Initialize the device (required before events will be sent)
    ///
    /// This performs the initialization sequence discovered from mirajazz library:
    /// 1. CRT..DIS (display init)
    /// 2. CRT..LIG (set brightness)
    /// 3. CRT..STP (stop/commit - CRITICAL for enabling events)
    /// 4. CRT..CLE (clear screens - CRITICAL for enabling events)
    ///
    /// Note: Feature report and QUCMD/CONNECT are NOT required for events.
    pub fn initialize(&mut self) -> HidResult<String> {
        if !self.is_connected() {
            return Err(HidError::NotConnected);
        }

        let handle = self.handle.as_ref().ok_or(HidError::NotConnected)?;

        log::info!("Initializing SOOMFON device (mirajazz-compatible sequence)...");

        // Try to get firmware version (optional - doesn't affect event mode)
        let firmware_version = match Self::get_feature_report_via_hidapi() {
            Ok(version) => {
                log::info!("Firmware version: {}", version);
                Some(version)
            }
            Err(e) => {
                log::debug!("Feature report failed (not critical): {}", e);
                // Try rusb fallback
                let mut report_buf = [0u8; FEATURE_REPORT_SIZE];
                match handle.read_control(0xA1, 0x01, 0x0100, 0x0000, &mut report_buf, USB_TIMEOUT) {
                    Ok(n) => {
                        let version = std::str::from_utf8(&report_buf[..n])
                            .unwrap_or("")
                            .trim_matches('\0')
                            .to_string();
                        log::info!("Firmware version (rusb): {}", version);
                        Some(version)
                    }
                    Err(_) => None,
                }
            }
        };

        // Update device info with firmware version
        if let Some(ref version) = firmware_version {
            if let Some(ref mut info) = self.device_info {
                info.firmware_version = Some(version.clone());
            }
        }

        // Step 1: CRT..DIS (display init)
        log::info!("Sending CRT..DIS (display init)");
        self.send_command(&build_display_init_packet())?;
        std::thread::sleep(Duration::from_millis(50));
        self.drain_responses();

        // Step 2: CRT..LIG (brightness 50%)
        log::info!("Sending CRT..LIG (brightness 50)");
        self.send_command(&build_brightness_packet(50))?;
        std::thread::sleep(Duration::from_millis(50));
        self.drain_responses();

        // Step 3: CRT..STP (stop/commit) - CRITICAL for enabling button events!
        log::info!("Sending CRT..STP (commit)");
        self.send_command(&build_stp_packet())?;
        std::thread::sleep(Duration::from_millis(50));
        self.drain_responses();

        // Step 4: CRT..CLE (clear screens) - CRITICAL for enabling button events!
        log::info!("Sending CRT..CLE (clear screens)");
        self.send_command(&build_clear_screens_packet())?;
        std::thread::sleep(Duration::from_millis(50));
        self.drain_responses();

        self.initialized = true;
        self.state = ConnectionState::Initialized;
        log::info!("Device initialized successfully - button events enabled!");

        Ok(firmware_version.unwrap_or_default())
    }

    /// Disconnect from the device
    pub fn disconnect(&mut self) {
        log::info!("Disconnecting from SOOMFON device...");

        // Send shutdown sequence if connected
        if self.is_connected() {
            let _ = self.shutdown();
        }

        // Release interface
        if let Some(ref handle) = self.handle {
            let _ = handle.release_interface(VENDOR_INTERFACE);
        }

        self.handle = None;
        self.context = None;
        self.device_info = None;
        self.state = ConnectionState::Disconnected;
        self.initialized = false;

        log::info!("Disconnected from SOOMFON device");
    }

    /// Send shutdown sequence to device
    pub fn shutdown(&mut self) -> HidResult<()> {
        if !self.is_connected() {
            return Err(HidError::NotConnected);
        }

        log::info!("Sending shutdown sequence...");

        // CRT..CLE.DC - Clear LCD displays
        let _ = self.send_command(&build_clear_lcd_packet());
        std::thread::sleep(Duration::from_millis(50));

        // CRT..CLB.DC - Clear button states
        let _ = self.send_command(&build_clear_buttons_packet());
        std::thread::sleep(Duration::from_millis(50));

        // CRT..HAH - Halt device
        let _ = self.send_command(&build_halt_packet());

        Ok(())
    }

    /// Send a CRT command packet to the device
    pub fn send_command(&self, packet: &[u8; CRT_PACKET_SIZE]) -> HidResult<usize> {
        let handle = self.handle.as_ref().ok_or(HidError::NotConnected)?;

        let bytes_written = handle
            .write_interrupt(EP_OUT, packet, USB_TIMEOUT)
            .map_err(|e| HidError::WriteFailed(e.to_string()))?;

        Ok(bytes_written)
    }

    /// Read a response/event packet from the device (non-blocking-ish)
    pub fn read_response(&self) -> HidResult<Option<Vec<u8>>> {
        self.read_response_timeout(Duration::from_millis(100))
    }

    /// Drain all pending responses from the device
    fn drain_responses(&self) {
        // Read until we get a timeout (no more data)
        for _ in 0..5 {
            match self.read_response_timeout(Duration::from_millis(50)) {
                Ok(Some(data)) => {
                    log::trace!("Drained {} bytes", data.len());
                }
                _ => break,
            }
        }
    }

    /// Read a response/event packet with timeout
    pub fn read_response_timeout(&self, timeout: Duration) -> HidResult<Option<Vec<u8>>> {
        let handle = self.handle.as_ref().ok_or(HidError::NotConnected)?;

        let mut buf = [0u8; CRT_PACKET_SIZE]; // Use larger buffer
        match handle.read_interrupt(EP_IN, &mut buf, timeout) {
            Ok(0) => Ok(None),
            Ok(n) => {
                log::trace!("Read {} bytes from device", n);
                if n >= 11 {
                    log::debug!(
                        "Raw data: {:02X} {:02X} {:02X} ... {:02X} {:02X}",
                        buf[0], buf[1], buf[2], buf[9], buf[10]
                    );
                }
                Ok(Some(buf[..n].to_vec()))
            }
            Err(rusb::Error::Timeout) => Ok(None),
            Err(e) => Err(HidError::ReadFailed(e.to_string())),
        }
    }

    /// Poll for events (returns parsed DeviceEvent if available)
    pub fn poll_event(&self) -> HidResult<Option<DeviceEvent>> {
        if !self.is_initialized() {
            return Err(HidError::NotInitialized);
        }

        match self.read_response()? {
            Some(data) => {
                if let Some(raw_event) = parse_ack_packet(&data) {
                    Ok(raw_event.parse())
                } else {
                    Ok(None)
                }
            }
            None => Ok(None),
        }
    }

    /// Poll for events with timeout
    pub fn poll_event_timeout(&self, timeout: Duration) -> HidResult<Option<DeviceEvent>> {
        if !self.is_initialized() {
            return Err(HidError::NotInitialized);
        }

        match self.read_response_timeout(timeout)? {
            Some(data) => {
                if let Some(raw_event) = parse_ack_packet(&data) {
                    Ok(raw_event.parse())
                } else {
                    Ok(None)
                }
            }
            None => Ok(None),
        }
    }

    /// Take ownership of the device handle for event polling
    ///
    /// This transfers the handle to the polling thread for direct USB reads.
    /// After calling this, the manager will need to reopen the device for commands.
    pub fn take_polling_handle(&mut self) -> HidResult<DeviceHandle<Context>> {
        let handle = self.handle.take().ok_or(HidError::NotConnected)?;
        log::info!("Transferred device handle for event polling");
        Ok(handle)
    }

    /// Reopen device handle for sending commands
    ///
    /// Call this after take_polling_handle() if you need to send commands.
    pub fn reopen_for_commands(&mut self) -> HidResult<()> {
        if self.handle.is_some() {
            return Ok(()); // Already have a handle
        }

        let ctx = self.context.as_ref().ok_or(HidError::NotConnected)?;

        let device = ctx
            .devices()
            .map_err(|e| HidError::OpenFailed(e.to_string()))?
            .iter()
            .find(|d| {
                d.device_descriptor().map_or(false, |desc| {
                    desc.vendor_id() == SOOMFON_VID && desc.product_id() == SOOMFON_PID
                })
            })
            .ok_or(HidError::DeviceNotFound)?;

        let handle = device
            .open()
            .map_err(|e| HidError::OpenFailed(e.to_string()))?;

        // Claim interface
        #[cfg(not(target_os = "windows"))]
        {
            if handle.kernel_driver_active(VENDOR_INTERFACE).unwrap_or(false) {
                handle
                    .detach_kernel_driver(VENDOR_INTERFACE)
                    .map_err(|e| HidError::ClaimFailed(e.to_string()))?;
            }
        }

        handle
            .claim_interface(VENDOR_INTERFACE)
            .map_err(|e| HidError::ClaimFailed(e.to_string()))?;

        self.handle = Some(handle);
        log::info!("Reopened device handle for commands");
        Ok(())
    }

    /// Send keepalive (CRT..CONNECT)
    pub fn send_keepalive(&self) -> HidResult<()> {
        if !self.is_connected() {
            return Err(HidError::NotConnected);
        }

        self.send_command(&build_connect_packet())?;
        Ok(())
    }

    /// Set display brightness
    pub fn set_brightness(&self, level: u8) -> HidResult<()> {
        if !self.is_connected() {
            return Err(HidError::NotConnected);
        }

        self.send_command(&build_brightness_packet(level))?;
        Ok(())
    }

    // =========================================================================
    // Legacy hidapi-compatible methods (for backwards compatibility)
    // =========================================================================

    /// Write data to the device (legacy method)
    #[deprecated(note = "Use send_command() instead")]
    pub fn write(&self, data: &[u8]) -> HidResult<usize> {
        let handle = self.handle.as_ref().ok_or(HidError::NotConnected)?;

        // Pad to CRT_PACKET_SIZE
        let mut packet = [0u8; CRT_PACKET_SIZE];
        let len = data.len().min(CRT_PACKET_SIZE);
        packet[..len].copy_from_slice(&data[..len]);

        handle
            .write_interrupt(EP_OUT, &packet, USB_TIMEOUT)
            .map_err(|e| HidError::WriteFailed(e.to_string()))
    }

    /// Read data from the device (legacy method)
    #[deprecated(note = "Use poll_event() instead")]
    pub fn read(&self) -> HidResult<Option<Vec<u8>>> {
        self.read_response()
    }

    /// Read data with timeout (legacy method)
    #[deprecated(note = "Use poll_event_timeout() instead")]
    pub fn read_timeout(&self, timeout_ms: i32) -> HidResult<Option<Vec<u8>>> {
        self.read_response_timeout(Duration::from_millis(timeout_ms as u64))
    }

    /// Send feature report (legacy - uses control transfer)
    pub fn send_feature_report(&self, data: &[u8]) -> HidResult<()> {
        let handle = self.handle.as_ref().ok_or(HidError::NotConnected)?;

        // HID Set Feature Report
        // bmRequestType: 0x21 (Host-to-device, Class, Interface)
        // bRequest: 0x09 (SET_REPORT)
        // wValue: 0x0300 (Feature report, Report ID from data[0])
        let report_id = data.first().copied().unwrap_or(0);
        let w_value = 0x0300 | (report_id as u16);

        handle
            .write_control(0x21, 0x09, w_value, 0x0000, data, USB_TIMEOUT)
            .map_err(|e| HidError::WriteFailed(e.to_string()))?;

        Ok(())
    }

    /// Get feature report (legacy - uses control transfer)
    pub fn get_feature_report(&self, report_id: u8, length: usize) -> HidResult<Vec<u8>> {
        let handle = self.handle.as_ref().ok_or(HidError::NotConnected)?;

        let mut buf = vec![0u8; length];
        buf[0] = report_id;

        let w_value = 0x0300 | (report_id as u16);

        let bytes_read = handle
            .read_control(0xA1, 0x01, w_value, 0x0000, &mut buf, USB_TIMEOUT)
            .map_err(|e| HidError::ReadFailed(e.to_string()))?;

        buf.truncate(bytes_read);
        Ok(buf)
    }
}

impl Default for HidManager {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for HidManager {
    fn drop(&mut self) {
        self.disconnect();
    }
}
