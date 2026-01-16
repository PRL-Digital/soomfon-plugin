//! Action Commands
//!
//! Tauri commands for action execution.

use crate::actions::engine::{ActionEngine, HistoryEntry};
use crate::actions::types::{Action, ActionResult};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

/// Execute an action
///
/// Note: We need to clone the action and release the lock before awaiting
/// because parking_lot::MutexGuard is not Send.
#[tauri::command]
pub async fn execute_action(
    action: Action,
    engine: State<'_, Arc<Mutex<ActionEngine>>>,
) -> Result<ActionResult, String> {
    // Check if another action is executing (without holding lock across await)
    {
        let engine_guard = engine.lock();
        if engine_guard.is_executing() {
            return Ok(ActionResult::failure("Another action is currently executing".to_string(), 0));
        }
    }

    // Execute the action outside of the mutex lock
    // The engine's internal state management handles concurrency
    let result = crate::actions::execute_action_standalone(&action).await;

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
