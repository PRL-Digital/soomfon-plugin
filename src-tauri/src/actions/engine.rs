//! Action Engine
//!
//! Central engine for executing actions. Manages handler registration and execution.

use super::types::{Action, ActionResult};
use std::time::Instant;

/// Action execution history entry
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub action_type: String,
    pub success: bool,
    pub duration_ms: u64,
    pub timestamp: u64,
    pub error: Option<String>,
}

/// Central action execution engine
pub struct ActionEngine {
    /// Execution history (limited to last 100 entries)
    history: Vec<HistoryEntry>,
    /// Maximum history size
    max_history: usize,
    /// Whether an action is currently executing
    is_executing: bool,
}

impl ActionEngine {
    /// Create a new action engine
    pub fn new() -> Self {
        Self {
            history: Vec::new(),
            max_history: 100,
            is_executing: false,
        }
    }

    /// Execute an action
    pub async fn execute(&mut self, action: &Action) -> ActionResult {
        if self.is_executing {
            return ActionResult::failure("Another action is currently executing".to_string(), 0);
        }

        self.is_executing = true;
        let start = Instant::now();

        let result = match action {
            Action::Keyboard(config) => {
                super::handlers::keyboard::execute(config).await
            }
            Action::Media(config) => {
                super::handlers::media::execute(config).await
            }
            Action::Launch(config) => {
                super::handlers::launch::execute(config).await
            }
            Action::Script(config) => {
                super::handlers::script::execute(config).await
            }
            Action::Http(config) => {
                super::handlers::http::execute(config).await
            }
            Action::System(config) => {
                super::handlers::system::execute(config).await
            }
            Action::Text(config) => {
                super::handlers::text::execute(config).await
            }
            Action::Profile(config) => {
                super::handlers::profile::execute(config).await
            }
            Action::HomeAssistant(config) => {
                super::handlers::home_assistant::execute(config).await
            }
            Action::NodeRed(config) => {
                super::handlers::node_red::execute(config).await
            }
        };

        let duration = start.elapsed().as_millis() as u64;

        // Record to history
        let entry = HistoryEntry {
            action_type: self.get_action_type_name(action),
            success: result.success,
            duration_ms: duration,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            error: result.error.clone(),
        };

        self.history.push(entry);
        if self.history.len() > self.max_history {
            self.history.remove(0);
        }

        self.is_executing = false;

        ActionResult {
            duration_ms: duration,
            ..result
        }
    }

    /// Cancel the current action (if supported)
    pub fn cancel(&mut self) {
        // TODO: Implement cancellation for long-running actions
        self.is_executing = false;
    }

    /// Check if an action is currently executing
    pub fn is_executing(&self) -> bool {
        self.is_executing
    }

    /// Record an action execution to history
    pub fn record_execution(&mut self, action: &Action, result: &ActionResult) {
        let entry = HistoryEntry {
            action_type: self.get_action_type_name(action),
            success: result.success,
            duration_ms: result.duration_ms,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            error: result.error.clone(),
        };

        self.history.push(entry);
        if self.history.len() > self.max_history {
            self.history.remove(0);
        }
    }

    /// Get execution history
    pub fn get_history(&self) -> &[HistoryEntry] {
        &self.history
    }

    /// Clear execution history
    pub fn clear_history(&mut self) {
        self.history.clear();
    }

    fn get_action_type_name(&self, action: &Action) -> String {
        match action {
            Action::Keyboard(_) => "keyboard".to_string(),
            Action::Media(_) => "media".to_string(),
            Action::Launch(_) => "launch".to_string(),
            Action::Script(_) => "script".to_string(),
            Action::Http(_) => "http".to_string(),
            Action::System(_) => "system".to_string(),
            Action::Text(_) => "text".to_string(),
            Action::Profile(_) => "profile".to_string(),
            Action::HomeAssistant(_) => "homeAssistant".to_string(),
            Action::NodeRed(_) => "nodeRed".to_string(),
        }
    }
}

impl Default for ActionEngine {
    fn default() -> Self {
        Self::new()
    }
}
