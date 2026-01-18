//! Poll Test - Try polling for button states
//!
//! Run with: cargo run --bin poll_test

use hidapi::HidApi;
use std::time::Duration;

const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;
const VENDOR_USAGE_PAGE: u16 = 0xffa0;

fn main() {
    println!("=== SOOMFON Poll Test ===\n");

    let api = HidApi::new().expect("Failed to init HID API");

    let device = api
        .device_list()
        .find(|d| {
            d.vendor_id() == SOOMFON_VID
            && d.product_id() == SOOMFON_PID
            && d.usage_page() == VENDOR_USAGE_PAGE
        })
        .map(|info| api.open_path(info.path()))
        .expect("Device not found")
        .expect("Failed to open device");

    println!("[OK] Device opened\n");

    // Try different packet formats to poll the device
    let test_packets: Vec<(&str, Vec<u8>)> = vec![
        // Empty read first (maybe device has pending data)
        ("Empty poll", vec![0x00]),

        // ACK poll packet
        ("ACK poll", {
            let mut p = vec![0u8; 513];
            p[0] = 0x00; // Report ID
            p[1..4].copy_from_slice(b"ACK");
            p[6..8].copy_from_slice(b"OK");
            p
        }),

        // Simple status query
        ("Status query", vec![0x00, 0x00]),

        // Try report ID 1
        ("Report ID 1", vec![0x01]),

        // Try report ID 2
        ("Report ID 2", vec![0x02]),
    ];

    let mut buf = [0u8; 1024];

    // First, just try reading without sending anything
    println!("[TEST] Reading without sending anything first...");
    device.set_blocking_mode(false).ok();

    for _ in 0..10 {
        match device.read_timeout(&mut buf, 100) {
            Ok(n) if n > 0 => {
                println!("[!!] Got {} bytes without sending:", n);
                print_hex(&buf[..n.min(32)]);
            }
            _ => {}
        }
    }
    println!("  No unsolicited data received\n");

    // Now try each test packet
    for (name, packet) in &test_packets {
        println!("[TEST] {}: sending {} bytes", name, packet.len());

        match device.write(packet) {
            Ok(n) => {
                println!("  Sent {} bytes", n);

                // Try to read response
                std::thread::sleep(Duration::from_millis(50));
                match device.read_timeout(&mut buf, 200) {
                    Ok(n) if n > 0 => {
                        println!("  [!!] Got {} bytes response:", n);
                        print_hex(&buf[..n.min(64)]);
                    }
                    Ok(_) => println!("  No response"),
                    Err(e) => println!("  Read error: {}", e),
                }
            }
            Err(e) => println!("  Write error: {}", e),
        }
        println!();
    }

    // Now let's try a continuous poll with button-state request
    println!("\n=================================");
    println!("  Continuous polling mode...");
    println!("  Press buttons while this runs");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    // Build a poll packet
    let mut poll_packet = vec![0u8; 513];
    poll_packet[0] = 0x00;
    poll_packet[1..4].copy_from_slice(b"ACK");
    poll_packet[6..8].copy_from_slice(b"OK");
    poll_packet[9] = 0x00; // Request status
    poll_packet[10] = 0x00;

    let mut last_data = vec![0u8; 64];

    loop {
        // Send poll request
        if let Ok(_) = device.write(&poll_packet) {
            // Read response
            if let Ok(n) = device.read_timeout(&mut buf, 50) {
                if n > 0 && buf[..n] != last_data[..n.min(last_data.len())] {
                    println!("Data changed ({} bytes):", n);
                    print_hex(&buf[..n.min(32)]);

                    // Decode if ACK format
                    if n >= 11 && &buf[0..3] == b"ACK" {
                        let event_id = buf[9];
                        let state = buf[10];
                        println!("  Event ID: 0x{:02X}, State: 0x{:02X}", event_id, state);
                    }
                    println!();

                    last_data = buf[..n].to_vec();
                }
            }
        }

        std::thread::sleep(Duration::from_millis(10));
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
