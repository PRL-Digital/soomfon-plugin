//! Profile Handler
//!
//! Handles profile switching actions.
//! Note: Due to Tauri's state management architecture, profile switching
//! is typically performed via the `set_active_profile` IPC command rather
//! than through the action handler. This handler validates the request
//! and returns the appropriate profile ID to switch to.

use crate::actions::types::{ActionResult, ProfileAction};

/// Execute a profile switch action
///
/// This handler validates the profile action and returns success with the
/// profile information. The actual profile switching should be performed
/// by the frontend using the `set_active_profile` IPC command.
pub async fn execute(config: &ProfileAction) -> ActionResult {
    log::debug!("Executing profile action: {:?}", config);

    if let Some(ref id) = config.profile_id {
        log::info!("Profile switch requested by ID: {}", id);
        // The frontend should call set_active_profile with this ID
        ActionResult::success_with_message(
            format!("Profile switch requested: {}", id),
            0,
        )
    } else if let Some(ref name) = config.profile_name {
        log::info!("Profile switch requested by name: {}", name);
        // The frontend should look up the profile by name and call set_active_profile
        ActionResult::success_with_message(
            format!("Profile switch requested by name: {}", name),
            0,
        )
    } else {
        ActionResult::failure("No profile ID or name specified".to_string(), 0)
    }
}
