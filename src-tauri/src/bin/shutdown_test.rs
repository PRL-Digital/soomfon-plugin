//! Shutdown Test - Clean disconnect from device
//!
//! Run with: cargo run --bin shutdown_test

use rusb::{Context, Device, DeviceHandle, UsbContext};
use std::time::Duration;

const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;

const EP_IN: u8 = 0x82;
const EP_OUT: u8 = 0x03;
const BUF_SIZE: usize = 1024;
const TIMEOUT: Duration = Duration::from_millis(500);

fn main() {
    println!("=== SOOMFON Shutdown Test ===\n");

    let context = Context::new().expect("Failed to create USB context");
    let device = find_device(&context).expect("Device not found");
    let handle = device.open().expect("Failed to open device");
    handle.claim_interface(0).expect("Failed to claim interface");

    println!("[OK] Device opened and claimed\n");

    // First initialize the device (so we have something to shut down)
    println!("[INIT] Initializing device first...");
    init_device(&handle);

    println!("\n[INFO] Device initialized. Press Enter to test shutdown sequence...");
    let mut input = String::new();
    std::io::stdin().read_line(&mut input).ok();

    // Now test shutdown sequence
    println!("[SHUTDOWN] Starting shutdown sequence...\n");
    shutdown_device(&handle);

    println!("\n[OK] Shutdown complete!");
    println!("     Check if device displays are cleared/off.");
}

fn init_device(handle: &DeviceHandle<Context>) {
    // HID Get Feature Report
    let mut report_buf = [0u8; 512];
    match handle.read_control(0xA1, 0x01, 0x0100, 0x0000, &mut report_buf, TIMEOUT) {
        Ok(n) => {
            if let Ok(s) = std::str::from_utf8(&report_buf[..n]) {
                println!("  Device: {}", s.trim_matches('\0'));
            }
        }
        Err(e) => println!("  Feature report: {}", e),
    }

    // CRT..DIS
    let mut packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..8].copy_from_slice(b"DIS");
    let _ = handle.write_interrupt(EP_OUT, &packet, TIMEOUT);

    // CRT..LIG (brightness 100)
    packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..8].copy_from_slice(b"LIG");
    packet[10] = 0x64;
    let _ = handle.write_interrupt(EP_OUT, &packet, TIMEOUT);

    // CRT..QUCMD
    packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..10].copy_from_slice(b"QUCMD");
    packet[10..16].copy_from_slice(&[0x11, 0x11, 0x00, 0x11, 0x00, 0x11]);
    let _ = handle.write_interrupt(EP_OUT, &packet, TIMEOUT);

    println!("  Init commands sent");
}

fn shutdown_device(handle: &DeviceHandle<Context>) {
    let mut buf = [0u8; BUF_SIZE];

    // Step 1: CRT..DIS with parameter 0 (display off?)
    println!("[STEP 1] Sending CRT..DIS with param 0 (display off)...");
    let mut packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..8].copy_from_slice(b"DIS");
    packet[10] = 0x00; // Parameter 0
    match handle.write_interrupt(EP_OUT, &packet, TIMEOUT) {
        Ok(n) => println!("  Sent DIS 0 ({} bytes)", n),
        Err(e) => println!("  Failed: {}", e),
    }
    read_response(handle, &mut buf);

    // Step 2: Set brightness to 0
    println!("[STEP 2] Setting brightness to 0...");
    packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..8].copy_from_slice(b"LIG");
    packet[10] = 0x00; // 0% brightness
    match handle.write_interrupt(EP_OUT, &packet, TIMEOUT) {
        Ok(n) => println!("  Sent LIG 0 ({} bytes)", n),
        Err(e) => println!("  Failed: {}", e),
    }
    read_response(handle, &mut buf);

    // Step 3: CRT..CLE.DC (Clear LCD displays)
    // Hex: 43 52 54 00 00 43 4C 45 00 44 43
    println!("[STEP 3] Sending CRT..CLE.DC (clear LCD displays)...");
    packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..8].copy_from_slice(b"CLE");
    packet[9..11].copy_from_slice(b"DC");
    match handle.write_interrupt(EP_OUT, &packet, TIMEOUT) {
        Ok(n) => println!("  Sent CLE.DC ({} bytes)", n),
        Err(e) => println!("  Failed: {}", e),
    }
    read_response(handle, &mut buf);

    // Step 4: CRT..CLB.DC (Clear button states)
    // Hex: 43 52 54 00 00 43 4C 42 00 44 43
    println!("[STEP 4] Sending CRT..CLB.DC (clear button states)...");
    packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..8].copy_from_slice(b"CLB");
    packet[9..11].copy_from_slice(b"DC");
    match handle.write_interrupt(EP_OUT, &packet, TIMEOUT) {
        Ok(n) => println!("  Sent CLB.DC ({} bytes)", n),
        Err(e) => println!("  Failed: {}", e),
    }
    read_response(handle, &mut buf);

    // Step 5: CRT..HAH (Halt/shutdown)
    // Hex: 43 52 54 00 00 48 41 48
    println!("[STEP 5] Sending CRT..HAH (halt)...");
    packet = [0u8; BUF_SIZE];
    packet[0..3].copy_from_slice(b"CRT");
    packet[5..8].copy_from_slice(b"HAH");
    match handle.write_interrupt(EP_OUT, &packet, TIMEOUT) {
        Ok(n) => println!("  Sent HAH ({} bytes)", n),
        Err(e) => println!("  Failed: {}", e),
    }
    read_response(handle, &mut buf);

    // Release interface
    println!("[STEP 6] Releasing interface...");
    let _ = handle.release_interface(0);
    println!("  Interface released");
}

fn read_response(handle: &DeviceHandle<Context>, buf: &mut [u8]) {
    std::thread::sleep(Duration::from_millis(50));
    match handle.read_interrupt(EP_IN, buf, Duration::from_millis(100)) {
        Ok(n) if n > 0 => {
            print!("  Response: ");
            for b in buf[..n.min(20)].iter() {
                print!("{:02X} ", b);
            }
            println!();
        }
        _ => {}
    }
}

fn find_device<T: UsbContext>(context: &T) -> Option<Device<T>> {
    context.devices().ok()?.iter().find(|d| {
        d.device_descriptor().map_or(false, |desc| {
            desc.vendor_id() == SOOMFON_VID && desc.product_id() == SOOMFON_PID
        })
    })
}
