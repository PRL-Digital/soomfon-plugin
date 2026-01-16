/**
 * HID Blocking Read Test
 * Uses longer timeouts and blocking reads to catch input
 */

const HID = require('node-hid');

const SOOMFON_VID = 0x1500;
const SOOMFON_PID = 0x3001;

console.log('=== HID Blocking Read Test ===\n');

// Find vendor interface
const devices = HID.devices(SOOMFON_VID, SOOMFON_PID);
const vendorInterface = devices.find(d => d.usagePage === 65440);

if (!vendorInterface) {
  console.log('ERROR: Device not found!');
  process.exit(1);
}

console.log('Opening device...');
const device = new HID.HID(vendorInterface.path);
console.log('Device opened!\n');

// Send wake command
console.log('Sending wake command...');
const wakePacket = Buffer.alloc(64);
wakePacket[1] = 0x01; // Wake
device.write([...wakePacket]);
console.log('Wake sent.\n');

// Try different read approaches
console.log('=== Test 1: Long timeout reads ===');
console.log('Press and HOLD a button on the device...\n');

for (let i = 0; i < 5; i++) {
  console.log(`Read attempt ${i + 1} (1 second timeout)...`);
  try {
    const data = device.readTimeout(1000);
    if (data && data.length > 0) {
      console.log(`  GOT DATA: ${Buffer.from(data).toString('hex')}`);
    } else {
      console.log('  No data');
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
}

console.log('\n=== Test 2: Sync read with non-blocking ===');
device.setNonBlocking(true);

console.log('Rapid polling for 5 seconds - press buttons!\n');
const startTime = Date.now();
let readCount = 0;
let dataCount = 0;

while (Date.now() - startTime < 5000) {
  try {
    const data = device.readSync();
    readCount++;
    if (data && data.length > 0) {
      dataCount++;
      console.log(`  [${readCount}] DATA: ${Buffer.from(data).toString('hex')}`);
    }
  } catch (err) {
    // Ignore
  }
}
console.log(`Completed ${readCount} reads, got ${dataCount} data packets.\n`);

console.log('=== Test 3: Try reading with getFeatureReport ===');
console.log('Some devices report button state via feature reports...\n');

// Try reading feature reports while pressing buttons
console.log('Press and HOLD a button, then press Enter...');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('', () => {
  for (let reportId = 0; reportId < 20; reportId++) {
    try {
      const data = device.getFeatureReport(reportId, 64);
      if (data && data.length > 0) {
        const hex = Buffer.from(data).toString('hex');
        // Only show if not all zeros
        if (hex.replace(/0/g, '').length > 0) {
          console.log(`  Feature report ${reportId}: ${hex}`);
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  console.log('\n=== Test 4: Send potential "enable input" commands ===');
  console.log('Trying various commands that might enable input reporting...\n');

  // Try various commands that might enable input
  const commands = [
    [0x00, 0x01], // Wake
    [0x00, 0x04], // Refresh
    [0x00, 0x05], // Unknown - might enable input
    [0x00, 0x06], // Unknown
    [0x00, 0x10], // Unknown
    [0x00, 0x20], // Unknown
    [0x00, 0xFF], // Unknown
  ];

  commands.forEach((cmd, i) => {
    const packet = Buffer.alloc(64);
    cmd.forEach((byte, j) => packet[j] = byte);
    try {
      device.write([...packet]);
      console.log(`  Sent command: ${cmd.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  });

  console.log('\nWaiting 2 seconds then doing final read test...\n');

  setTimeout(() => {
    device.setNonBlocking(false);
    console.log('Final read test (3 seconds)...');

    for (let i = 0; i < 3; i++) {
      const data = device.readTimeout(1000);
      if (data && data.length > 0) {
        console.log(`  GOT DATA: ${Buffer.from(data).toString('hex')}`);
      } else {
        console.log(`  Attempt ${i + 1}: No data`);
      }
    }

    console.log('\n=== Test Complete ===');
    device.close();
    rl.close();
    process.exit(0);
  }, 2000);
});
