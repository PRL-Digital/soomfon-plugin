//! Test using async-hid (same library mirajazz uses)
//!
//! Run with: cargo run --bin async_hid_test

use async_hid::{AsyncHidRead, AsyncHidWrite, Device, HidBackend, HidResult};
use futures_lite::StreamExt;
use std::time::Duration;

const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;
const USAGE_PAGE: u16 = 0xFFA0; // 65440
const USAGE_ID: u16 = 0x0001;

#[tokio::main]
async fn main() -> HidResult<()> {
    println!("=== SOOMFON async-hid Test ===");
    println!("This uses the same HID library as mirajazz/opendeck-akp03\n");

    // Enumerate devices
    println!("Enumerating HID devices...");
    println!("Looking for SOOMFON device (VID={:04X}, PID={:04X}, UP={:04X}, U={:04X})...\n",
        SOOMFON_VID, SOOMFON_PID, USAGE_PAGE, USAGE_ID);

    let backend = HidBackend::default();

    // Find and print all devices first
    println!("Available HID devices:");
    let mut stream = backend.enumerate().await?;
    while let Some(info) = stream.next().await {
        println!("  {} (VID={:04X}, PID={:04X}, UP={:04X}, U={:04X})",
            info.name, info.vendor_id, info.product_id, info.usage_page, info.usage_id);
    }
    println!();

    // Now find and open our device
    println!("Opening SOOMFON device...");
    let mut device = backend
        .enumerate()
        .await?
        .find(|info: &Device| info.matches(USAGE_PAGE, USAGE_ID, SOOMFON_VID, SOOMFON_PID))
        .await
        .inspect(|info| {
            println!("[OK] Found device: {}", info.name);
            println!("  VID: {:04X}, PID: {:04X}", info.vendor_id, info.product_id);
            println!("  Usage Page: {:04X}, Usage ID: {:04X}", info.usage_page, info.usage_id);
        })
        .expect("Could not find SOOMFON device")
        .open()
        .await?;

    println!("[OK] Device opened successfully\n");

    // ========================================
    // MIRAJAZZ-STYLE INITIALIZATION
    // ========================================
    println!("=== MIRAJAZZ-STYLE INITIALIZATION ===\n");

    // Step 1: CRT..DIS (Display Init)
    println!("[1] Sending CRT..DIS...");
    let mut dis_packet = vec![0u8; 1025];
    dis_packet[0] = 0x00; // Report ID
    dis_packet[1] = 0x43; // C
    dis_packet[2] = 0x52; // R
    dis_packet[3] = 0x54; // T
    dis_packet[4] = 0x00;
    dis_packet[5] = 0x00;
    dis_packet[6] = 0x44; // D
    dis_packet[7] = 0x49; // I
    dis_packet[8] = 0x53; // S

    device.write_output_report(&dis_packet).await?;
    println!("  [OK] Sent DIS command");
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Step 2: CRT..LIG (Set Brightness to 50%)
    println!("\n[2] Sending CRT..LIG brightness=50...");
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

    device.write_output_report(&lig_packet).await?;
    println!("  [OK] Sent LIG command");
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Step 3: CRT..STP (Stop/Commit - from mirajazz flush())
    println!("\n[3] Sending CRT..STP (commit)...");
    let mut stp_packet = vec![0u8; 1025];
    stp_packet[0] = 0x00;  // Report ID
    stp_packet[1] = 0x43;  // C
    stp_packet[2] = 0x52;  // R
    stp_packet[3] = 0x54;  // T
    stp_packet[4] = 0x00;
    stp_packet[5] = 0x00;
    stp_packet[6] = 0x53;  // S
    stp_packet[7] = 0x54;  // T
    stp_packet[8] = 0x50;  // P

    device.write_output_report(&stp_packet).await?;
    println!("  [OK] Sent STP command");
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Step 4: Clear screens (CRT..CLE - from opendeck-akp03)
    println!("\n[4] Sending CRT..CLE (clear screens)...");
    let mut cle_packet = vec![0u8; 1025];
    cle_packet[0] = 0x00;  // Report ID
    cle_packet[1] = 0x43;  // C
    cle_packet[2] = 0x52;  // R
    cle_packet[3] = 0x54;  // T
    cle_packet[4] = 0x00;
    cle_packet[5] = 0x00;
    cle_packet[6] = 0x43;  // C
    cle_packet[7] = 0x4C;  // L
    cle_packet[8] = 0x45;  // E

    device.write_output_report(&cle_packet).await?;
    println!("  [OK] Sent CLE command");
    tokio::time::sleep(Duration::from_millis(50)).await;

    println!("\n[INIT COMPLETE] Initialization done (DIS + LIG + STP + CLE)");

    // ========================================
    // EVENT POLLING LOOP
    // ========================================
    println!("\n=================================");
    println!("  Listening for button events...");
    println!("  Press buttons on the device!");
    println!("  Press Ctrl+C to exit");
    println!("=================================\n");

    let mut buf = vec![0u8; 512];
    let mut event_count = 0u64;

    loop {
        // Read with timeout using tokio
        match tokio::time::timeout(
            Duration::from_millis(100),
            device.read_input_report(&mut buf)
        ).await {
            Ok(Ok(n)) if n > 0 => {
                event_count += 1;
                println!("--- Event #{} ({} bytes) ---", event_count, n);
                print_hex(&buf[..n.min(32)]);
                decode_event(&buf[..n]);
                println!();
            }
            Ok(Ok(_)) => {
                // 0 bytes - shouldn't happen
            }
            Ok(Err(e)) => {
                eprintln!("Read error: {}", e);
                break;
            }
            Err(_) => {
                // Timeout - normal, continue polling
            }
        }
    }

    Ok(())
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
    // Check for ACK prefix at offset 0 or 1 (in case of report ID)
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
