//! Media Handler
//!
//! Simulates media key input for play/pause, volume, track navigation.

use crate::actions::types::{ActionResult, MediaAction};

/// Execute a media action
pub async fn execute(config: &MediaAction) -> ActionResult {
    log::debug!("Executing media action: {:?}", config.action);

    #[cfg(target_os = "windows")]
    {
        execute_windows(config)
    }

    #[cfg(not(target_os = "windows"))]
    {
        ActionResult::failure("Media actions only supported on Windows".to_string(), 0)
    }
}

#[cfg(target_os = "windows")]
fn execute_windows(config: &MediaAction) -> ActionResult {
    // TODO: Implement media key simulation using SendInput with virtual key codes
    // VK_MEDIA_PLAY_PAUSE, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PREV_TRACK,
    // VK_VOLUME_UP, VK_VOLUME_DOWN, VK_VOLUME_MUTE

    ActionResult::failure("Media handler not yet implemented".to_string(), 0)
}
