# SOOMFON CN002-4B27 HID Protocol

## Device Identification

| Property     | Value                    |
|--------------|--------------------------|
| Vendor ID    | 0x1500                   |
| Product ID   | 0x3001                   |
| Manufacturer | HOTSPOTEKUSB             |
| Product      | HOTSPOTEKUSB HID DEMO    |
| Serial       | 4250D2784B27             |
| Release      | 0x0002                   |

## HID Interfaces

The device exposes two HID interfaces:

### Interface 0 (MI_00) - Vendor Protocol

| Property    | Value                        |
|-------------|------------------------------|
| Usage Page  | 0xFFA0 (Vendor-defined)      |
| Usage       | 0x0001                       |
| Purpose     | Custom protocol for LCD images, commands, and possibly button/encoder events |

This interface uses a vendor-specific protocol for:
- Sending images to LCD buttons
- Receiving button press/release events (TBD)
- Receiving encoder rotation events (TBD)
- Device configuration commands (TBD)

### Interface 1 (MI_01) - Keyboard

| Property    | Value                        |
|-------------|------------------------------|
| Usage Page  | 0x0001 (Generic Desktop)     |
| Usage       | 0x0006 (Keyboard)            |
| Purpose     | Standard HID keyboard for button input |

This interface presents as a standard USB keyboard. On Windows, this interface is locked by the OS and cannot be read directly via node-hid.

## Input Reports (Device to Host)

### MI_00 Vendor Input Reports

**Status: Pending Discovery**

Reports received from MI_00 likely contain:
- Button press/release events
- Encoder rotation events
- Device status information

Expected format (to be confirmed via packet capture):

```
Byte 0: Report ID
Byte 1: Event type (button, encoder, status?)
Byte 2-N: Event data
```

### MI_01 Keyboard Reports

Standard HID keyboard reports (8 bytes):

```
Byte 0: Modifier keys
Byte 1: Reserved
Byte 2-7: Key codes (up to 6 simultaneous keys)
```

## Output Reports (Host to Device)

### MI_00 Vendor Output Reports

**Status: Pending Discovery**

Reports sent to MI_00 likely include:
- LCD image data
- Brightness control
- Button LED control
- Device configuration

Expected commands (to be confirmed via Wireshark capture):

| Command | Purpose | Packet Size |
|---------|---------|-------------|
| TBD     | Set button image | Large (image data) |
| TBD     | Set brightness | Small |
| TBD     | Clear button | Small |

## Packet Capture Notes

### Tools Required

1. **Wireshark** with USBPcap for Windows USB packet capture
2. **scripts/capture-input.ts** for real-time HID event logging

### Capture Strategy

1. Start Wireshark USB capture on the SOOMFON device
2. Run the official software to observe:
   - Image upload packets (structure, headers, compression)
   - Button event responses
   - Initialization sequence
3. Document packet structures in this file

## Similar Devices

The SOOMFON device appears similar to:
- Stream Deck (Elgato) - similar LCD button concept
- Loupedeck - similar encoder + LCD design

Reference implementations that may help:
- [node-elgato-stream-deck](https://github.com/Julusian/node-elgato-stream-deck)
- [python-elgato-streamdeck](https://github.com/abcminiuser/python-elgato-streamdeck)

## Protocol Discovery Log

| Date | Discovery |
|------|-----------|
| 2026-01-14 | Device enumeration: 2 interfaces identified (MI_00 vendor, MI_01 keyboard) |
| 2026-01-14 | MI_00 uses vendor-defined usage page 0xFFA0 |
| 2026-01-14 | MI_01 is standard keyboard, locked by Windows OS |

## TODO

- [ ] Capture button press packets via MI_00
- [ ] Capture encoder rotation packets
- [ ] Reverse-engineer image upload protocol via Wireshark
- [ ] Determine image format (JPEG, raw RGB, etc.)
- [ ] Determine button grid layout (rows x columns)
- [ ] Document initialization sequence
