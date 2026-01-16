/**
 * HID Report ID test - try reading with specific report IDs
 */

const HID = require('node-hid');

const SOOMFON_VID = 0x1500;
const SOOMFON_PID = 0x3001;

console.log('=== HID Report ID Test ===\n');

// Find vendor interface
const devices = HID.devices(SOOMFON_VID, SOOMFON_PID);
console.log('Found devices:', devices.length);

devices.forEach((d, i) => {
  console.log(`\nDevice ${i}:`);
  console.log(`  Path: ${d.path}`);
  console.log(`  Interface: ${d.interface}`);
  console.log(`  Usage Page: 0x${d.usagePage?.toString(16)} (${d.usagePage})`);
  console.log(`  Usage: ${d.usage}`);
});

const vendorInterface = devices.find(d => d.usagePage === 65440);

if (!vendorInterface) {
  console.log('\nERROR: Vendor interface not found!');
  process.exit(1);
}

console.log('\nOpening vendor interface...');
const device = new HID.HID(vendorInterface.path);
console.log('Device opened!\n');

// Try to get HID report descriptor info
console.log('=== Trying different read approaches ===\n');

// Approach 1: Try getFeatureReport with report ID 0x41 ('A' - first byte of ACK)
console.log('1. Trying getFeatureReport with report ID 0x41...');
try {
  const data = device.getFeatureReport(0x41, 128);
  console.log('   Got data:', Buffer.from(data).toString('hex'));
} catch (e) {
  console.log('   Failed:', e.message);
}

// Approach 2: Try reading with longer timeout
console.log('\n2. Long timeout read (3 seconds) - PRESS A BUTTON NOW!');
try {
  const data = device.readTimeout(3000);
  if (data && data.length > 0) {
    console.log('   Got data:', Buffer.from(data).toString('hex'));
    console.log('   As string:', Buffer.from(data).toString('utf8').replace(/\0/g, '.'));
  } else {
    console.log('   No data received');
  }
} catch (e) {
  console.log('   Error:', e.message);
}

// Approach 3: Try reading raw with pause/resume
console.log('\n3. Trying pause/resume pattern...');
try {
  device.pause();
  device.resume();
  console.log('   Pause/resume done, reading...');
  const data = device.readTimeout(2000);
  if (data && data.length > 0) {
    console.log('   Got data:', Buffer.from(data).toString('hex'));
  } else {
    console.log('   No data');
  }
} catch (e) {
  console.log('   Error:', e.message);
}

// Approach 4: Send a command first, then read response
console.log('\n4. Send wake command, then read response...');
try {
  const wakeCmd = Buffer.alloc(64);
  wakeCmd[0] = 0x00;
  wakeCmd[1] = 0x01;
  device.write([...wakeCmd]);
  console.log('   Wake sent, reading response...');

  const data = device.readTimeout(1000);
  if (data && data.length > 0) {
    console.log('   Got response:', Buffer.from(data).toString('hex'));
    console.log('   As string:', Buffer.from(data).toString('utf8').replace(/\0/g, '.'));
  } else {
    console.log('   No response');
  }
} catch (e) {
  console.log('   Error:', e.message);
}

// Approach 5: Check if there's pending data using read in a tight loop
console.log('\n5. Rapid polling for 5 seconds - PRESS BUTTONS!');
let found = false;
const startTime = Date.now();
let iterations = 0;

while (Date.now() - startTime < 5000) {
  iterations++;
  try {
    // Try with very short timeout
    const data = device.readTimeout(1);
    if (data && data.length > 0) {
      found = true;
      console.log(`   [${iterations}] DATA: ${Buffer.from(data).toString('hex')}`);
      console.log(`   As string: ${Buffer.from(data).toString('utf8').replace(/\0/g, '.')}`);
    }
  } catch (e) {
    // Ignore timeout errors
  }
}
console.log(`   Completed ${iterations} iterations, found data: ${found}`);

// Approach 6: Try reading from the keyboard interface
console.log('\n6. Trying keyboard interface...');
const kbInterface = devices.find(d => d.usagePage === 1 && d.usage === 6);
if (kbInterface) {
  try {
    const kbDevice = new HID.HID(kbInterface.path);
    console.log('   Keyboard interface opened!');
    console.log('   Reading for 2 seconds - PRESS BUTTONS!');

    const kbStart = Date.now();
    while (Date.now() - kbStart < 2000) {
      try {
        const data = kbDevice.readTimeout(10);
        if (data && data.length > 0) {
          console.log(`   KB DATA: ${Buffer.from(data).toString('hex')}`);
        }
      } catch (e) {
        // Might fail, that's ok
        break;
      }
    }
    kbDevice.close();
  } catch (e) {
    console.log('   Cannot open keyboard interface:', e.message);
  }
} else {
  console.log('   Keyboard interface not found');
}

console.log('\n=== Test Complete ===');
device.close();
