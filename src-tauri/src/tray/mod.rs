//! System Tray Module
//!
//! Handles system tray icon and menu with connection status indication.

use tauri::{
    AppHandle, Manager,
    image::Image,
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
};

/// Connection status for tray icon
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrayStatus {
    Connected,
    Disconnected,
    Error,
}

impl TrayStatus {
    /// Get the color associated with this status as (R, G, B)
    pub fn color(&self) -> (u8, u8, u8) {
        match self {
            TrayStatus::Connected => (76, 175, 80),     // Green (#4CAF50)
            TrayStatus::Disconnected => (100, 100, 100), // Gray (#646464)
            TrayStatus::Error => (244, 67, 54),          // Red (#F44336)
        }
    }

    /// Get a tooltip text for this status
    pub fn tooltip(&self) -> &'static str {
        match self {
            TrayStatus::Connected => "SOOMFON Controller - Connected",
            TrayStatus::Disconnected => "SOOMFON Controller - Disconnected",
            TrayStatus::Error => "SOOMFON Controller - Error",
        }
    }
}

/// Build the system tray
pub fn build_tray(app: &AppHandle) -> Result<TrayIcon, tauri::Error> {
    let menu = build_tray_menu(app)?;

    // Start with disconnected status icon
    let icon = create_status_icon(TrayStatus::Disconnected);

    TrayIconBuilder::new()
        .icon(icon)
        .tooltip(TrayStatus::Disconnected.tooltip())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            handle_menu_event(app, &event.id.0);
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button, .. } = event {
                if button == tauri::tray::MouseButton::Left {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)
}

/// Build the tray context menu
fn build_tray_menu(app: &AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let separator = MenuItem::with_id(app, "sep", "---", false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    Menu::with_items(app, &[&show, &separator, &quit])
}

/// Handle tray menu events
fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

/// Create a status-colored icon
///
/// Generates a 32x32 RGBA icon with the status color.
/// This provides visual feedback about connection state in the system tray.
fn create_status_icon(status: TrayStatus) -> Image<'static> {
    const SIZE: u32 = 32;
    let (r, g, b) = status.color();

    // Create RGBA buffer: SIZE * SIZE pixels, 4 bytes each (RGBA)
    let mut rgba = Vec::with_capacity((SIZE * SIZE * 4) as usize);

    for y in 0..SIZE {
        for x in 0..SIZE {
            // Create a rounded square icon
            let center = SIZE as f32 / 2.0;
            let radius = SIZE as f32 / 2.0 - 2.0; // Leave 2px border
            let dx = x as f32 - center;
            let dy = y as f32 - center;
            let dist = (dx * dx + dy * dy).sqrt();

            if dist <= radius {
                // Inside the circle - draw with status color
                rgba.push(r);
                rgba.push(g);
                rgba.push(b);
                rgba.push(255); // Fully opaque
            } else if dist <= radius + 1.0 {
                // Anti-aliased edge
                let alpha = ((radius + 1.0 - dist) * 255.0) as u8;
                rgba.push(r);
                rgba.push(g);
                rgba.push(b);
                rgba.push(alpha);
            } else {
                // Outside - transparent
                rgba.push(0);
                rgba.push(0);
                rgba.push(0);
                rgba.push(0);
            }
        }
    }

    // Convert to owned data for 'static lifetime
    Image::new_owned(rgba, SIZE, SIZE)
}

/// Update tray icon based on connection status
///
/// Changes the tray icon color and tooltip to reflect the current device
/// connection state:
/// - Connected (green): Device is connected and ready
/// - Disconnected (gray): No device connected
/// - Error (red): Connection error occurred
pub fn update_tray_status(tray: &TrayIcon, status: TrayStatus) {
    // Update the icon with the new status color
    let icon = create_status_icon(status);
    let _ = tray.set_icon(Some(icon));

    // Update the tooltip
    let _ = tray.set_tooltip(Some(status.tooltip()));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tray_status_connected_color() {
        let (r, g, b) = TrayStatus::Connected.color();
        assert_eq!(r, 76);
        assert_eq!(g, 175);
        assert_eq!(b, 80);
    }

    #[test]
    fn test_tray_status_disconnected_color() {
        let (r, g, b) = TrayStatus::Disconnected.color();
        assert_eq!(r, 100);
        assert_eq!(g, 100);
        assert_eq!(b, 100);
    }

    #[test]
    fn test_tray_status_error_color() {
        let (r, g, b) = TrayStatus::Error.color();
        assert_eq!(r, 244);
        assert_eq!(g, 67);
        assert_eq!(b, 54);
    }

    #[test]
    fn test_tray_status_connected_tooltip() {
        assert_eq!(TrayStatus::Connected.tooltip(), "SOOMFON Controller - Connected");
    }

    #[test]
    fn test_tray_status_disconnected_tooltip() {
        assert_eq!(TrayStatus::Disconnected.tooltip(), "SOOMFON Controller - Disconnected");
    }

    #[test]
    fn test_tray_status_error_tooltip() {
        assert_eq!(TrayStatus::Error.tooltip(), "SOOMFON Controller - Error");
    }

    #[test]
    fn test_create_status_icon_size() {
        // Test that create_status_icon creates a valid image
        let icon = create_status_icon(TrayStatus::Connected);
        // Image should be 32x32
        assert_eq!(icon.width(), 32);
        assert_eq!(icon.height(), 32);
    }

    #[test]
    fn test_create_status_icon_different_statuses() {
        // All statuses should create valid icons
        let _ = create_status_icon(TrayStatus::Connected);
        let _ = create_status_icon(TrayStatus::Disconnected);
        let _ = create_status_icon(TrayStatus::Error);
    }
}
