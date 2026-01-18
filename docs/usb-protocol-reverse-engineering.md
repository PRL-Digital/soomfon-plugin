# SOOMFON CN002-4B27 USB Protocol - Reverse Engineering Documentation

## Overview

This document details the USB communication protocol for the SOOMFON CN002-4B27 stream deck device, reverse-engineered through USB packet capture analysis using USB Monitor Pro.

**Date:** January 2026
**Device:** SOOMFON CN002-4B27
**Status:** Protocol decoded, initialization sequence identified

---

## Device Identification

| Property | Value |
|----------|-------|
| Vendor ID (VID) | `0x1500` (5376) |
| Product ID (PID) | `0x3001` (12289) |
| Manufacturer | HOTSPOTEKUSB |
| Product | HOTSPOTEKUSB HID DEMO |
| Serial Number | 4250D2784B27 |
| Device Model | V3+CK002_PXL+02+09 |
| USB Class | HID (Human Interface Device) |

---

## USB Interface Structure

The device exposes **two HID interfaces**:

### Interface 0 (MI_00) - Vendor Protocol

| Property | Value |
|----------|-------|
| Usage Page | `0xFFA0` (Vendor-defined) |
| Usage | `0x0001` |
| Class | 3 (HID) |
| SubClass | 0 |
| Protocol | 0 |

**Endpoints:**
| Endpoint | Direction | Type | Max Packet Size | Purpose |
|----------|-----------|------|-----------------|---------|
| `0x82` | IN | Interrupt | 512 bytes | Receive ACK packets (events) |
| `0x03` | OUT | Interrupt | 1024 bytes | Send CRT command packets |

### Interface 1 (MI_01) - Keyboard HID

| Property | Value |
|----------|-------|
| Usage Page | `0x0001` (Generic Desktop) |
| Usage | `0x0006` (Keyboard) |
| Class | 3 (HID) |
| SubClass | 1 |
| Protocol | 1 |

**Endpoints:**
| Endpoint | Direction | Type | Max Packet Size | Purpose |
|----------|-----------|------|-----------------|---------|
| `0x81` | IN | Interrupt | 8 bytes | Standard keyboard input |

> **Note:** Interface 1 is locked by Windows OS and cannot be directly accessed via userspace USB libraries. The vendor interface (Interface 0) is used for all custom communication.

---

## Protocol Overview

The device uses a **text-based command protocol** with two packet types:

1. **CRT Packets** (1024 bytes) - Commands sent to device
2. **ACK Packets** (512 bytes) - Acknowledgments and events

Communication flow:
- Host sends CRT commands on endpoint `0x03` (OUT)
- Device responds with ACK packets on endpoint `0x82` (IN)
- Button/encoder events arrive as ACK packets

---

## Initialization Sequence

The device **requires initialization** before it will send button events. The official software performs this sequence:

### Step 1: HID Get Feature Report (CRITICAL)

This USB control transfer "wakes up" the device:

```
bmRequestType: 0xA1 (Device-to-host, Class, Interface)
bRequest:      0x01 (GET_REPORT)
wValue:        0x0100 (Report Type: Input, Report ID: 0)
wIndex:        0x0000 (Interface 0)
wLength:       512
```

**Response:** Device version string
```
V3+CK002_PXL+02+09
```

### Step 2: CRT..DIS (Display Init)

```
Offset 0x00: 43 52 54 00 00 44 49 53 00 00 ...
             C  R  T        D  I  S
```

### Step 3: CRT..LIG (Set Brightness)

```
Offset 0x00: 43 52 54 00 00 4C 49 47 00 00 64 00 ...
             C  R  T        L  I  G        100
```
- Byte 10: Brightness value (0x64 = 100 = 100%)

### Step 4: CRT..QUCMD (Quick Command Setup)

```
Offset 0x00: 43 52 54 00 00 51 55 43 4D 44 11 11 00 11 00 11 ...
             C  R  T        Q  U  C  M  D  [parameters]
```
- Bytes 10-15: Parameters `11 11 00 11 00 11`

### Step 5: CRT..CONNECT (Optional)

```
Offset 0x00: 43 52 54 00 00 43 4F 4E 4E 45 43 54 00 ...
             C  R  T        C  O  N  N  E  C  T
```

