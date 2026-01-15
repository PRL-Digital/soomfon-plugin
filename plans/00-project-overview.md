# SOOMFON CN002-4B27 Custom Driver Project

## Project Goal

Build a custom Windows application to **completely replace** the official SOOMFON software for controlling the CN002-4B27 stream deck hardware. The new application will provide:

1. **Direct USB HID control** - No dependency on official software
2. **Fast, responsive UI** - Addressing sluggishness in official software
3. **Flexible customization** - Full control over button actions and configurations
4. **Integration capabilities** - Home Assistant, Node-RED, and custom scripting

## Target Device

| Property | Value |
|----------|-------|
| Model | SOOMFON CN002-4B27 |
| USB Vendor ID | `0x1500` (5376) |
| USB Product ID | `0x3001` (12289) |
| HID Interfaces | 2 (MI_00, MI_01) |

### Physical Layout
- **6 LCD Keys** - Buttons with customizable display images
- **3 Normal Buttons** - Standard buttons without displays
- **1 Main Encoder** - Large pushable rotary knob
- **2 Side Encoders** - Smaller pushable rotary knobs

## User Requirements

### Primary Use Cases
- Home automation control (Home Assistant)
- Custom scripting and terminal navigation
- Node-RED integration for IoT workflows
- Keyboard shortcuts and hotkeys
- Application launching
- Window management

### Quality Attributes
- Responsive UI (sub-100ms response times)
- Stable operation on Windows 11
- Persistent configuration across restarts
- System tray integration for background operation

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop Framework | Electron | Cross-platform desktop app |
| Frontend | React + TypeScript | Vite | User interface |
| Styling | Tailwind CSS | UI styling |
| Build Tool | Vite | Fast development builds |
| USB Communication | node-hid | HID device access |
| Image Processing | sharp | LCD button images |
| Keyboard Automation | @nut-tree/nut-js | Send keystrokes |
| Configuration | electron-store | Persistent settings |
| HTTP Client | axios | REST API calls |

## Project Phases

1. [Phase 1: Device Discovery](./01-device-discovery.md)
2. [Phase 2: Protocol Implementation](./02-protocol-implementation.md)
3. [Phase 3: Action System](./03-action-system.md)
4. [Phase 4: Configuration System](./04-configuration-system.md)
5. [Phase 5: Electron GUI](./05-electron-gui.md)
6. [Phase 6: Integrations](./06-integrations.md)
7. [Phase 7: Polish & Distribution](./07-polish-distribution.md)

## Success Criteria

The project is complete when:

- [ ] Application runs without official SOOMFON software
- [ ] All 12 physical inputs detected reliably (6 LCD + 3 buttons + 3 encoders)
- [ ] LCD images update correctly
- [ ] All action types functional (keyboard, launch, script, HTTP, system)
- [ ] Configuration persists across restarts
- [ ] Home Assistant integration works
- [ ] Node-RED webhooks work
- [ ] Windows installer available
- [ ] Auto-start on Windows boot works

## Risk Summary

| Risk | Impact | Mitigation |
|------|--------|------------|
| Unknown protocol | High | Phase 1 focuses on discovery with Wireshark |
| Dual HID interfaces | Medium | Test both to determine functionality |
| Native module compilation | Medium | Use electron-rebuild, document prerequisites |

## References

- [node-hid](https://github.com/node-hid/node-hid) - USB HID library
- [mirabox-streamdock-node](https://github.com/rigor789/mirabox-streamdock-node) - Similar device protocol reference
- [mirajazz](https://github.com/4ndv/mirajazz) - Rust library for similar devices
- [Elgato Stream Deck HID Docs](https://docs.elgato.com/streamdeck/hid/) - Protocol concepts reference
