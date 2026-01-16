//! Action Commands
//!
//! Tauri commands for action execution.

use crate::actions::engine::{ActionEngine, HistoryEntry};
use crate::actions::types::{Action, ActionResult};
use crate::actions::IntegrationConfig;
use crate::config::manager::ConfigManager;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

/// Execute an action
///
/// Reads integration configuration (Home Assistant, Node-RED) from the config
/// manager and passes it to action handlers for execution.
///
/// Note: We need to clone the action and release the lock before awaiting
/// because parking_lot::MutexGuard is not Send.
#[tauri::command]
pub async fn execute_action(
    action: Action,
    engine: State<'_, Arc<Mutex<ActionEngine>>>,
    config_manager: State<'_, Arc<Mutex<ConfigManager>>>,
) -> Result<ActionResult, String> {
    // Check if another action is executing (without holding lock across await)
    {
        let engine_guard = engine.lock();
        if engine_guard.is_executing() {
            return Ok(ActionResult::failure("Another action is currently executing".to_string(), 0));
        }
    }

    // Get integration configuration from config manager
    let integrations = {
        let config_guard = config_manager.lock();
        let settings = config_guard.get_settings();
        IntegrationConfig {
            home_assistant: settings.home_assistant.clone(),
            node_red: settings.node_red.clone(),
        }
    };

    // Execute the action with integration config outside of the mutex lock
    let result = crate::actions::execute_action_with_config(&action, &integrations).await;

    // Record to history
    {
        let mut engine_guard = engine.lock();
        engine_guard.record_execution(&action, &result);
    }

    Ok(result)
}

/// Cancel the currently running action
#[tauri::command]
pub fn cancel_action(
    engine: State<Arc<Mutex<ActionEngine>>>,
) -> Result<(), String> {
    let mut engine = engine.lock();
    engine.cancel();
    Ok(())
}

/// Get action execution history
#[tauri::command]
pub fn get_action_history(
    engine: State<Arc<Mutex<ActionEngine>>>,
) -> Vec<HistoryEntry> {
    let engine = engine.lock();
    engine.get_history().to_vec()
}