---

## Packet Structures

### CRT Command Packet (1024 bytes)

```
Offset  Size  Description
------  ----  -----------
0x00    3     Header: "CRT" (0x43 0x52 0x54)
0x03    2     Padding: 0x00 0x00
0x05    3-7   Command name (variable length, null-terminated)
0x0A+   var   Command parameters
...     ...   Zero padding to 1024 bytes
```

### ACK Event Packet (512 bytes)

```
Offset  Size  Description
------  ----  -----------
0x00    3     Header: "ACK" (0x41 0x43 0x4B)
0x03    2     Padding: 0x00 0x00
0x05    2     "OK" (0x4F 0x4B)
0x07    1     Padding: 0x00
0x08    1     Padding: 0x00
0x09    1     Event ID (button number or encoder action)
0x0A    1     State (0x01 = press, 0x00 = release)
0x0B+   ...   Zero padding to 512 bytes
```

---

## Known Commands

### Display Commands

| Command | Hex Signature | Description |
|---------|---------------|-------------|
| `CRT..DIS` | `43 52 54 00 00 44 49 53` | Display initialization |
| `CRT..LIG` | `43 52 54 00 00 4C 49 47` | Set brightness (param at offset 0x0A) |
| `CRT..CONNECT` | `43 52 54 00 00 43 4F 4E 4E 45 43 54` | Connection/keepalive |
| `CRT..QUCMD` | `43 52 54 00 00 51 55 43 4D 44` | Quick command setup |

### Shutdown Commands

| Command | Hex Signature | Description |
|---------|---------------|-------------|
| `CRT..CLE.DC` | `43 52 54 00 00 43 4C 45 00 44 43` | Clear LCD displays |
| `CRT..CLB.DC` | `43 52 54 00 00 43 4C 42 00 44 43` | Clear button states |
| `CRT..HAH` | `43 52 54 00 00 48 41 48` | Halt/shutdown device |

### Image Transfer

The device accepts **JPEG images** via bulk transfers. Image data is identified by:
- JPEG magic bytes: `FF D8 FF E0`
- JFIF signature at offset 6

---

## Event Mapping

### LCD Buttons (6 keys with displays)

| Event ID | Hex | Description |
|----------|-----|-------------|
| 0x01 | `01` | LCD Button 1 ✓ |
| 0x02 | `02` | LCD Button 2 ✓ |
| 0x03 | `03` | LCD Button 3 ✓ |
| 0x04 | `04` | LCD Button 4 ✓ |
| 0x05 | `05` | LCD Button 5 ✓ |
| 0x06 | `06` | LCD Button 6 ✓ |

### Physical Buttons (3 small buttons without displays)

| Event ID | Hex | ASCII | Description |
|----------|-----|-------|-------------|
| 0x25 | `25` | '%' | Small Button 1 ✓ |
| 0x30 | `30` | '0' | Small Button 2 ✓ |
| 0x31 | `31` | '1' | Small Button 3 ✓ |

### Main Encoder (Dial 1 - Large center dial)

| Event ID | Hex | ASCII | Description |
|----------|-----|-------|-------------|
| 0x50 | `50` | 'P' | Rotate Left (CCW) ✓ |
| 0x51 | `51` | 'Q' | Rotate Right (CW) ✓ |
| 0x35 | `35` | '5' | Push/Press ✓ |

> Note: All directions and push confirmed working

### Side Encoder 1 (Dial 2 - Small)

| Event ID | Hex | Description |
|----------|-----|-------------|
| 0x90 | `90` | Rotate Left (CCW) ✓ |
| 0x91 | `91` | Rotate Right (CW) ✓ |
| 0x33 | `33` | Push/Press (ASCII '3') ✓ |

### Side Encoder 2 (Dial 3 - Small)

| Event ID | Hex | ASCII | Description |
|----------|-----|-------|-------------|
| 0x60 | `60` | '`' | Rotate Left (CCW) ✓ |
| 0x61 | `61` | 'a' | Rotate Right (CW) ✓ |
| 0x34 | `34` | '4' | Push/Press ✓ |

### Event States

| State | Hex | Description |
|-------|-----|-------------|
| 0x00 | `00` | Release / Rotation tick |
| 0x01 | `01` | Press |

