//! System Handler
//!
//! System actions like lock screen, sleep, screenshot.

use crate::actions::types::{ActionResult, SystemAction, SystemActionType};

/// Execute a system action
pub async fn execute(config: &SystemAction) -> ActionResult {
    log::debug!("Executing system action: {:?}", config.action);

    match config.action {
        SystemActionType::Lock => lock_screen(),
        SystemActionType::Sleep => sleep_system(),
        SystemActionType::Hibernate => hibernate_system(),
        SystemActionType::Screenshot => take_screenshot(),
        SystemActionType::OpenUrl => {
            ActionResult::failure("OpenUrl should use Launch action".to_string(), 0)
        }
    }
}

fn lock_screen() -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        match Command::new("rundll32.exe")
            .args(["user32.dll,LockWorkStation"])
            .spawn()
        {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to lock screen: {}", e), 0),
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        match Command::new("pmset").arg("displaysleepnow").spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to lock screen: {}", e), 0),
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        // Try multiple lock commands
        if Command::new("loginctl").arg("lock-session").spawn().is_ok() {
            return ActionResult::success(0);
        }
        if Command::new("xdg-screensaver").arg("lock").spawn().is_ok() {
            return ActionResult::success(0);
        }
        ActionResult::failure("No supported lock mechanism found".to_string(), 0)
    }
}

fn sleep_system() -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        match Command::new("rundll32.exe")
            .args(["powrprof.dll,SetSuspendState", "0,1,0"])
            .spawn()
        {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to sleep: {}", e), 0),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        ActionResult::failure("Sleep not implemented for this platform".to_string(), 0)
    }
}

fn hibernate_system() -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        match Command::new("shutdown").args(["/h"]).spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to hibernate: {}", e), 0),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        ActionResult::failure("Hibernate not implemented for this platform".to_string(), 0)
    }
}

fn take_screenshot() -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        // TODO: Implement screenshot using Win32 API
        ActionResult::failure("Screenshot not yet implemented".to_string(), 0)
    }

    #[cfg(not(target_os = "windows"))]
    {
        ActionResult::failure("Screenshot not implemented for this platform".to_string(), 0)
    }
}
