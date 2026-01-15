# Tray Icons

The system tray icons are generated programmatically in `src/main/tray.ts` using SVG-to-nativeImage conversion.

## Icon States

- **Default (tray-icon.png)**: Purple/indigo icon shown when device state is unknown
- **Connected (tray-icon-connected.png)**: Green icon shown when device is connected
- **Disconnected (tray-icon-disconnected.png)**: Red icon shown when device is disconnected

## Customization

To use custom PNG icons instead of programmatic generation:

1. Replace the placeholder files with 32x32 PNG images
2. Update `src/main/tray.ts` to load from file:

```typescript
import * as path from 'path';

private createIcon(state: TrayIconState): Electron.NativeImage {
  const iconPath = path.join(__dirname, '../../assets/tray', `tray-icon-${state}.png`);
  return nativeImage.createFromPath(iconPath);
}
```

## Recommended Specifications

- **Size**: 32x32 pixels (or 16x16 for standard DPI)
- **Format**: PNG with transparency
- **Color Depth**: 32-bit RGBA
