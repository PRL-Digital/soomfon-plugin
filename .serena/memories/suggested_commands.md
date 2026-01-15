# Suggested Commands

## Build & Development
```bash
npm run build          # Compile TypeScript
npm run dev            # Development mode (when available)
npm install            # Install dependencies
```

## Scripts
```bash
npx ts-node scripts/detect-device.ts    # Detect SOOMFON device
npx ts-node scripts/capture-input.ts    # Capture raw HID input
```

## Testing & Verification
```bash
npm run build          # Verify TypeScript compiles
npm test               # Run tests (when available)
```

## System Utilities (Windows/MSYS)
```bash
ls                     # List directory
cat                    # View file contents
grep                   # Search in files
find                   # Find files
git status             # Git status
```

## USB/HID Debugging
- Use Wireshark with USBPcap for packet capture
- Filter: `usb.idVendor == 0x1500 && usb.idProduct == 0x3001`
