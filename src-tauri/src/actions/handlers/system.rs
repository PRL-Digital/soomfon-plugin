//! System Handler
//!
//! System actions using keyboard shortcuts for consistent cross-platform behavior.
//! On Windows, uses SendInput from Win32 API to simulate key combinations.
//!
//! Supported actions:
//! - switch_desktop_left: Win+Ctrl+Left
//! - switch_desktop_right: Win+Ctrl+Right
//! - show_desktop: Win+D
//! - lock_screen: Win+L
//! - screenshot: Win+Shift+S (Snipping Tool)
//! - start_menu: Win key
//! - task_view: Win+Tab
//! - sleep: System sleep command
//! - hibernate: System hibernate command

use crate::actions::types::{ActionResult, SystemAction, SystemActionType};

/// Execute a system action
pub async fn execute(config: &SystemAction) -> ActionResult {
    log::debug!("Executing system action: {:?}", config.action);

    match config.action {
        SystemActionType::SwitchDesktopLeft => execute_shortcut(&[Key::LWin, Key::LCtrl], Key::Left),
        SystemActionType::SwitchDesktopRight => execute_shortcut(&[Key::LWin, Key::LCtrl], Key::Right),
        SystemActionType::ShowDesktop => execute_shortcut(&[Key::LWin], Key::D),
        SystemActionType::LockScreen => execute_shortcut(&[Key::LWin], Key::L),
        SystemActionType::Screenshot => execute_shortcut(&[Key::LWin, Key::LShift], Key::S),
        SystemActionType::StartMenu => execute_shortcut(&[], Key::LWin),
        SystemActionType::TaskView => execute_shortcut(&[Key::LWin], Key::Tab),
        SystemActionType::Sleep => sleep_system(),
        SystemActionType::Hibernate => hibernate_system(),
        SystemActionType::OpenUrl => {
            ActionResult::failure("OpenUrl should use Launch action instead".to_string(), 0)
        }
    }
}

/// Internal key representation for shortcut building
#[derive(Clone, Copy)]
enum Key {
    LWin,
    LCtrl,
    LShift,
    Left,
    Right,
    D,
    L,
    S,
    Tab,
}

/// Execute a keyboard shortcut (modifiers + key)
fn execute_shortcut(modifiers: &[Key], key: Key) -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        execute_shortcut_windows(modifiers, key)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (modifiers, key);
        ActionResult::failure("System shortcuts only supported on Windows".to_string(), 0)
    }
}

#[cfg(target_os = "windows")]
fn execute_shortcut_windows(modifiers: &[Key], key: Key) -> ActionResult {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    // Convert our keys to virtual key codes
    let mod_vks: Vec<VIRTUAL_KEY> = modifiers.iter().map(|k| key_to_vk(*k)).collect();
    let key_vk = key_to_vk(key);

    // Build input array
    let mut inputs: Vec<INPUT> = Vec::new();

    // Press modifiers
    for &vk in &mod_vks {
        inputs.push(create_key_input(vk, false));
    }

    // Press and release the main key
    inputs.push(create_key_input(key_vk, false));
    inputs.push(create_key_input(key_vk, true));

    // Release modifiers in reverse order
    for &vk in mod_vks.iter().rev() {
        inputs.push(create_key_input(vk, true));
    }

    // Send all inputs
    let sent = unsafe { SendInput(&inputs, std::mem::size_of::<INPUT>() as i32) };

    if sent as usize != inputs.len() {
        return ActionResult::failure(
            format!("SendInput failed: sent {} of {} inputs", sent, inputs.len()),
            0,
        );
    }

    ActionResult::success(0)
}

/// Convert our Key enum to Windows virtual key code
#[cfg(target_os = "windows")]
fn key_to_vk(key: Key) -> windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    match key {
        Key::LWin => VK_LWIN,
        Key::LCtrl => VK_LCONTROL,
        Key::LShift => VK_LSHIFT,
        Key::Left => VK_LEFT,
        Key::Right => VK_RIGHT,
        Key::D => VK_D,
        Key::L => VK_L,
        Key::S => VK_S,
        Key::Tab => VK_TAB,
    }
}

