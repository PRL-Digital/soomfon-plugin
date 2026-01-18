//! Test using pure hidapi (Windows HID driver) instead of rusb
//!
//! Run with: cargo run --bin hidapi_test

use hidapi::HidApi;
use std::time::Duration;

const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;

fn main() {
    println!("=== SOOMFON hidapi Test ===\n");

    let api = HidApi::new().expect("Failed to create HID API");

    // List all HID devices
    println!("Looking for SOOMFON devices...");
    let soomfon_devices: Vec<_> = api.device_list()
        .filter(|d| d.vendor_id() == SOOMFON_VID && d.product_id() == SOOMFON_PID)
        .collect();

    if soomfon_devices.is_empty() {
        println!("No SOOMFON devices found!");
        println!("\nMake sure:");
        println!("  1. Device is connected");
        println!("  2. No other application has the device open (close Tauri app!)");
        return;
    }

    for device_info in &soomfon_devices {
        println!("Found SOOMFON device:");
        println!("  Path: {:?}", device_info.path());
        println!("  Interface: {}", device_info.interface_number());
        println!("  Usage Page: 0x{:04X}", device_info.usage_page());
        println!("  Usage: 0x{:04X}", device_info.usage());
        println!("  Manufacturer: {:?}", device_info.manufacturer_string());
        println!("  Product: {:?}", device_info.product_string());
        println!();
    }

    // Find and open Interface 0 (vendor interface with Usage Page 0xFFA0)
    // Interface 1 is the keyboard which Windows locks
    println!("Looking for vendor interface (Interface 0, Usage Page 0xFFA0)...");

    let vendor_interface = soomfon_devices.iter()
        .find(|d| d.interface_number() == 0 && d.usage_page() == 0xFFA0);

    let device = match vendor_interface {
        Some(info) => {
            println!("Found vendor interface, opening by path...");
            match api.open_path(info.path()) {
                Ok(d) => {
                    println!("Opened Interface 0 successfully!");
                    d
                }
                Err(e) => {
                    println!("Failed to open vendor interface: {}", e);
                    println!("\nThis might mean another app has the device open.");
                    return;
                }
            }
        }
        None => {
            println!("Vendor interface not found!");
            println!("Available interfaces:");
            for info in &soomfon_devices {
                println!("  Interface {}: Usage Page 0x{:04X}", info.interface_number(), info.usage_page());
            }
            return;
        }
    };

    test_device(&device, 0);
}

