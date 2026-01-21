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

The device **requires initialization** before it will send button events. The following sequence enables button event mode:

### Step 1: HID Get Feature Report (Optional)

This USB control transfer retrieves the firmware version. It is **NOT required** for enabling button events, but useful for device identification.

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
Offset 0x00: 43 52 54 00 00 4C 49 47 00 00 32 00 ...
             C  R  T        L  I  G        50
```
- Byte 10: Brightness value (0x32 = 50 = 50%)

### Step 4: CRT..STP (Stop/Commit) - CRITICAL

```
Offset 0x00: 43 52 54 00 00 53 54 50 00 00 ...
             C  R  T        S  T  P
```

This command **commits pending operations**. CRITICAL for enabling button event mode - must be sent after DIS and LIG during initialization.

### Step 5: CRT..CLE (Clear Screens) - CRITICAL

```
Offset 0x00: 43 52 54 00 00 43 4C 45 00 00 ...
             C  R  T        C  L  E
```

This simple CLE command (without DC parameters) **clears the LCD screens**. CRITICAL for enabling button event mode during initialization.

> **Note:** QUCMD and CONNECT commands (documented below) are NOT required for enabling button events. They were observed in official software but are optional.

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
| `CRT..STP` | `43 52 54 00 00 53 54 50` | Stop/Commit - finalizes pending operations (CRITICAL) |
| `CRT..CLE` | `43 52 54 00 00 43 4C 45` | Clear screens (simple version, no parameters) |
| `CRT..CONNECT` | `43 52 54 00 00 43 4F 4E 4E 45 43 54` | Connection/keepalive (optional) |
| `CRT..QUCMD` | `43 52 54 00 00 51 55 43 4D 44` | Quick command setup (optional) |

### Shutdown Commands

| Command | Hex Signature | Description |
|---------|---------------|-------------|
| `CRT..CLE.DC` | `43 52 54 00 00 43 4C 45 00 00 44 43` | Clear LCD displays to logo |
| `CRT..CLB.DC` | `43 52 54 00 00 43 4C 42 00 44 43` | Clear button states |
| `CRT..HAH` | `43 52 54 00 00 48 41 48` | Halt/shutdown device |

### CRT..CLE Command Parameters

The CLE (Clear) command supports different clearing modes via TG0/TG1 parameters at bytes 10-11:

| Mode | TG0 (byte 10) | TG1 (byte 11) | Description |
|------|---------------|---------------|-------------|
| Simple clear (init) | `0x00` | `0x00` | Used during initialization to enable event mode |
| Clear single button to black | `0x00` | `1-6` | Clears specific button to black |
| Clear all buttons to black | `0x00` | `0xFF` | Clears all buttons to black |
| Clear to logo | `0x44` ('D') | `0x43` ('C') | Clears displays and shows device logo (shutdown) |

**Simple clear (initialization):**
```
43 52 54 00 00 43 4C 45 00 00 00 00 ...
C  R  T        C  L  E        (zeros)
```

**Clear single button to black:**
```
43 52 54 00 00 43 4C 45 00 00 00 XX  (XX = button 1-6)
C  R  T        C  L  E        TG0 TG1
```

**Clear all buttons to black:**
```
43 52 54 00 00 43 4C 45 00 00 00 FF
C  R  T        C  L  E        TG0 TG1
```

**Clear to logo (shutdown):**
```
43 52 54 00 00 43 4C 45 00 00 44 43
C  R  T        C  L  E        D   C
```

> **Important:** Clear operations (except simple init clear) should be followed by an STP (Stop/Commit) command to ensure the operation completes successfully.

### Image Transfer Commands

| Command | Hex Signature | Description |
|---------|---------------|-------------|
| `CRT..BAT` | `43 52 54 00 00 42 41 54` | Begin image batch transfer |

---

## Image Transfer Protocol (BAT/STP Sequence)

LCD buttons support custom images via a 3-step protocol:

### Step 1: BAT Header Packet

The BAT (batch) command initiates an image transfer:

```
Offset  Size  Description
------  ----  -----------
0x00    3     Header: "CRT" (0x43 0x52 0x54)
0x03    2     Padding: 0x00 0x00
0x05    3     Command: "BAT" (0x42 0x41 0x54)
0x08    2     Padding: 0x00 0x00
0x0A    2     Image size (big-endian u16)
0x0C    1     Button index (1-6, protocol is 1-indexed)
```

**Example for button 0 (protocol index 1) with 1234-byte image:**
```
43 52 54 00 00 42 41 54 00 00 04 D2 01
C  R  T        B  A  T        [size] [btn]
                              ^^^^^  ^^^
                              1234   button 1
```

### Step 2: Image Data Chunks

Send JPEG data in 1024-byte packets (CRT_PACKET_SIZE):

- Each chunk is a full 1024-byte packet
- Data is padded with zeros if chunk is less than 1024 bytes
- Multiple packets sent for images larger than 1024 bytes
- **No header** - raw image data only
- Chunks are sent sequentially starting at offset 0

**Example for 2500-byte image:**
1. Chunk 1: bytes 0-1023 (1024 bytes)
2. Chunk 2: bytes 1024-2047 (1024 bytes)
3. Chunk 3: bytes 2048-2499 (452 bytes, padded to 1024)

### Step 3: STP Commit

Send CRT..STP packet to finalize the image transfer:

```
43 52 54 00 00 53 54 50 00 00 ...
C  R  T        S  T  P
```

The image will not display until the STP packet is sent.

### Image Requirements

| Property | Value |
|----------|-------|
| **Format** | JPEG |
| **Dimensions** | 60x60 pixels |
| **Quality** | 90% recommended |
| **Magic bytes** | `FF D8 FF` (validated by device/protocol) |
| **Button indexing** | UI uses 0-5, protocol uses 1-6 |

### JPEG Validation

The protocol validates JPEG data by checking magic bytes:
- Byte 0: `0xFF`
- Byte 1: `0xD8`
- Byte 2: `0xFF`

Invalid JPEG data will be rejected.

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

3. **Initialization required** - The device will NOT send button events until the initialization sequence (DIS, LIG, STP, CLE) is performed. The HID Get Feature Report is optional and only retrieves firmware version.

4. **STP commits required** - Most operations require CRT..STP to finalize:
   - After initialization (DIS, LIG)
   - After image transfers (BAT + data chunks)
   - After clearing buttons (CLE with parameters)

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
4. ~~**Image format details**~~ - ✓ Documented: 60x60 JPEG, BAT/STP protocol, see "Image Transfer Protocol" section.
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
| 2026-01-20 | Fixed CLE command byte positions (TG0/TG1 at bytes 10-11), documented clear modes |
| 2026-01-21 | Added CRT..STP and CRT..CLE commands, detailed image transfer protocol (BAT/STP), corrected init sequence |