/// Create a keyboard INPUT structure
#[cfg(target_os = "windows")]
fn create_key_input(
    vk: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY,
    key_up: bool,
) -> windows::Win32::UI::Input::KeyboardAndMouse::INPUT {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    let mut flags = KEYBD_EVENT_FLAGS(0);
    if key_up {
        flags |= KEYEVENTF_KEYUP;
    }

    // Handle extended keys (arrows, Win key, etc.)
    if is_extended_key(vk) {
        flags |= KEYEVENTF_EXTENDEDKEY;
    }

    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

/// Check if a virtual key code is an extended key
#[cfg(target_os = "windows")]
fn is_extended_key(vk: windows::Win32::UI::Input::KeyboardAndMouse::VIRTUAL_KEY) -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::*;

    matches!(vk, VK_LEFT | VK_RIGHT | VK_UP | VK_DOWN | VK_LWIN | VK_RWIN)
}

/// Put the system to sleep
fn sleep_system() -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        // SetSuspendState: 0=sleep (not hibernate), 1=force, 0=no wake events
        match Command::new("rundll32.exe")
            .args(["powrprof.dll,SetSuspendState", "0,1,0"])
            .spawn()
        {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to sleep: {}", e), 0),
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        match Command::new("pmset").arg("sleepnow").spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to sleep: {}", e), 0),
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        // Try systemctl first, then fall back to pm-suspend
        if Command::new("systemctl").arg("suspend").spawn().is_ok() {
            return ActionResult::success(0);
        }
        if Command::new("pm-suspend").spawn().is_ok() {
            return ActionResult::success(0);
        }
        ActionResult::failure("No supported sleep mechanism found".to_string(), 0)
    }
}

/// Hibernate the system
fn hibernate_system() -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        match Command::new("shutdown").args(["/h"]).spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to hibernate: {}", e), 0),
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS doesn't have a direct hibernate command, use deep sleep
        use std::process::Command;
        match Command::new("pmset").args(["hibernatemode", "25"]).spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to hibernate: {}", e), 0),
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        // Try systemctl first, then fall back to pm-hibernate
        if Command::new("systemctl").arg("hibernate").spawn().is_ok() {
            return ActionResult::success(0);
        }
        if Command::new("pm-hibernate").spawn().is_ok() {
            return ActionResult::success(0);
        }
        ActionResult::failure("No supported hibernate mechanism found".to_string(), 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_action_type_from_json() {
        // Test snake_case serialization
        let json = r#"{"action": "switch_desktop_left"}"#;
        let action: SystemAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.action, SystemActionType::SwitchDesktopLeft);

        let json = r#"{"action": "lock_screen"}"#;
        let action: SystemAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.action, SystemActionType::LockScreen);

        // Test alias for backward compatibility
        let json = r#"{"action": "lock"}"#;
        let action: SystemAction = serde_json::from_str(json).unwrap();
        assert_eq!(action.action, SystemActionType::LockScreen);
    }

    #[test]
    fn test_all_action_types_deserialize() {
        let actions = [
            ("switch_desktop_left", SystemActionType::SwitchDesktopLeft),
            ("switch_desktop_right", SystemActionType::SwitchDesktopRight),
            ("show_desktop", SystemActionType::ShowDesktop),
            ("lock_screen", SystemActionType::LockScreen),
            ("screenshot", SystemActionType::Screenshot),
            ("start_menu", SystemActionType::StartMenu),
            ("task_view", SystemActionType::TaskView),
            ("sleep", SystemActionType::Sleep),
            ("hibernate", SystemActionType::Hibernate),
        ];

        for (json_value, expected) in actions {
            let json = format!(r#"{{"action": "{}"}}"#, json_value);
            let action: SystemAction = serde_json::from_str(&json).unwrap();
            assert_eq!(action.action, expected, "Failed for {}", json_value);
        }
    }
}
