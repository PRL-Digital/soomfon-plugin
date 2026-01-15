/**
 * SOOMFON Device Detection Script
 * Enumerates HID devices and finds the SOOMFON CN002-4B27
 */

import * as HID from 'node-hid';

// SOOMFON CN002-4B27 identifiers
const SOOMFON_VID = 0x1500;
const SOOMFON_PID = 0x3001;

function formatHex(num: number, digits: number = 4): string {
  return '0x' + num.toString(16).padStart(digits, '0').toUpperCase();
}

function main(): void {
  console.log('=== SOOMFON Device Detection ===\n');
  console.log(`Looking for VID: ${formatHex(SOOMFON_VID)}, PID: ${formatHex(SOOMFON_PID)}\n`);

  // Get all HID devices
  const allDevices = HID.devices();
  console.log(`Total HID devices found: ${allDevices.length}\n`);

  // Filter for SOOMFON devices
  const soomfonDevices = HID.devices(SOOMFON_VID, SOOMFON_PID);

  if (soomfonDevices.length === 0) {
    console.log('❌ No SOOMFON device found!');
    console.log('\nTroubleshooting:');
    console.log('  1. Ensure the device is connected via USB');
    console.log('  2. Check if drivers are installed correctly');
    console.log('  3. On Windows, you may need to run as Administrator');
    console.log('\nListing all HID devices for debugging:\n');

    // Show a sample of connected devices
    const uniqueDevices = new Map<string, HID.Device>();
    for (const device of allDevices) {
      const key = `${device.vendorId}-${device.productId}`;
      if (!uniqueDevices.has(key)) {
        uniqueDevices.set(key, device);
      }
    }

    for (const device of uniqueDevices.values()) {
      console.log(`  VID: ${formatHex(device.vendorId)}, PID: ${formatHex(device.productId)} - ${device.manufacturer || 'Unknown'} ${device.product || ''}`);
    }
    process.exit(1);
  }

  console.log(`✅ Found ${soomfonDevices.length} SOOMFON interface(s):\n`);

  // Sort by interface number for consistent display
  soomfonDevices.sort((a, b) => a.interface - b.interface);

  for (const device of soomfonDevices) {
    console.log(`--- Interface ${device.interface} (MI_0${device.interface}) ---`);
    console.log(`  VID:          ${formatHex(device.vendorId)}`);
    console.log(`  PID:          ${formatHex(device.productId)}`);
    console.log(`  Path:         ${device.path}`);
    console.log(`  Manufacturer: ${device.manufacturer || 'N/A'}`);
    console.log(`  Product:      ${device.product || 'N/A'}`);
    console.log(`  Serial:       ${device.serialNumber || 'N/A'}`);
    console.log(`  Release:      ${formatHex(device.release)}`);
    console.log(`  Usage Page:   ${device.usagePage !== undefined ? formatHex(device.usagePage) : 'N/A'}`);
    console.log(`  Usage:        ${device.usage !== undefined ? formatHex(device.usage) : 'N/A'}`);

    // Interpret usage page
    if (device.usagePage !== undefined) {
      const usagePageName = getUsagePageName(device.usagePage);
      console.log(`  Usage Type:   ${usagePageName}`);
    }
    console.log('');
  }

  console.log('Device detection complete.');
}

function getUsagePageName(usagePage: number): string {
  // Common HID usage pages
  const usagePages: Record<number, string> = {
    0x01: 'Generic Desktop Controls',
    0x02: 'Simulation Controls',
    0x03: 'VR Controls',
    0x04: 'Sport Controls',
    0x05: 'Game Controls',
    0x06: 'Generic Device Controls',
    0x07: 'Keyboard/Keypad',
    0x08: 'LEDs',
    0x09: 'Button',
    0x0C: 'Consumer',
    0x0D: 'Digitizer',
    0x0F: 'Physical Input Device',
    0x14: 'Alphanumeric Display',
    0xFF00: 'Vendor-defined (0xFF00)',
    0xFF01: 'Vendor-defined (0xFF01)',
  };

  if (usagePage >= 0xFF00) {
    return `Vendor-defined (${formatHex(usagePage)})`;
  }

  return usagePages[usagePage] || `Unknown (${formatHex(usagePage)})`;
}

main();
