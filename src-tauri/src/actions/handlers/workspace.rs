//! Workspace Handler
//!
//! Handles workspace navigation actions within the current profile.
//! Note: Due to Tauri's state management architecture, workspace switching
//! is typically performed via the frontend. This handler validates the request
//! and returns the appropriate workspace information.

use crate::actions::types::{ActionResult, WorkspaceAction, WorkspaceDirection};

/// Execute a workspace navigation action
///
/// This handler validates the workspace action and returns success with the
/// navigation information. The actual workspace switching should be performed
/// by the frontend.
pub async fn execute(config: &WorkspaceAction) -> ActionResult {
    log::debug!("Executing workspace action: {:?}", config);

    match config.direction {
        WorkspaceDirection::Next => {
            log::info!("Workspace navigation: next");
            ActionResult::success_with_message(
                "Workspace switch requested: next".to_string(),
                0,
            )
        }
        WorkspaceDirection::Previous => {
            log::info!("Workspace navigation: previous");
            ActionResult::success_with_message(
                "Workspace switch requested: previous".to_string(),
                0,
            )
        }
        WorkspaceDirection::Specific => {
            if let Some(index) = config.workspace_index {
                log::info!("Workspace navigation: specific index {}", index);
                ActionResult::success_with_message(
                    format!("Workspace switch requested: index {}", index),
                    0,
                )
            } else {
                ActionResult::failure(
                    "Workspace index required for specific navigation".to_string(),
                    0,
                )
            }
        }
    }
}
