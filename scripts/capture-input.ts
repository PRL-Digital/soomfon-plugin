/**
 * SOOMFON Raw Input Capture Script
 * Opens both HID interfaces and logs raw byte data from button/encoder events
 */

import * as HID from 'node-hid';

// SOOMFON CN002-4B27 identifiers
const SOOMFON_VID = 0x1500;
const SOOMFON_PID = 0x3001;

interface OpenDevice {
  hid: HID.HID;
  interfaceNum: number;
  path: string;
  usagePage: number;
  hasError: boolean;
}

function formatHex(num: number, digits: number = 2): string {
  return num.toString(16).padStart(digits, '0').toUpperCase();
}

function formatBytes(data: Buffer | number[]): string {
  const bytes = Array.isArray(data) ? data : Array.from(data);
  return bytes.map(b => formatHex(b)).join(' ');
}

function timestamp(): string {
  return new Date().toISOString().substr(11, 12);
}

function main(): void {
  console.log('=== SOOMFON Raw Input Capture ===\n');
  console.log('Press Ctrl+C to exit\n');

  // Find SOOMFON devices
  const devices = HID.devices(SOOMFON_VID, SOOMFON_PID);

  if (devices.length === 0) {
    console.error('❌ No SOOMFON device found! Run detect-device.ts first.');
    process.exit(1);
  }

  console.log(`Found ${devices.length} interface(s). Opening...\n`);

  const openDevices: OpenDevice[] = [];

  // Sort by interface number
  devices.sort((a, b) => a.interface - b.interface);

  for (const device of devices) {
    if (!device.path) {
      console.warn(`⚠️  Interface ${device.interface} has no path, skipping`);
      continue;
    }

    const usagePage = device.usagePage || 0;

    try {
      // Try non-exclusive mode first (important for keyboard interface on Windows)
      const hid = new HID.HID(device.path, { nonExclusive: true });

      openDevices.push({
        hid,
        interfaceNum: device.interface,
        path: device.path,
        usagePage,
        hasError: false
      });

      console.log(`✅ Opened Interface ${device.interface} (MI_0${device.interface})`);
      console.log(`   Path: ${device.path}`);
      console.log(`   Usage Page: 0x${formatHex(usagePage, 4)}`);

      if (usagePage === 0x0001) {
        console.log(`   ⚠️  Keyboard interface - may have read issues on Windows`);
      }
      console.log('');

    } catch (err) {
      const error = err as Error;
      console.error(`❌ Failed to open Interface ${device.interface}: ${error.message}`);

      // Try without nonExclusive if that failed
      try {
        const hid = new HID.HID(device.path);
        openDevices.push({
          hid,
          interfaceNum: device.interface,
          path: device.path,
          usagePage,
          hasError: false
        });
        console.log(`✅ Opened Interface ${device.interface} (exclusive mode)`);
      } catch (err2) {
        console.error(`   Also failed in exclusive mode: ${(err2 as Error).message}`);
      }
    }
  }

  if (openDevices.length === 0) {
    console.error('\n❌ Could not open any interfaces!');
    console.error('Try running as Administrator on Windows.');
    process.exit(1);
  }

  console.log(`\n📡 Listening on ${openDevices.length} interface(s)...`);
  console.log('Press buttons or turn encoders on the device.\n');
  console.log('─'.repeat(70));

  let eventCount = 0;

  // Register event listeners for each open device
  for (const od of openDevices) {
    od.hid.on('data', (data: Buffer) => {
      eventCount++;
      const bytes = formatBytes(data);
      const prefix = od.usagePage >= 0xFF00 ? '🔧' : '⌨️';
      console.log(`${prefix} [${timestamp()}] MI_0${od.interfaceNum} (${data.length} bytes): ${bytes}`);

      // Parse some basic info for vendor interface
      if (od.usagePage >= 0xFF00 && data.length > 0) {
        const reportId = data[0];
        console.log(`   Report ID: 0x${formatHex(reportId)}`);
      }
    });

    od.hid.on('error', (err: Error) => {
      if (!od.hasError) {
        od.hasError = true;
        const isKeyboard = od.usagePage === 0x0001;
        if (isKeyboard) {
          console.log(`⚠️  [${timestamp()}] MI_0${od.interfaceNum} (Keyboard): Read unavailable on Windows`);
          console.log(`   This is normal - Windows locks keyboard HID devices.`);
          console.log(`   Button events may come through MI_00 instead.\n`);
        } else {
          console.error(`❌ [${timestamp()}] MI_0${od.interfaceNum} ERROR: ${err.message}`);
        }
      }
    });
  }

  // Handle graceful shutdown
  const cleanup = () => {
    console.log('\n\n─'.repeat(70));
    console.log(`Captured ${eventCount} event(s)`);
    console.log('Shutting down...');
    for (const od of openDevices) {
      try {
        od.hid.close();
        console.log(`Closed Interface ${od.interfaceNum}`);
      } catch (e) {
        // Ignore close errors
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process running
  console.log('\nWaiting for input events...\n');
}

main();
