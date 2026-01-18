//! Bulk Transfer MVP to test SOOMFON device communication
//!
//! Run with: cargo run --bin bulk_test
//!
//! Uses rusb (libusb) for bulk/interrupt transfers.

use rusb::{Context, Device, UsbContext};
use std::time::Duration;

/// SOOMFON device constants
const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;

/// Packet sizes from protocol analysis
const ACK_PACKET_SIZE: usize = 512;
const CRT_PACKET_SIZE: usize = 1024;

/// Endpoints from device scan
const EP_IN: u8 = 0x82;   // IN Interrupt, 512 bytes (receives events)
const EP_OUT: u8 = 0x03;  // OUT Interrupt, 1024 bytes (sends commands)

/// Timeout for USB operations
const TIMEOUT: Duration = Duration::from_millis(100);

fn main() {
    println!("=== SOOMFON Bulk Transfer Test ===\n");

    // Initialize USB context
    let context = match Context::new() {
        Ok(ctx) => {
            println!("[OK] USB context initialized");
            ctx
        }
        Err(e) => {
            eprintln!("[ERROR] Failed to create USB context: {}", e);
            return;
        }
    };

    // Find SOOMFON device
    let device = match find_soomfon_device(&context) {
        Some(dev) => {
            println!("[OK] Found SOOMFON device");
            dev
        }
        None => {
            eprintln!("[ERROR] SOOMFON device not found!");
            eprintln!("        VID: 0x{:04X}, PID: 0x{:04X}", SOOMFON_VID, SOOMFON_PID);
            return;
        }
    };

    // Print device info
    if let Ok(desc) = device.device_descriptor() {
        println!("  VID: 0x{:04X}", desc.vendor_id());
        println!("  PID: 0x{:04X}", desc.product_id());
    }

    // Open device
    let handle = match device.open() {
        Ok(h) => {
            println!("[OK] Device opened");
            h
        }
        Err(e) => {
            eprintln!("[ERROR] Failed to open device: {}", e);
            eprintln!("        Try running as administrator");
            return;
        }
    };

    // Claim interface 0 (vendor HID)
    let interface_num = 0;

    #[cfg(target_os = "linux")]
    {
        if handle.kernel_driver_active(interface_num).unwrap_or(false) {
            println!("[INFO] Detaching kernel driver from interface {}", interface_num);
            let _ = handle.detach_kernel_driver(interface_num);
        }
    }

    match handle.claim_interface(interface_num) {
        Ok(_) => println!("[OK] Claimed interface {}", interface_num),
        Err(e) => {
            eprintln!("[ERROR] Failed to claim interface {}: {}", interface_num, e);
            return;
        }
    }

    // Send initialization sequence (based on protocol captures)
    println!("\n[INFO] Sending initialization sequence...");

    // Build ACK..OK init packet
    let mut init_packet = [0u8; ACK_PACKET_SIZE];
    init_packet[0..3].copy_from_slice(b"ACK");
    init_packet[3] = 0x00;
    init_packet[4] = 0x00;
    init_packet[5..7].copy_from_slice(b"OK");
    init_packet[7] = 0x00;
    init_packet[8] = 0x00;
    init_packet[9] = 0x01;  // Init flag
    init_packet[10] = 0x01; // State

    // Try to send init on OUT endpoint
    match handle.write_interrupt(EP_OUT, &init_packet, TIMEOUT) {
        Ok(n) => println!("[OK] Sent init packet ({} bytes)", n),
        Err(e) => {
            eprintln!("[WARN] Could not send init packet: {}", e);
            // Try with a 1024-byte packet for the CRT endpoint
            let mut crt_packet = [0u8; CRT_PACKET_SIZE];
            crt_packet[0..3].copy_from_slice(b"CRT");
            crt_packet[3] = 0x00;
            crt_packet[4] = 0x00;
            crt_packet[5..12].copy_from_slice(b"CONNECT");

            match handle.write_interrupt(EP_OUT, &crt_packet, TIMEOUT) {
                Ok(n) => println!("[OK] Sent CRT CONNECT packet ({} bytes)", n),
                Err(e2) => eprintln!("[WARN] Could not send CRT packet: {}", e2),
            }
        }
    }

    // Read any response
    let mut buf = [0u8; ACK_PACKET_SIZE];
    match handle.read_interrupt(EP_IN, &mut buf, Duration::from_millis(500)) {
        Ok(n) if n > 0 => {
            println!("[OK] Received init response ({} bytes)", n);
            print_hex(&buf[..n.min(32)]);
        }
        Ok(_) => println!("[INFO] No init response"),
        Err(e) => println!("[INFO] Init read: {}", e),
    }

    println!("\n=================================");
    println!("  Listening on endpoint 0x{:02X}...", EP_IN);
    println!("  Press buttons or turn dials");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    // Main event loop - read from EP_IN (0x82)
    let mut event_count = 0u64;

    loop {
        match handle.read_interrupt(EP_IN, &mut buf, TIMEOUT) {
            Ok(n) if n > 0 => {
                event_count += 1;
                print_event(event_count, &buf[..n]);
            }
            Ok(_) => {
                // No data, continue
            }
            Err(rusb::Error::Timeout) => {
                // Normal timeout, continue polling
            }
            Err(rusb::Error::NoDevice) => {
                eprintln!("[ERROR] Device disconnected!");
                return;
            }
            Err(e) => {
                eprintln!("[ERROR] Read error: {}", e);
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
}

fn find_soomfon_device<T: UsbContext>(context: &T) -> Option<Device<T>> {
    context.devices().ok()?.iter().find(|device| {
        device.device_descriptor().map_or(false, |desc| {
            desc.vendor_id() == SOOMFON_VID && desc.product_id() == SOOMFON_PID
        })
    })
}

fn print_hex(data: &[u8]) {
    print!("  HEX: ");
    for byte in data {
        print!("{:02X} ", byte);
    }
    println!();
}

fn print_event(count: u64, data: &[u8]) {
    println!("--- Event #{} ({} bytes) ---", count, data.len());

    // Print hex dump of first 32 bytes
    print_hex(&data[..data.len().min(32)]);

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

        println!("  >>> DECODED: {} - {}", event_name, state_name);
    }

    println!();
}
