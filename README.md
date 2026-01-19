# SOOMFON Controller

A desktop application for controlling SOOMFON CN002-4B27 stream deck-style HID devices. Configure custom button actions, encoder behaviors, and LCD images through an intuitive GUI.

## Features

### Device Control
- 6 LCD buttons with customizable 60x60px images
- 3 physical buttons (including shift modifier)
- 3 rotary encoders with press, rotation, and long-press actions
- Real-time device state visualization

### Action System
- **Keyboard**: Custom hotkeys with modifier support (Ctrl, Alt, Shift, Win)
- **Launch**: Open applications, files, URLs, or folders
- **Script**: Execute PowerShell, Command Prompt, or Bash scripts
- **HTTP**: Send REST API requests with custom headers/body
- **Media**: Control system media playback and volume
- **System**: Quick access to desktop, Task View, screenshots, etc.
- **Workspace**: Navigate between workspace configurations

### Configuration
- Multiple profiles with quick switching
- Workspaces for organizing button/encoder layouts
- Shift modifier for doubling button functionality
- Import/export profiles as JSON
- Automatic configuration persistence

### Application
- System tray integration with device status
- Auto-launch on Windows startup
- Minimize/close to tray options
- Real-time device connection status
- Image cropping and preview tools

## Prerequisites

- **Windows 10/11** (primary platform)
- **Node.js 18+** for development
- **Rust 1.70+** with Tauri CLI for building

## Installation

### From Release

1. Download the latest release from the releases page
2. Run the installer (`.msi` or `.exe`)
3. Launch SOOMFON Controller from the Start Menu

### From Source

```bash
# Clone the repository
git clone https://github.com/your-username/soomfon-controller.git
cd soomfon-controller

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run tauri:dev` | Start full Tauri development environment |
| `npm run build` | Build TypeScript and Vite |
| `npm run tauri:build` | Build production Tauri application |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | Type-check all TypeScript files |

### Building for Production

```bash
# Full production build
npm run tauri:build

# Output location
# Windows: src-tauri/target/release/bundle/
```

## Testing

The project includes 1179+ tests using Vitest:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Project Structure

```
soomfon-controller/
├── src/
│   ├── core/           # Shared business logic and utilities
│   │   ├── actions/    # Action handlers and event binding
│   │   ├── config/     # Configuration management
│   │   ├── device/     # Device event parsing
│   │   └── integrations/  # Home Assistant, Node-RED
│   ├── renderer/       # React frontend
│   │   ├── components/ # UI components
│   │   ├── hooks/      # React hooks
│   │   └── styles/     # CSS styles
│   ├── shared/         # Shared TypeScript types
│   └── lib/            # Tauri API adapter
├── src-tauri/          # Rust backend
│   └── src/
│       ├── hid/        # USB HID communication
│       ├── config/     # Configuration persistence
│       ├── image/      # Image processing
│       └── actions/    # Action execution
├── docs/               # Documentation
├── assets/             # Static assets
└── scripts/            # Development utilities
```

## Device Compatibility

| Device | VID | PID | Status |
|--------|-----|-----|--------|
| SOOMFON CN002-4B27 | 0x1500 | 0x3001 | Supported |

### Device Layout

- **Top Row**: LCD Buttons 1-3 (indices 0-2)
- **Middle Row**: LCD Buttons 4-6 (indices 3-5)
- **Bottom Left**: Physical Buttons (Shift, Prev Workspace, Next Workspace)
- **Bottom Right**: Rotary Encoders 1-3

## Configuration

Configuration is stored in JSON format at:
- **Windows**: `%APPDATA%/soomfon-controller/config.json`

### Profile Structure

```json
{
  "profiles": [{
    "id": "uuid",
    "name": "Default",
    "workspaces": [{
      "id": "uuid",
      "name": "Main",
      "buttons": [...],
      "encoders": [...]
    }],
    "activeWorkspaceIndex": 0
  }],
  "activeProfileId": "uuid",
  "settings": {
    "device": { "brightness": 100 },
    "app": { "launchOnStartup": false }
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Run `npm test` before committing
- Ensure TypeScript compiles without errors (`npm run typecheck`)
- Follow existing code style and patterns
- Add tests for new functionality

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [mirajazz](https://github.com/4ndv/mirajazz) - Reference implementation for image transfer protocol
- [Tauri](https://tauri.app/) - Desktop application framework
- [React](https://react.dev/) - UI framework
