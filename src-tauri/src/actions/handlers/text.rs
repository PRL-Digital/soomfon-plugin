//! Text Handler
//!
//! Types text using keyboard simulation.

use crate::actions::types::{ActionResult, TextAction};

/// Execute a text typing action
pub async fn execute(config: &TextAction) -> ActionResult {
    log::debug!("Executing text action: {} chars", config.text.len());

    #[cfg(target_os = "windows")]
    {
        execute_windows(config).await
    }

    #[cfg(not(target_os = "windows"))]
    {
        ActionResult::failure("Text actions only supported on Windows".to_string(), 0)
    }
}

#[cfg(target_os = "windows")]
async fn execute_windows(config: &TextAction) -> ActionResult {
    // TODO: Implement text typing using SendInput with Unicode support
    // This requires converting each character to KEYBDINPUT with KEYEVENTF_UNICODE

    ActionResult::failure("Text handler not yet implemented".to_string(), 0)
}