---

## Communication Patterns

### Button Press/Release Cycle

1. User presses button 1
2. Device sends: `ACK..OK..01 01` (Button 1, Press)
3. User releases button 1
4. Device sends: `ACK..OK..01 00` (Button 1, Release)

### Encoder Rotation

1. User turns dial left
2. Device sends: `ACK..OK..51 00` (Dial Left, one tick)

1. User turns dial right
2. Device sends: `ACK..OK..50 00` (Dial Right, one tick)

### Keep-Alive

The official software sends `CRT..CONNECT` packets every ~10 seconds to maintain the connection.

---

## USB Transfer Types Used

| Transfer Type | Function | Direction | Size |
|---------------|----------|-----------|------|
| Control | HID Get Feature Report | IN | 512 bytes |
| Interrupt | CRT commands | OUT | 1024 bytes |
| Interrupt | ACK events | IN | 512 bytes |
| Bulk | Image data | OUT | Variable |

---

## Implementation Notes

### Windows Considerations

1. **Interface 1 is protected** - Windows locks the keyboard HID interface. Cannot be accessed via userspace.

2. **Driver selection** - The device works with the default Windows HID driver. Using `rusb` requires claiming the interface, which may conflict with hidapi.

3. **Initialization required** - The device will NOT send button events until the HID Get Feature Report control transfer is performed.

### Library Recommendations

| Library | Use Case | Notes |
|---------|----------|-------|
| `rusb` | Full protocol implementation | Needed for control transfers |
| `hidapi` | Simple read/write | May not support control transfers |

### Rust Implementation

```rust
// Key constants
const SOOMFON_VID: u16 = 0x1500;
const SOOMFON_PID: u16 = 0x3001;
const EP_IN: u8 = 0x82;   // Receive ACK packets
const EP_OUT: u8 = 0x03;  // Send CRT commands

// HID Get Feature Report (initialization)
handle.read_control(
    0xA1,       // bmRequestType
    0x01,       // bRequest: GET_REPORT
    0x0100,     // wValue: Input report, ID 0
    0x0000,     // wIndex: Interface 0
    &mut buf,
    timeout
)?;
```

---

## Packet Capture Reference

### Sample Button 1 Press Event

```
Hex:  41 43 4B 00 00 4F 4B 00 00 01 01 00 00 00 00 00
ASCII: A  C  K        O  K        ^  ^
                                  |  |
                                  |  +-- State: 01 (Press)
                                  +-- Event: 01 (Button 1)
```

### Sample Dial Left Event

```
Hex:  41 43 4B 00 00 4F 4B 00 00 51 00 00 00 00 00 00
ASCII: A  C  K        O  K        Q
                                  |
                                  +-- Event: 51 (Dial Left)
```

### Sample CRT Brightness Command

```
Hex:  43 52 54 00 00 4C 49 47 00 00 64 00 00 00 00 00
ASCII: C  R  T        L  I  G        d
                                     |
                                     +-- Brightness: 100 (0x64)
```

---

## Remaining Questions

1. ~~**LCD button indices**~~ - ✓ Confirmed: LCD buttons 1-6 map to event IDs 0x01-0x06.
2. ~~**Dial 3 push event**~~ - ✓ Confirmed: 0x34 (ASCII '4')
3. ~~**Main dial push event**~~ - ✓ Confirmed: 0x35 (ASCII '5')
4. **Image format details** - Exact JPEG requirements (size, quality, dimensions).
5. ~~**Direction verification**~~ - ✓ Main dial directions confirmed working.
6. ~~**Shutdown sequence**~~ - ✓ Captured: CLE.DC, CLB.DC, HAH

---

## Revision History

| Date | Changes |
|------|---------|
| 2026-01-17 | Initial documentation from reverse engineering session |
| 2026-01-17 | Added complete button/encoder mapping after successful init_test |
| 2026-01-17 | Confirmed: Small buttons (0x25, 0x30, 0x31), Side encoders (0x90/0x91, 0x60), Dial 2 push (0x33) |
| 2026-01-17 | Added shutdown sequence (CLE.DC, CLB.DC, HAH), Main dial push (0x35), Dial 3 push (0x34) |
