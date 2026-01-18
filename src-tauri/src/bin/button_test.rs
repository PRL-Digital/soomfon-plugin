//! Minimal MVP to test HID button reads from SOOMFON device
//!
//! Run with: cargo run --bin button_test
//!
//! This will connect to the vendor interface and print raw bytes whenever data is received.

use hidapi::HidApi;
use std::time::Duration;

/// SOOMFON device constants
const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;
const VENDOR_USAGE_PAGE: u16 = 0xffa0;
const REPORT_SIZE: usize = 64;

fn main() {
    println!("=== SOOMFON Button Test MVP ===\n");

    // Initialize HID API
    let api = match HidApi::new() {
        Ok(api) => {
            println!("[OK] HID API initialized");
            api
        }
        Err(e) => {
            eprintln!("[ERROR] Failed to initialize HID API: {}", e);
            return;
        }
    };

    // Find and list all SOOMFON devices
    println!("\n[INFO] Scanning for SOOMFON devices...");
    let devices: Vec<_> = api
        .device_list()
        .filter(|d| d.vendor_id() == SOOMFON_VID && d.product_id() == SOOMFON_PID)
        .collect();

    if devices.is_empty() {
        eprintln!("[ERROR] No SOOMFON devices found!");
        eprintln!("        Make sure the device is connected via USB.");
        return;
    }

    println!("[OK] Found {} SOOMFON interface(s):\n", devices.len());
    for (i, dev) in devices.iter().enumerate() {
        println!("  Interface {}:", i);
        println!("    Path: {}", dev.path().to_string_lossy());
        println!("    Usage Page: 0x{:04X}", dev.usage_page());
        println!("    Usage: 0x{:04X}", dev.usage());
        println!("    Interface Number: {}", dev.interface_number());
        let protected = dev.usage_page() == 0x0001; // Keyboard usage page
        if protected {
            println!("    ** PROTECTED BY WINDOWS (keyboard HID) **");
        }
        println!();
    }

    // Find vendor interface (usage page 0xffa0) - this is the one we can access
    let vendor_info = devices
        .iter()
        .find(|d| d.usage_page() == VENDOR_USAGE_PAGE);

    let vendor_path = match vendor_info {
        Some(info) => {
            println!("[OK] Found vendor interface (usage_page=0x{:04X})", VENDOR_USAGE_PAGE);
            info.path().to_owned()
        }
        None => {
            eprintln!("[ERROR] Could not find vendor interface!");
            return;
        }
    };

    // Open the vendor interface
    let device = match api.open_path(&vendor_path) {
        Ok(dev) => {
            println!("[OK] Opened vendor interface");
            dev
        }
        Err(e) => {
            eprintln!("[ERROR] Failed to open device: {}", e);
            return;
        }
    };

    // Set non-blocking mode
    if let Err(e) = device.set_blocking_mode(false) {
        eprintln!("[WARN] Could not set non-blocking mode: {}", e);
    }

    // Send wake display command to initialize the device
    println!("\n[INFO] Sending wake command...");
    let mut wake_packet = [0u8; REPORT_SIZE];
    wake_packet[0] = 0x00; // Report ID
    wake_packet[1] = 0x01; // WAKE_DISPLAY command
    match device.write(&wake_packet) {
        Ok(n) => println!("[OK] Wake command sent ({} bytes)", n),
        Err(e) => eprintln!("[WARN] Wake command failed: {}", e),
    }

    // Also try sending a brightness command to confirm communication
    println!("[INFO] Sending brightness command (50%)...");
    let mut brightness_packet = [0u8; REPORT_SIZE];
    brightness_packet[0] = 0x00; // Report ID
    brightness_packet[1] = 0x03; // SET_BRIGHTNESS command
    brightness_packet[2] = 50;   // 50% brightness
    match device.write(&brightness_packet) {
        Ok(n) => println!("[OK] Brightness command sent ({} bytes)", n),
        Err(e) => eprintln!("[WARN] Brightness command failed: {}", e),
    }

    println!("\n=================================");
    println!("  Listening on vendor interface...");
    println!("  Press buttons on the device...");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    // Main read loop
    let mut buf = [0u8; REPORT_SIZE];
    let mut event_count = 0u64;
    let mut last_error_time = std::time::Instant::now();

    loop {
        // Read with 100ms timeout
        match device.read_timeout(&mut buf, 100) {
            Ok(0) => {
                // No data available, continue polling
            }
            Ok(n) => {
                event_count += 1;
                print_event(event_count, &buf[..n]);
            }
            Err(e) => {
                // Only print error once per second to avoid spam
                if last_error_time.elapsed() > Duration::from_secs(1) {
                    eprintln!("[ERROR] Read failed: {}", e);
                    last_error_time = std::time::Instant::now();
                }
            }
        }

        // Small sleep to prevent CPU spinning
        std::thread::sleep(Duration::from_millis(1));
    }
}

fn print_event(count: u64, data: &[u8]) {
    println!("--- Event #{} ({} bytes) ---", count, data.len());

    // Print hex dump
    print!("  HEX: ");
    for byte in data.iter().take(20) {
        print!("{:02X} ", byte);
    }
    if data.len() > 20 {
        print!("...");
    }
    println!();

    // Print individual bytes for analysis
    println!("  Non-zero bytes:");
    for (i, byte) in data.iter().enumerate().take(16) {
        if *byte != 0 {
            println!("    [{}]: 0x{:02X} (dec: {})", i, byte, byte);
        }
    }

    println!();
}
