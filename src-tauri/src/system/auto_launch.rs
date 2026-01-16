//! Auto-Launch
//!
//! Manages auto-launch on system startup.

/// Check if auto-launch is enabled
pub fn is_enabled() -> bool {
    #[cfg(target_os = "windows")]
    {
        is_enabled_windows()
    }

    #[cfg(target_os = "macos")]
    {
        is_enabled_macos()
    }

    #[cfg(target_os = "linux")]
    {
        is_enabled_linux()
    }
}

/// Enable auto-launch
pub fn enable(app_path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        enable_windows(app_path)
    }

    #[cfg(target_os = "macos")]
    {
        enable_macos(app_path)
    }

    #[cfg(target_os = "linux")]
    {
        enable_linux(app_path)
    }
}

/// Disable auto-launch
pub fn disable() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        disable_windows()
    }

    #[cfg(target_os = "macos")]
    {
        disable_macos()
    }

    #[cfg(target_os = "linux")]
    {
        disable_linux()
    }
}

// Windows implementation using registry
#[cfg(target_os = "windows")]
fn is_enabled_windows() -> bool {
    use std::process::Command;

    let output = Command::new("reg")
        .args([
            "query",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            "SoomfonController",
        ])
        .output();

    output.map(|o| o.status.success()).unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn enable_windows(app_path: &str) -> Result<(), String> {
    use std::process::Command;

    let result = Command::new("reg")
        .args([
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            "SoomfonController",
            "/t",
            "REG_SZ",
            "/d",
            &format!("\"{}\" --hidden", app_path),
            "/f",
        ])
        .output();

    match result {
        Ok(output) if output.status.success() => Ok(()),
        Ok(output) => Err(String::from_utf8_lossy(&output.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(target_os = "windows")]
fn disable_windows() -> Result<(), String> {
    use std::process::Command;

    let result = Command::new("reg")
        .args([
            "delete",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            "SoomfonController",
            "/f",
        ])
        .output();

    match result {
        Ok(output) if output.status.success() => Ok(()),
        Ok(_) => Ok(()), // Ignore error if key doesn't exist
        Err(e) => Err(e.to_string()),
    }
}

// macOS implementation
#[cfg(target_os = "macos")]
fn is_enabled_macos() -> bool {
    // TODO: Check Login Items
    false
}

#[cfg(target_os = "macos")]
fn enable_macos(_app_path: &str) -> Result<(), String> {
    // TODO: Add to Login Items using AppleScript or LaunchAgent
    Err("Auto-launch not yet implemented for macOS".to_string())
}

#[cfg(target_os = "macos")]
fn disable_macos() -> Result<(), String> {
    // TODO: Remove from Login Items
    Err("Auto-launch not yet implemented for macOS".to_string())
}

// Linux implementation using XDG autostart
#[cfg(target_os = "linux")]
fn is_enabled_linux() -> bool {
    let autostart_path = dirs::config_dir()
        .map(|p| p.join("autostart/soomfon-controller.desktop"));

    autostart_path.map(|p| p.exists()).unwrap_or(false)
}

#[cfg(target_os = "linux")]
fn enable_linux(app_path: &str) -> Result<(), String> {
    use std::fs;

    let autostart_dir = dirs::config_dir()
        .ok_or("Could not find config directory")?
        .join("autostart");

    fs::create_dir_all(&autostart_dir)
        .map_err(|e| format!("Failed to create autostart directory: {}", e))?;

    let desktop_entry = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name=SOOMFON Controller\n\
         Exec={} --hidden\n\
         Hidden=false\n\
         NoDisplay=false\n\
         X-GNOME-Autostart-enabled=true\n",
        app_path
    );

    let desktop_path = autostart_dir.join("soomfon-controller.desktop");

    fs::write(&desktop_path, desktop_entry)
        .map_err(|e| format!("Failed to write desktop file: {}", e))?;

    Ok(())
}

#[cfg(target_os = "linux")]
fn disable_linux() -> Result<(), String> {
    use std::fs;

    let desktop_path = dirs::config_dir()
        .ok_or("Could not find config directory")?
        .join("autostart/soomfon-controller.desktop");

    if desktop_path.exists() {
        fs::remove_file(&desktop_path)
            .map_err(|e| format!("Failed to remove desktop file: {}", e))?;
    }

    Ok(())
}
