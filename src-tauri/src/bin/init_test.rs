//! Full Initialization Test - Replicates official software init sequence
//!
//! Run with: cargo run --bin init_test

use rusb::{Context, Device, DeviceHandle, UsbContext};
use std::time::Duration;

const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;

const EP_IN: u8 = 0x82;
const EP_OUT: u8 = 0x03;
const BUF_SIZE: usize = 1024;
const TIMEOUT: Duration = Duration::from_millis(500);

fn main() {
    println!("=== SOOMFON Full Init Test ===\n");

    let context = Context::new().expect("Failed to create USB context");
    let device = find_device(&context).expect("Device not found");
    println!("[OK] Found device");

    let handle = device.open().expect("Failed to open device");
    println!("[OK] Opened device");

    // Try setting USB configuration first
    println!("\n[STEP 0] USB-level setup...");

    // Get current configuration
    match handle.active_configuration() {
        Ok(config) => println!("  Active configuration: {}", config),
        Err(e) => println!("  Could not get active config: {}", e),
    }

    // Try to set configuration 1 (might already be set)
    match handle.set_active_configuration(1) {
        Ok(()) => println!("  [OK] Set configuration 1"),
        Err(e) => println!("  [INFO] Set configuration: {}", e),
    }

    // Claim interface 0
    handle.claim_interface(0).expect("Failed to claim interface");
    println!("[OK] Claimed interface 0");

    // Try setting alternate interface
    match handle.set_alternate_setting(0, 0) {
        Ok(()) => println!("  [OK] Set alternate setting 0"),
        Err(e) => println!("  [INFO] Set alternate setting: {}", e),
    }

    // Try clear halt on the IN endpoint
    println!("  Clearing halt on EP 0x82...");
    match handle.clear_halt(EP_IN) {
        Ok(()) => println!("  [OK] Cleared halt on EP_IN"),
        Err(e) => println!("  [INFO] Clear halt: {}", e),
    }

    // Try various HID class requests to enable event mode
    println!("\n[STEP 1] Trying HID class requests to enable event mode...");

    let mut report_buf = [0u8; 512];

    // Try SET_IDLE (bRequest=0x0A) - tells device to send reports at a rate
    // This is commonly needed for HID devices to start sending input reports
    println!("\n  Trying SET_IDLE...");
    match handle.write_control(
        0x21,           // bmRequestType: Host-to-device, Class, Interface
        0x0A,           // bRequest: SET_IDLE
        0x0000,         // wValue: Duration=0 (infinite), Report ID=0
        0x0000,         // wIndex: Interface 0
        &[],            // No data
        TIMEOUT
    ) {
        Ok(_) => println!("  [OK] SET_IDLE succeeded"),
        Err(e) => println!("  [INFO] SET_IDLE: {}", e),
    }

    // Try SET_PROTOCOL (bRequest=0x0B) - boot protocol vs report protocol
    println!("\n  Trying SET_PROTOCOL (Report Protocol)...");
    match handle.write_control(
        0x21,           // bmRequestType: Host-to-device, Class, Interface
        0x0B,           // bRequest: SET_PROTOCOL
        0x0001,         // wValue: 1 = Report Protocol (0 = Boot Protocol)
        0x0000,         // wIndex: Interface 0
        &[],
        TIMEOUT
    ) {
        Ok(_) => println!("  [OK] SET_PROTOCOL succeeded"),
        Err(e) => println!("  [INFO] SET_PROTOCOL: {}", e),
    }

    // Try GET_REPORT with Input type (0x0100) instead of Feature (0x0300)
    println!("\n  Trying GET_REPORT (Input)...");
    match handle.read_control(
        0xA1,           // bmRequestType: Device-to-host, Class, Interface
        0x01,           // bRequest: GET_REPORT
        0x0100,         // wValue: Input report (0x01), Report ID 0
        0x0000,         // wIndex: Interface 0
        &mut report_buf,
        TIMEOUT
    ) {
        Ok(n) => {
            println!("  [OK] Got input report ({} bytes):", n);
            if let Ok(s) = std::str::from_utf8(&report_buf[..n]) {
                println!("    Response: {}", s.trim_matches('\0'));
            } else {
                print_hex(&report_buf[..n.min(32)]);
            }
        }
        Err(e) => println!("  [INFO] GET_REPORT (Input): {}", e),
    }

    // Try GET_REPORT with Feature type
    println!("\n  Trying GET_REPORT (Feature)...");
    match handle.read_control(
        0xA1, 0x01, 0x0300, 0x0000, &mut report_buf, TIMEOUT
    ) {
        Ok(n) => {
            println!("  [OK] Got feature report ({} bytes):", n);
            if let Ok(s) = std::str::from_utf8(&report_buf[..n]) {
                println!("    Response: {}", s.trim_matches('\0'));
            }
        }
        Err(e) => println!("  [INFO] GET_REPORT (Feature): {}", e),
    }

    // Try vendor-specific control transfers that might enable event mode
    println!("\n  Trying vendor-specific requests...");

    // Vendor request to device
    for req in [0x00u8, 0x01, 0x09, 0x0A] {
        match handle.read_control(
            0xC0,  // bmRequestType: Device-to-host, Vendor, Device
            req,   // bRequest
            0x0000,
            0x0000,
            &mut report_buf,
            Duration::from_millis(100)
        ) {
            Ok(n) if n > 0 => {
                println!("  [OK] Vendor request 0x{:02X} returned {} bytes:", req, n);
                print_hex(&report_buf[..n.min(32)]);
            }
            _ => {}
        }
    }

    // Vendor request to interface
    for req in [0x00u8, 0x01, 0x09, 0x0A] {
        match handle.read_control(
            0xC1,  // bmRequestType: Device-to-host, Vendor, Interface
            req,
            0x0000,
            0x0000,
            &mut report_buf,
            Duration::from_millis(100)
        ) {
            Ok(n) if n > 0 => {
                println!("  [OK] Vendor/Interface request 0x{:02X} returned {} bytes:", req, n);
                print_hex(&report_buf[..n.min(32)]);
            }
            _ => {}
        }
    }

    // Step 2: Send CRT..DIS (Display init)
    println!("\n[STEP 2] Sending CRT..DIS...");
    let mut dis_packet = [0u8; BUF_SIZE];
    dis_packet[0..3].copy_from_slice(b"CRT");
    dis_packet[5..8].copy_from_slice(b"DIS");

    send_and_receive(&handle, &dis_packet, "DIS");

    // Step 3: Send CRT..LIG (Brightness = 100)
    println!("\n[STEP 3] Sending CRT..LIG (brightness 100)...");
    let mut lig_packet = [0u8; BUF_SIZE];
    lig_packet[0..3].copy_from_slice(b"CRT");
    lig_packet[5..8].copy_from_slice(b"LIG");
    lig_packet[10] = 0x64; // 100 decimal = 100% brightness

    send_and_receive(&handle, &lig_packet, "LIG");

    // Step 4: Send CRT..QUCMD
    println!("\n[STEP 4] Sending CRT..QUCMD...");
    let mut qucmd_packet = [0u8; BUF_SIZE];
    qucmd_packet[0..3].copy_from_slice(b"CRT");
    qucmd_packet[5..10].copy_from_slice(b"QUCMD");
    // Parameters from capture: 11 11 00 11 00 11
    qucmd_packet[10] = 0x11;
    qucmd_packet[11] = 0x11;
    qucmd_packet[12] = 0x00;
    qucmd_packet[13] = 0x11;
    qucmd_packet[14] = 0x00;
    qucmd_packet[15] = 0x11;

    send_and_receive(&handle, &qucmd_packet, "QUCMD");

    // Step 5: Send CRT..LIG again (official software sends brightness twice!)
    println!("\n[STEP 5] Sending CRT..LIG again (brightness 100)...");
    send_and_receive(&handle, &lig_packet, "LIG (2nd time)");

    // Step 6: Try sending a minimal JPEG header (official software sends images after init)
    // This might be what activates "event mode"
    println!("\n[STEP 6] Sending minimal JPEG data (to activate event mode)...");

    // Minimal 1x1 black JPEG
    let minimal_jpeg: [u8; 135] = [
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B,
    ];

    let mut jpeg_packet = [0u8; BUF_SIZE];
    jpeg_packet[..minimal_jpeg.len()].copy_from_slice(&minimal_jpeg);

    match handle.write_interrupt(EP_OUT, &jpeg_packet, TIMEOUT) {
        Ok(n) => println!("[OK] Sent JPEG data ({} bytes)", n),
        Err(e) => println!("[WARN] JPEG send failed: {}", e),
    }
    std::thread::sleep(Duration::from_millis(100));

    println!("\n=================================");
    println!("  Initialization complete!");
    println!("  Listening for button events...");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    // Main event loop
    let mut buf = [0u8; BUF_SIZE];
    let mut event_count = 0u64;

    loop {
        match handle.read_interrupt(EP_IN, &mut buf, Duration::from_millis(100)) {
            Ok(n) if n > 0 => {
                event_count += 1;
                println!("--- Event #{} ({} bytes) ---", event_count, n);
                print_hex(&buf[..n.min(64)]);
                decode_packet(&buf[..n]);
                println!();
            }
            Ok(_) => {}
            Err(rusb::Error::Timeout) => {}
            Err(rusb::Error::NoDevice) => {
                eprintln!("[ERROR] Device disconnected!");
                break;
            }
            Err(e) => {
                eprintln!("[ERROR] {}", e);
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
}

fn send_and_receive(handle: &DeviceHandle<Context>, packet: &[u8], name: &str) {
    match handle.write_interrupt(EP_OUT, packet, TIMEOUT) {
        Ok(n) => println!("[OK] Sent {} ({} bytes)", name, n),
        Err(e) => println!("[WARN] Failed to send {}: {}", name, e),
    }

    // Try to read response
    let mut buf = [0u8; BUF_SIZE];
    std::thread::sleep(Duration::from_millis(50));
    match handle.read_interrupt(EP_IN, &mut buf, Duration::from_millis(200)) {
        Ok(n) if n > 0 => {
            println!("[OK] Response ({} bytes):", n);
            print_hex(&buf[..n.min(32)]);
        }
        Ok(_) => println!("[INFO] No response"),
        Err(e) => println!("[INFO] Read: {}", e),
    }
}

fn find_device<T: UsbContext>(context: &T) -> Option<Device<T>> {
    context.devices().ok()?.iter().find(|d| {
        d.device_descriptor().map_or(false, |desc| {
            desc.vendor_id() == SOOMFON_VID && desc.product_id() == SOOMFON_PID
        })
    })
}

fn print_hex(data: &[u8]) {
    print!("  ");
    for (i, byte) in data.iter().enumerate() {
        print!("{:02X} ", byte);
        if (i + 1) % 16 == 0 && i + 1 < data.len() {
            println!();
            print!("  ");
        }
    }
    println!();
}

fn decode_packet(data: &[u8]) {
    if data.len() >= 11 && &data[0..3] == b"ACK" && &data[5..7] == b"OK" {
        let event_id = data[9];
        let state = data[10];

        let event_name = match event_id {
            // LCD Buttons (1-6)
            0x01..=0x06 => format!("LCD Button {}", event_id),
            // Small Buttons
            0x25 => "Small Button 1".to_string(),
            0x30 => "Small Button 2".to_string(),
            0x31 => "Small Button 3".to_string(),
            // Main Encoder (Dial 1)
            0x50 => "Dial 1 Left (CCW)".to_string(),
            0x51 => "Dial 1 Right (CW)".to_string(),
            0x35 => "Dial 1 Push".to_string(),
            // Side Encoder 1 (Dial 2)
            0x90 => "Dial 2 Left (CCW)".to_string(),
            0x91 => "Dial 2 Right (CW)".to_string(),
            0x33 => "Dial 2 Push".to_string(),
            // Side Encoder 2 (Dial 3)
            0x60 => "Dial 3 Left (CCW)".to_string(),
            0x61 => "Dial 3 Right (CW)".to_string(),
            0x34 => "Dial 3 Push".to_string(),
            _ => format!("Unknown (0x{:02X})", event_id),
        };

        let state_name = match state {
            0x00 => "Release",
            0x01 => "Press",
            _ => "Unknown",
        };

        println!("  >>> {}: {}", event_name, state_name);
    } else if data.len() >= 3 && &data[0..3] == b"CRT" {
        println!("  >>> CRT response");
    }
}
