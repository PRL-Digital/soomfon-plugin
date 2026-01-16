/**
 * Simple HID test script to debug SOOMFON device connection
 * Run with: node scripts/hid-test.js
 */

const HID = require('node-hid');

const SOOMFON_VID = 0x1500;
const SOOMFON_PID = 0x3001;

console.log('=== SOOMFON HID Test Script ===\n');

// List all HID devices
console.log('1. Listing all HID devices...');
const allDevices = HID.devices();
console.log(`   Found ${allDevices.length} total HID devices\n`);

// Find SOOMFON devices
console.log('2. Looking for SOOMFON devices (VID:0x1500, PID:0x3001)...');
const soomfonDevices = allDevices.filter(d => d.vendorId === SOOMFON_VID && d.productId === SOOMFON_PID);

if (soomfonDevices.length === 0) {
  console.log('   ERROR: No SOOMFON device found!');
  console.log('   Make sure the device is plugged in.');
  process.exit(1);
}

console.log(`   Found ${soomfonDevices.length} SOOMFON interface(s):\n`);
soomfonDevices.forEach((d, i) => {
  console.log(`   Interface ${i}:`);
  console.log(`     Path: ${d.path}`);
  console.log(`     Interface: ${d.interface}`);
  console.log(`     Usage Page: ${d.usagePage} (0x${d.usagePage?.toString(16)})`);
  console.log(`     Usage: ${d.usage}`);
  console.log(`     Product: ${d.product}`);
  console.log(`     Manufacturer: ${d.manufacturer}`);
  console.log('');
});

// Try to open vendor interface (usagePage 0xFF00 = 65440)
const vendorInterface = soomfonDevices.find(d => d.usagePage === 65440);
const keyboardInterface = soomfonDevices.find(d => d.usagePage === 1 && d.usage === 6);

if (!vendorInterface) {
  console.log('   ERROR: Vendor interface not found!');
  process.exit(1);
}

console.log('3. Opening vendor interface...');
let device;
try {
  device = new HID.HID(vendorInterface.path);
  console.log('   SUCCESS: Device opened!\n');
} catch (err) {
  console.log(`   ERROR: Failed to open device: ${err.message}`);
  process.exit(1);
}

// Try to read feature reports
console.log('4. Attempting to read feature reports...');
for (let reportId = 0; reportId < 10; reportId++) {
  try {
    const data = device.getFeatureReport(reportId, 64);
    if (data && data.length > 0) {
      console.log(`   Report ${reportId}: ${Buffer.from(data).toString('hex')}`);
    }
  } catch (err) {
    // Silently ignore - most report IDs won't be supported
  }
}
console.log('   (No output means no feature reports available)\n');

// Try sending wake command
console.log('5. Sending wake display command...');
try {
  const wakePacket = Buffer.alloc(64);
  wakePacket[0] = 0x00; // Report ID
  wakePacket[1] = 0x01; // Wake command
  const bytesWritten = device.write([...wakePacket]);
  console.log(`   SUCCESS: Wrote ${bytesWritten} bytes\n`);
} catch (err) {
  console.log(`   ERROR: Write failed: ${err.message}\n`);
}

// Set up async data handler
console.log('6. Setting up async data handler...');
device.on('data', (data) => {
  console.log(`   [ASYNC] Data received: ${Buffer.from(data).toString('hex')}`);
});
device.on('error', (err) => {
  console.log(`   [ASYNC] Error: ${err.message}`);
});
console.log('   Handler registered\n');

// Start polling
console.log('7. Starting polling test (10 seconds)...');
console.log('   Press buttons on the device NOW!\n');

let pollCount = 0;
const pollInterval = setInterval(() => {
  pollCount++;

  try {
    // Try readTimeout
    const data = device.readTimeout(10);
    if (data && data.length > 0) {
      console.log(`   [POLL ${pollCount}] Data: ${Buffer.from(data).toString('hex')}`);
    }
  } catch (err) {
    if (pollCount === 1) {
      console.log(`   [POLL] Read error: ${err.message}`);
    }
  }

  if (pollCount % 100 === 0) {
    console.log(`   ... ${pollCount} polls, no data yet`);
  }
}, 10);

// Also try the keyboard interface if available
if (keyboardInterface) {
  console.log('\n8. Attempting to open keyboard interface...');
  try {
    const kbDevice = new HID.HID(keyboardInterface.path);
    console.log('   SUCCESS: Keyboard interface opened!');

    kbDevice.on('data', (data) => {
      console.log(`   [KEYBOARD] Data: ${Buffer.from(data).toString('hex')}`);
    });
    kbDevice.on('error', (err) => {
      console.log(`   [KEYBOARD] Error: ${err.message}`);
    });

    // Try polling keyboard interface too
    const kbPollInterval = setInterval(() => {
      try {
        const data = kbDevice.readTimeout(10);
        if (data && data.length > 0) {
          console.log(`   [KB-POLL] Data: ${Buffer.from(data).toString('hex')}`);
        }
      } catch (err) {
        // Ignore
      }
    }, 10);

    setTimeout(() => {
      clearInterval(kbPollInterval);
      kbDevice.close();
    }, 10000);

  } catch (err) {
    console.log(`   Cannot open keyboard interface: ${err.message}`);
    console.log('   (This is expected - Windows may have exclusive access)');
  }
}

// Stop after 10 seconds
setTimeout(() => {
  clearInterval(pollInterval);
  console.log(`\n9. Test complete. Total polls: ${pollCount}`);
  console.log('   If no data was received, the device may need:');
  console.log('   - A different initialization sequence');
  console.log('   - Driver-level changes (libusb, WinUSB)');
  console.log('   - Input comes through a different mechanism');
  device.close();
  process.exit(0);
}, 10000);

console.log('\n   Waiting for input events...\n');