fn test_device(device: &hidapi::HidDevice, interface: i32) {
    println!("\n--- Testing interface {} ---", interface);

    // Set non-blocking mode initially
    device.set_blocking_mode(false).ok();

    let mut read_buf = [0u8; 512];

    // ========================================
    // MIRAJAZZ-STYLE INITIALIZATION
    // Matches exactly what the working library does
    // ========================================

    println!("\n[1] Sending CRT..DIS (mirajazz style)...");
    // Exact bytes from mirajazz: 0x00, 0x43, 0x52, 0x54, 0x00, 0x00, 0x44, 0x49, 0x53
    // Which is: ReportID(0), 'C', 'R', 'T', 0, 0, 'D', 'I', 'S'
    let mut dis_packet = vec![0u8; 1025]; // 1 + 1024 for protocol v2+
    dis_packet[0] = 0x00; // Report ID
    dis_packet[1] = 0x43; // C
    dis_packet[2] = 0x52; // R
    dis_packet[3] = 0x54; // T
    dis_packet[4] = 0x00;
    dis_packet[5] = 0x00;
    dis_packet[6] = 0x44; // D
    dis_packet[7] = 0x49; // I
    dis_packet[8] = 0x53; // S

    println!("  Packet bytes 0-15: {:02X?}", &dis_packet[0..16]);
    match device.write(&dis_packet) {
        Ok(n) => println!("  [OK] Wrote {} bytes", n),
        Err(e) => println!("  [FAIL] Write failed: {}", e),
    }
    std::thread::sleep(Duration::from_millis(50));

    // Drain any response
    while let Ok(n) = device.read_timeout(&mut read_buf, 50) {
        if n == 0 { break; }
        println!("  Response: {} bytes", n);
    }

    println!("\n[2] Sending CRT..LIG brightness=50 (mirajazz style)...");
    // Exact bytes from mirajazz: 0x00, 0x43, 0x52, 0x54, 0x00, 0x00, 0x4c, 0x49, 0x47, 0x00, 0x00, percent
    let mut lig_packet = vec![0u8; 1025];
    lig_packet[0] = 0x00;  // Report ID
    lig_packet[1] = 0x43;  // C
    lig_packet[2] = 0x52;  // R
    lig_packet[3] = 0x54;  // T
    lig_packet[4] = 0x00;
    lig_packet[5] = 0x00;
    lig_packet[6] = 0x4C;  // L
    lig_packet[7] = 0x49;  // I
    lig_packet[8] = 0x47;  // G
    lig_packet[9] = 0x00;
    lig_packet[10] = 0x00;
    lig_packet[11] = 50;   // brightness percent

    println!("  Packet bytes 0-15: {:02X?}", &lig_packet[0..16]);
    match device.write(&lig_packet) {
        Ok(n) => println!("  [OK] Wrote {} bytes", n),
        Err(e) => println!("  [FAIL] Write failed: {}", e),
    }
    std::thread::sleep(Duration::from_millis(50));

    // Drain any response
    while let Ok(n) = device.read_timeout(&mut read_buf, 50) {
        if n == 0 { break; }
        println!("  Response: {} bytes", n);
    }

    // That's it for mirajazz initialization! No QUCMD, no CONNECT.
    println!("\n[INIT COMPLETE] Mirajazz-style init done (DIS + LIG only)");

    // Now poll for button events
    println!("\n=================================");
    println!("  Listening for button events...");
    println!("  Press buttons on the device!");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    device.set_blocking_mode(false).ok();
    let mut event_count = 0u64;

    loop {
        match device.read_timeout(&mut read_buf, 100) {
            Ok(0) => {} // Timeout, no data
            Ok(n) => {
                event_count += 1;
                println!("--- Event #{} ({} bytes) ---", event_count, n);
                print_hex(&read_buf[..n.min(32)]);
                decode_event(&read_buf[..n]);
                println!();
            }
            Err(e) => {
                eprintln!("Read error: {}", e);
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
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

fn decode_event(data: &[u8]) {
    // hidapi might prepend report ID, so check both with and without offset
    let check_offsets = [0usize, 1];

    for offset in check_offsets {
        if data.len() > offset + 10 {
            let d = &data[offset..];
            if d.len() >= 11 && &d[0..3] == b"ACK" && &d[5..7] == b"OK" {
                let event_id = d[9];
                let state = d[10];

                let event_name = match event_id {
                    0x01..=0x06 => format!("LCD Button {}", event_id),
                    0x25 => "Small Button 1".to_string(),
                    0x30 => "Small Button 2".to_string(),
                    0x31 => "Small Button 3".to_string(),
                    0x50 => "Dial 1 Left (CCW)".to_string(),
                    0x51 => "Dial 1 Right (CW)".to_string(),
                    0x35 => "Dial 1 Push".to_string(),
                    0x90 => "Dial 2 Left (CCW)".to_string(),
                    0x91 => "Dial 2 Right (CW)".to_string(),
                    0x33 => "Dial 2 Push".to_string(),
                    0x60 => "Dial 3 Left (CCW)".to_string(),
                    0x61 => "Dial 3 Right (CW)".to_string(),
                    0x34 => "Dial 3 Push".to_string(),
                    0 => return, // Empty event
                    _ => format!("Unknown (0x{:02X})", event_id),
                };

                let state_name = match state {
                    0x00 => "Release",
                    0x01 => "Press",
                    _ => "Unknown",
                };

                println!("  >>> {}: {}", event_name, state_name);
                return;
            }
        }
    }
}
