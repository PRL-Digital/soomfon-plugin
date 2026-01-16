/**
 * Keyboard capture test - see if SOOMFON buttons generate keyboard events
 * Run with: node scripts/keyboard-test.js
 */

const { GlobalKeyboardListener } = require('node-global-key-listener');

console.log('=== Keyboard Capture Test ===\n');
console.log('This will capture ALL keyboard events for 30 seconds.');
console.log('Press buttons on the SOOMFON device and see if any events appear.\n');
console.log('Starting in 3 seconds...\n');

setTimeout(() => {
  const keyboard = new GlobalKeyboardListener();

  console.log('Listening for keyboard events...');
  console.log('Press SOOMFON buttons NOW!\n');
  console.log('(Press Ctrl+C or wait 30 seconds to exit)\n');

  keyboard.addListener((event, down) => {
    const state = event.state === 'DOWN' ? 'DOWN' : 'UP  ';
    const keyName = event.name || 'UNKNOWN';
    const rawCode = event.rawKey?.vKey || event.vKey || '?';
    const scanCode = event.rawKey?.scanCode || '?';

    console.log(`[${state}] Key: ${keyName.padEnd(20)} vKey: ${String(rawCode).padEnd(5)} scanCode: ${scanCode}`);
  });

  // Stop after 30 seconds
  setTimeout(() => {
    console.log('\n=== Test Complete ===');
    console.log('If no events appeared when pressing SOOMFON buttons:');
    console.log('  - The device may not be sending keyboard reports');
    console.log('  - Or it sends reports that Windows doesn\'t recognize as keypresses');
    console.log('  - We may need to use Raw Input API or Interception driver');
    keyboard.kill();
    process.exit(0);
  }, 30000);

}, 3000);
