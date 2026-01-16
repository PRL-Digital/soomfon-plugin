/**
 * Raw USB test - bypass HID layer using libusb
 * Run with: node scripts/usb-test.js
 *
 * NOTE: This may require WinUSB driver to be installed for the device.
 * If it fails, you might need to use Zadig to install WinUSB driver.
 */

const { usb, getDeviceList } = require('usb');

const SOOMFON_VID = 0x1500;
const SOOMFON_PID = 0x3001;

console.log('=== Raw USB Test (libusb) ===\n');

// Find SOOMFON device
console.log('1. Looking for SOOMFON device...');
const devices = getDeviceList();
const soomfon = devices.find(d =>
  d.deviceDescriptor.idVendor === SOOMFON_VID &&
  d.deviceDescriptor.idProduct === SOOMFON_PID
);

if (!soomfon) {
  console.log('   ERROR: SOOMFON device not found!');
  process.exit(1);
}

console.log('   Found SOOMFON device!\n');

// Open device
console.log('2. Opening device...');
try {
  soomfon.open();
  console.log('   SUCCESS: Device opened!\n');
} catch (err) {
  console.log(`   ERROR: ${err.message}`);
  console.log('\n   This usually means:');
  console.log('   - The HID driver has exclusive access');
  console.log('   - You need to install WinUSB driver using Zadig');
  console.log('   - Run Zadig (https://zadig.akeo.ie/), select the device,');
  console.log('     and replace driver with WinUSB or libusb-win32');
  process.exit(1);
}

// Get device descriptor
console.log('3. Device info:');
const desc = soomfon.deviceDescriptor;
console.log(`   VID: 0x${desc.idVendor.toString(16)}`);
console.log(`   PID: 0x${desc.idProduct.toString(16)}`);
console.log(`   Class: ${desc.bDeviceClass}`);
console.log(`   Num Configurations: ${desc.bNumConfigurations}\n`);

// Get configuration descriptor
console.log('4. Configuration and interfaces:');
try {
  const config = soomfon.configDescriptor;
  console.log(`   Configuration value: ${config.bConfigurationValue}`);
  console.log(`   Num interfaces: ${config.bNumInterfaces}\n`);

  config.interfaces.forEach((iface, ifaceNum) => {
    console.log(`   Interface ${ifaceNum}:`);
    iface.forEach((alt, altNum) => {
      console.log(`     Alt setting ${altNum}:`);
      console.log(`       Class: ${alt.bInterfaceClass} (3=HID)`);
      console.log(`       Subclass: ${alt.bInterfaceSubClass}`);
      console.log(`       Protocol: ${alt.bInterfaceProtocol}`);
      console.log(`       Endpoints: ${alt.endpoints.length}`);

      alt.endpoints.forEach((ep, epNum) => {
        const dir = (ep.bEndpointAddress & 0x80) ? 'IN' : 'OUT';
        const type = ['Control', 'Isochronous', 'Bulk', 'Interrupt'][ep.bmAttributes & 0x03];
        console.log(`         EP ${epNum}: addr=0x${ep.bEndpointAddress.toString(16)} dir=${dir} type=${type} maxPacket=${ep.wMaxPacketSize}`);
      });
    });
    console.log('');
  });
} catch (err) {
  console.log(`   ERROR getting config: ${err.message}\n`);
}

// Try to claim interface and read
console.log('5. Attempting to claim interface 0 and read...');
try {
  const iface = soomfon.interface(0);

  if (iface.isKernelDriverActive()) {
    console.log('   Detaching kernel driver...');
    iface.detachKernelDriver();
  }

  iface.claim();
  console.log('   Interface 0 claimed!\n');

  // Find IN endpoint
  const inEndpoint = iface.endpoints.find(ep => ep.direction === 'in');

  if (inEndpoint) {
    console.log(`   Found IN endpoint: 0x${inEndpoint.address.toString(16)}`);
    console.log('   Starting transfer... Press SOOMFON buttons!\n');

    inEndpoint.on('data', (data) => {
      console.log(`   [DATA] ${Buffer.from(data).toString('hex')}`);
    });

    inEndpoint.on('error', (err) => {
      console.log(`   [ERROR] ${err.message}`);
    });

    inEndpoint.startPoll(1, 64);

    // Run for 15 seconds
    setTimeout(() => {
      console.log('\n6. Test complete.');
      inEndpoint.stopPoll();
      iface.release(() => {
        soomfon.close();
        process.exit(0);
      });
    }, 15000);

  } else {
    console.log('   No IN endpoint found on interface 0');
    soomfon.close();
  }

} catch (err) {
  console.log(`   ERROR: ${err.message}`);
  console.log('\n   To use libusb on Windows, you need WinUSB driver.');
  console.log('   Download Zadig: https://zadig.akeo.ie/');
  console.log('   Select the SOOMFON device and install WinUSB driver.');
  console.log('\n   WARNING: This will break the HID functionality until you');
  console.log('   reinstall the original driver from Device Manager.');
  soomfon.close();
  process.exit(1);
}
