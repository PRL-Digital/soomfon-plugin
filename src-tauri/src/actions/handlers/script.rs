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
    let result = match config.script_type {
        ScriptType::PowerShell => {
            #[cfg(target_os = "windows")]
            {
                Command::new("powershell")
                    .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &config.content])
                    .output()
            }
            #[cfg(not(target_os = "windows"))]
            {
                Command::new("pwsh")
                    .args(["-NoProfile", "-Command", &config.content])
                    .output()
            }
        }
        ScriptType::Bash => {
            Command::new("bash")
                .args(["-c", &config.content])
                .output()
        }
        ScriptType::Cmd => {
            #[cfg(target_os = "windows")]
            {
                Command::new("cmd")
                    .args(["/C", &config.content])
                    .output()
            }
            #[cfg(not(target_os = "windows"))]
            {
                return ActionResult::failure("CMD is only supported on Windows".to_string(), 0);
            }
        }
        ScriptType::File => {
            // Execute script file directly
            Command::new(&config.content).output()
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
