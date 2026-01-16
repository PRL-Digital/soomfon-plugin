//! Action Commands
//!
//! Tauri commands for action execution.

use crate::actions::engine::{ActionEngine, HistoryEntry};
use crate::actions::types::{Action, ActionResult};
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::State;

/// Execute an action
#[tauri::command]
pub async fn execute_action(
    action: Action,
    engine: State<'_, Arc<Mutex<ActionEngine>>>,
) -> Result<ActionResult, String> {
    let mut engine = engine.lock();
    Ok(engine.execute(&action).await)
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
