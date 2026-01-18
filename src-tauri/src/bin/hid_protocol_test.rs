//! HID Protocol Test - Uses correct SOOMFON protocol with hidapi
//!
//! Run with: cargo run --bin hid_protocol_test

use hidapi::HidApi;
use std::time::Duration;

const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;
const VENDOR_USAGE_PAGE: u16 = 0xffa0;

fn main() {
    println!("=== SOOMFON HID Protocol Test ===\n");

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

    // List all SOOMFON interfaces
    println!("\n[INFO] SOOMFON interfaces found:");
    for dev in api.device_list() {
        if dev.vendor_id() == SOOMFON_VID && dev.product_id() == SOOMFON_PID {
            println!("  Path: {}", dev.path().to_string_lossy());
            println!("    Usage Page: 0x{:04X}, Usage: 0x{:04X}",
                     dev.usage_page(), dev.usage());
            println!("    Interface: {}", dev.interface_number());
            println!();
        }
    }

    // Open vendor interface
    let device_info = api
        .device_list()
        .find(|d| {
            d.vendor_id() == SOOMFON_VID
            && d.product_id() == SOOMFON_PID
            && d.usage_page() == VENDOR_USAGE_PAGE
        });

    let path = match device_info {
        Some(info) => {
            println!("[OK] Found vendor interface");
            info.path().to_owned()
        }
        None => {
            eprintln!("[ERROR] Vendor interface not found!");
            return;
        }
    };

    let device = match api.open_path(&path) {
        Ok(dev) => {
            println!("[OK] Device opened");
            dev
        }
        Err(e) => {
            eprintln!("[ERROR] Failed to open: {}", e);
            return;
        }
    };

    // Set non-blocking for reads
    device.set_blocking_mode(false).ok();

    // Try sending CRT CONNECT initialization
    println!("\n[INFO] Sending CRT CONNECT initialization...");

    // Build CRT CONNECT packet (1024 bytes based on protocol)
    // First byte is report ID (0x00 for default)
    let mut crt_packet = vec![0u8; 1025]; // +1 for report ID
    crt_packet[0] = 0x00; // Report ID
    crt_packet[1..4].copy_from_slice(b"CRT");
    crt_packet[4] = 0x00;
    crt_packet[5] = 0x00;
    crt_packet[6..13].copy_from_slice(b"CONNECT");

    match device.write(&crt_packet) {
        Ok(n) => println!("[OK] Sent CRT CONNECT ({} bytes)", n),
        Err(e) => println!("[WARN] CRT CONNECT failed: {}", e),
    }

    // Try feature report approach
    println!("[INFO] Trying feature report...");
    match device.send_feature_report(&crt_packet) {
        Ok(()) => println!("[OK] Feature report sent"),
        Err(e) => println!("[INFO] Feature report: {}", e),
    }

    // Read response
    let mut buf = [0u8; 1024];
    std::thread::sleep(Duration::from_millis(100));

    match device.read_timeout(&mut buf, 500) {
        Ok(n) if n > 0 => {
            println!("[OK] Received {} bytes response:", n);
            print_hex(&buf[..n.min(32)]);
        }
        Ok(_) => println!("[INFO] No response received"),
        Err(e) => println!("[INFO] Read: {}", e),
    }

    // Also try getting a feature report
    println!("[INFO] Trying to get feature report...");
    let mut feature_buf = vec![0u8; 1025];
    feature_buf[0] = 0x00; // Report ID
    match device.get_feature_report(&mut feature_buf) {
        Ok(n) => {
            println!("[OK] Got feature report ({} bytes):", n);
            print_hex(&feature_buf[..n.min(32)]);
        }
        Err(e) => println!("[INFO] Get feature report: {}", e),
    }

    println!("\n=================================");
    println!("  Listening for events...");
    println!("  Press buttons or turn dials");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    // Main loop
    let mut event_count = 0u64;
    let mut last_send = std::time::Instant::now();

    loop {
        // Periodically send keep-alive (CRT packets every 10s like official software)
        if last_send.elapsed() > Duration::from_secs(10) {
            match device.write(&crt_packet) {
                Ok(_) => println!("[KEEPALIVE] Sent CRT packet"),
                Err(_) => {}
            }
            last_send = std::time::Instant::now();
        }

        // Read any incoming data
        match device.read_timeout(&mut buf, 100) {
            Ok(n) if n > 0 => {
                event_count += 1;
                println!("--- Event #{} ({} bytes) ---", event_count, n);
                print_hex(&buf[..n.min(32)]);
                decode_event(&buf[..n]);
                println!();
            }
            Ok(_) => {}
            Err(e) => {
                eprintln!("[ERROR] Read error: {}", e);
                break;
            }
        }

        std::thread::sleep(Duration::from_millis(1));
    }
}

fn print_hex(data: &[u8]) {
    print!("  ");
    for (i, byte) in data.iter().enumerate() {
        print!("{:02X} ", byte);
        if (i + 1) % 16 == 0 {
            println!();
            print!("  ");
        }
    }
    if data.len() % 16 != 0 {
        println!();
    }
}

fn decode_event(data: &[u8]) {
    // Check for ACK packet format
    if data.len() >= 11 && &data[0..3] == b"ACK" && &data[5..7] == b"OK" {
        let event_id = data[9];
        let state = data[10];

        let event_name = match event_id {
            0x01..=0x09 => format!("Button {}", event_id),
            0x50 => "Dial Right (CW)".to_string(),
            0x51 => "Dial Left (CCW)".to_string(),
            _ => format!("Unknown (0x{:02X})", event_id),
        };

        let state_name = match state {
            0x00 => "Release",
            0x01 => "Press",
            _ => "Unknown",
        };

        println!("  >>> {}: {}", event_name, state_name);
    }
    // Check for CRT packet format
    else if data.len() >= 12 && &data[0..3] == b"CRT" {
        println!("  >>> CRT packet received");
    }
}
