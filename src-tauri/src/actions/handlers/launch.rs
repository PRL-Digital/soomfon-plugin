//! Launch Handler
//!
//! Launches applications and opens URLs.

use crate::actions::types::{ActionResult, LaunchAction};
use std::process::Command;

/// Execute a launch action
pub async fn execute(config: &LaunchAction) -> ActionResult {
    log::debug!("Executing launch action: {:?}", config.path);

    // Check if it's a URL
    if config.path.starts_with("http://") || config.path.starts_with("https://") {
        return open_url(&config.path);
    }

    // Launch application
    let mut cmd = Command::new(&config.path);

    if !config.args.is_empty() {
        cmd.args(&config.args);
    }

    if let Some(ref working_dir) = config.working_directory {
        cmd.current_dir(working_dir);
    }

    match cmd.spawn() {
        Ok(_) => ActionResult::success(0),
        Err(e) => ActionResult::failure(format!("Failed to launch: {}", e), 0),
    }
}

fn open_url(url: &str) -> ActionResult {
    #[cfg(target_os = "windows")]
    {
        match Command::new("cmd").args(["/C", "start", "", url]).spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to open URL: {}", e), 0),
        }
    }

    #[cfg(target_os = "macos")]
    {
        match Command::new("open").arg(url).spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to open URL: {}", e), 0),
        }
    }

    #[cfg(target_os = "linux")]
    {
        match Command::new("xdg-open").arg(url).spawn() {
            Ok(_) => ActionResult::success(0),
            Err(e) => ActionResult::failure(format!("Failed to open URL: {}", e), 0),
        }
    }
}
