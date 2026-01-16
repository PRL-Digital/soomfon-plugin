# Agent Operations Guide

## Running Tests
```bash
npm test
```

## Git Operations
- Git identity may need configuration: `git config user.name "Name"` and `git config user.email "email"`
- Get previous author: `git log -1 --format='%an <%ae>'`

## Platform Notes
- Tests run in Windows Node even in WSL
- Module-level constants like `isWindows = process.platform === 'win32'` are evaluated at load time
- Don't rely on changing `process.platform` at runtime in tests

## Rust/Tauri Development
```bash
# Source Rust environment (if not in PATH)
export PATH="$HOME/.cargo/bin:$PATH"

# Check Rust version
rustc --version && cargo --version

# Tauri build requires platform-specific dev libraries:
# Linux: apt install libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev pkg-config libudev-dev libssl-dev
# Windows: WebView2 (included in Windows 10+)
# macOS: Xcode Command Line Tools

# Run Rust tests
cd src-tauri && cargo test

# Check compilation
cd src-tauri && cargo check
```

## Icon Requirements
- Tauri icons must be RGBA format PNG files
- Use Python Pillow: `Image.new('RGBA', (size, size), (r, g, b, 255))`
- Required files: icons/32x32.png, 128x128.png, 128x128@2x.png, icon.png, icon.ico, icon.icns
