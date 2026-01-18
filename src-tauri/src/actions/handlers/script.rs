//! Script Handler
//!
//! Executes scripts (PowerShell, Bash, CMD, or script files).

use crate::actions::types::{ActionResult, ScriptAction, ScriptType};
use std::process::Command;
use std::time::Duration;
use tokio::time::timeout;

/// Default script timeout in milliseconds
const DEFAULT_TIMEOUT_MS: u64 = 30000;

/// Execute a script action
pub async fn execute(config: &ScriptAction) -> ActionResult {
    log::debug!("Executing script action: {:?}", config.script_type);

    let timeout_ms = config.timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);

    let result = timeout(
        Duration::from_millis(timeout_ms),
        execute_script(config)
    ).await;

    match result {
        Ok(action_result) => action_result,
        Err(_) => ActionResult::failure("Script execution timed out".to_string(), timeout_ms),
    }
}

async fn execute_script(config: &ScriptAction) -> ActionResult {
    // Get script content - try `script` field first, then `content` for backwards compatibility
    let script_content = config.script.as_ref()
        .or(config.content.as_ref())
        .map(|s| s.as_str());

    // Get script path if provided
    let script_path = config.script_path.as_ref().map(|s| s.as_str());

    let result = match config.script_type {
        ScriptType::PowerShell => {
            let content = match script_content {
                Some(c) => c,
                None => return ActionResult::failure("No script content provided".to_string(), 0),
            };
            #[cfg(target_os = "windows")]
            {
                Command::new("powershell")
                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", content])
                    .output()
            }
            #[cfg(not(target_os = "windows"))]
            {
                Command::new("pwsh")
                    .args(["-NoProfile", "-Command", content])
                    .output()
            }
        }
        ScriptType::Bash => {
            let content = match script_content {
                Some(c) => c,
                None => return ActionResult::failure("No script content provided".to_string(), 0),
            };
            Command::new("bash")
                .args(["-c", content])
                .output()
        }
        ScriptType::Cmd => {
            let content = match script_content {
                Some(c) => c,
                None => return ActionResult::failure("No script content provided".to_string(), 0),
            };
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", content])
                    .output()
            }
            #[cfg(not(target_os = "windows"))]
            {
                return ActionResult::failure("CMD is only supported on Windows".to_string(), 0);
            }
        }
        ScriptType::File => {
            // Execute script file directly
            let path = match script_path.or(script_content) {
                Some(p) => p,
                None => return ActionResult::failure("No script path provided".to_string(), 0),
            };
            Command::new(path).output()
        }
    };

    match result {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                ActionResult::success_with_message(stdout, 0)
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                ActionResult::failure(stderr, 0)
            }
        }
        Err(e) => ActionResult::failure(format!("Script execution failed: {}", e), 0),
    }
}
