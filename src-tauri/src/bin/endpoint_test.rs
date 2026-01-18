//! Direct Endpoint Test - Uses exact endpoints from device scan
//!
//! Run with: cargo run --bin endpoint_test

use rusb::{Context, Device, UsbContext};
use std::time::Duration;

const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;

// Exact endpoints from device scan
const EP_IN: u8 = 0x82;   // IN Interrupt, 512 bytes max
const EP_OUT: u8 = 0x03;  // OUT Interrupt, 1024 bytes max
const BUF_SIZE: usize = 1024; // Use larger buffer to be safe

const TIMEOUT: Duration = Duration::from_millis(100);

fn main() {
    println!("=== SOOMFON Direct Endpoint Test ===\n");

    let context = Context::new().expect("Failed to create USB context");

    let device = find_device(&context).expect("Device not found");
    println!("[OK] Found device");

    let handle = device.open().expect("Failed to open device");
    println!("[OK] Opened device");

    // Claim interface 0
    if let Err(e) = handle.claim_interface(0) {
        eprintln!("[ERROR] Failed to claim interface: {}", e);
        eprintln!("        Close any other software using the device");
        return;
    }
    println!("[OK] Claimed interface 0");

    // Build CRT CONNECT packet (1024 bytes for EP_OUT)
    let mut crt_packet = [0u8; 1024];
    crt_packet[0..3].copy_from_slice(b"CRT");
    crt_packet[3] = 0x00;
    crt_packet[4] = 0x00;
    crt_packet[5..12].copy_from_slice(b"CONNECT");

    println!("\n[INFO] Sending CRT CONNECT on endpoint 0x{:02X}...", EP_OUT);
    match handle.write_interrupt(EP_OUT, &crt_packet, TIMEOUT) {
        Ok(n) => println!("[OK] Sent {} bytes", n),
        Err(e) => println!("[WARN] Write failed: {}", e),
    }

    // Try to read response on EP_IN
    let mut buf = [0u8; BUF_SIZE];
    println!("[INFO] Reading from endpoint 0x{:02X}...", EP_IN);
    match handle.read_interrupt(EP_IN, &mut buf, Duration::from_millis(500)) {
        Ok(n) if n > 0 => {
            println!("[OK] Received {} bytes:", n);
            print_hex(&buf[..n.min(64)]);
        }
        Ok(_) => println!("[INFO] No data received"),
        Err(e) => println!("[INFO] Read: {}", e),
    }

    // Now let's try continuous reading
    println!("\n=================================");
    println!("  Listening on EP 0x{:02X}...", EP_IN);
    println!("  Press buttons or turn dials");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    let mut event_count = 0u64;
    let mut keepalive_timer = std::time::Instant::now();

    loop {
        // Send periodic CRT keepalive
        if keepalive_timer.elapsed() > Duration::from_secs(5) {
            match handle.write_interrupt(EP_OUT, &crt_packet, TIMEOUT) {
                Ok(_) => print!("."), // Dot for keepalive
                Err(_) => print!("x"), // x for failed keepalive
            }
            use std::io::Write;
            std::io::stdout().flush().ok();
            keepalive_timer = std::time::Instant::now();
        }

        // Read from IN endpoint
        match handle.read_interrupt(EP_IN, &mut buf, TIMEOUT) {
            Ok(n) if n > 0 => {
                event_count += 1;
                println!("\n--- Event #{} ({} bytes) ---", event_count, n);
                print_hex(&buf[..n.min(64)]);
                decode_packet(&buf[..n]);
            }
            Ok(_) => {}
            Err(rusb::Error::Timeout) => {}
            Err(rusb::Error::NoDevice) => {
                eprintln!("\n[ERROR] Device disconnected!");
                break;
            }
            Err(e) => {
                eprintln!("\n[ERROR] Read error: {}", e);
                std::thread::sleep(Duration::from_millis(100));
            }
        }
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
    if data.len() >= 3 {
        let header = String::from_utf8_lossy(&data[0..3]);
        println!("  Header: '{}'", header);
    }

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
    } else if data.len() >= 3 && &data[0..3] == b"CRT" {
        println!("  >>> CRT response packet");
    }
}
