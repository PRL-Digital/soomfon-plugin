# SOOMFON CN002-4B27 Custom Driver Project

## Purpose
Build a custom Windows application to completely replace the official SOOMFON software for controlling the CN002-4B27 stream deck hardware.

## Target Device
- **Model:** SOOMFON CN002-4B27
- **USB VID:** 0x1500 (5376)
- **USB PID:** 0x3001 (12289)
- **HID Interfaces:** 2 (MI_00, MI_01)
- **Physical Layout:** 6 LCD Keys, 3 Normal Buttons, 1 Main Encoder, 2 Side Encoders

## Tech Stack
- **Desktop Framework:** Tauri 2.x (Rust backend)
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **USB Communication:** hidapi (Rust)
- **Image Processing:** image crate (Rust)
- **Configuration:** Tauri persistent storage (JSON)
- **Testing:** Vitest

## Project Phases
1. Phase 1: Device Discovery (current)
2. Phase 2: Protocol Implementation
3. Phase 3: Action System
4. Phase 4: Configuration System
5. Phase 5: Electron GUI
6. Phase 6: Integrations
7. Phase 7: Polish & Distribution
