//! Action Engine
//!
//! Central engine for executing actions. Manages handler registration and execution.
//! Supports cancellation of long-running actions via a cancellation token pattern.

use super::types::{Action, ActionResult};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
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

/// Cancellation token for long-running actions
///
/// This token can be cloned and shared across async tasks. When `cancel()` is called,
/// all holders of the token will see `is_cancelled()` return true.
#[derive(Debug, Clone)]
pub struct CancellationToken {
    cancelled: Arc<AtomicBool>,
}

impl CancellationToken {
    /// Create a new cancellation token
    pub fn new() -> Self {
        Self {
            cancelled: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Check if cancellation has been requested
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }

    /// Request cancellation
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }

    /// Reset the token for reuse
    pub fn reset(&self) {
        self.cancelled.store(false, Ordering::SeqCst);
    }
}

impl Default for CancellationToken {
    fn default() -> Self {
        Self::new()
    }
}

/// Central action execution engine
pub struct ActionEngine {
    /// Execution history (limited to last 100 entries)
    history: Vec<HistoryEntry>,
    /// Maximum history size
    max_history: usize,
    /// Whether an action is currently executing
    is_executing: bool,
    /// Cancellation token for the current action
    cancellation_token: CancellationToken,
}

impl ActionEngine {
    /// Create a new action engine
    pub fn new() -> Self {
        Self {
            history: Vec::new(),
            max_history: 100,
            is_executing: false,
            cancellation_token: CancellationToken::new(),
        }
    }

    /// Get a clone of the current cancellation token
    ///
    /// This can be passed to handlers that support cancellation so they can
    /// check `is_cancelled()` during long-running operations.
    pub fn get_cancellation_token(&self) -> CancellationToken {
        self.cancellation_token.clone()
    }

    /// Execute an action
    pub async fn execute(&mut self, action: &Action) -> ActionResult {
        if self.is_executing {
            return ActionResult::failure("Another action is currently executing".to_string(), 0);
        }

        self.is_executing = true;
        // Reset the cancellation token for the new action
        self.cancellation_token.reset();
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
            Action::Workspace(config) => {
                super::handlers::workspace::execute(config).await
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
    ///
    /// This sets the cancellation token, which long-running handlers can check
    /// to abort their operations early. Handlers that don't support cancellation
    /// will complete normally.
    ///
    /// Note: This does not immediately stop the action - it signals a cancellation
    /// request that cooperative handlers will check and respond to.
    pub fn cancel(&mut self) {
        // Signal cancellation to any handler that supports it
        self.cancellation_token.cancel();
        // Reset the executing flag to allow new actions
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
            Action::Workspace(_) => "workspace".to_string(),
        }
    }
}

impl Default for ActionEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::actions::types::{
        Action, KeyboardAction, MediaAction, MediaActionType, LaunchAction, ScriptAction,
        ScriptType, HttpAction, HttpMethod, SystemAction, SystemActionType, TextAction,
        ProfileAction, HomeAssistantAction, HomeAssistantActionType, NodeRedAction,
    };
    use std::collections::HashMap;

    // ========== Helper Functions ==========

    fn create_keyboard_action() -> Action {
        Action::Keyboard(KeyboardAction {
            key: "A".to_string(),
            modifiers: vec![],
        })
    }

    fn create_media_action() -> Action {
        Action::Media(MediaAction {
            action: MediaActionType::PlayPause,
        })
    }

    fn create_launch_action() -> Action {
        Action::Launch(LaunchAction {
            path: "/usr/bin/test".to_string(),
            args: vec![],
            working_directory: None,
        })
    }

    fn create_script_action() -> Action {
        Action::Script(ScriptAction {
            script_type: ScriptType::Bash,
            content: "echo test".to_string(),
            timeout_ms: None,
        })
    }

    fn create_http_action() -> Action {
        Action::Http(HttpAction {
            method: HttpMethod::Get,
            url: "https://example.com".to_string(),
            headers: HashMap::new(),
            body: None,
            timeout_ms: None,
        })
    }

    fn create_system_action() -> Action {
        Action::System(SystemAction {
            action: SystemActionType::ShowDesktop,
        })
    }

    fn create_text_action() -> Action {
        Action::Text(TextAction {
            text: "Hello".to_string(),
            delay_ms: None,
        })
    }

    fn create_profile_action() -> Action {
        Action::Profile(ProfileAction {
            profile_id: Some("profile-1".to_string()),
            profile_name: None,
        })
    }

    fn create_home_assistant_action() -> Action {
        Action::HomeAssistant(HomeAssistantAction {
            action_type: HomeAssistantActionType::Toggle,
            entity_id: "light.living_room".to_string(),
            service: None,
            service_data: None,
        })
    }

    fn create_node_red_action() -> Action {
        Action::NodeRed(NodeRedAction {
            flow_id: "flow-1".to_string(),
            payload: None,
        })
    }

    // ========== Engine Creation Tests ==========

    #[test]
    fn test_new_creates_engine_with_empty_history() {
        let engine = ActionEngine::new();
        assert!(engine.get_history().is_empty());
        assert!(!engine.is_executing());
    }

    #[test]
    fn test_default_creates_engine() {
        let engine = ActionEngine::default();
        assert!(engine.get_history().is_empty());
        assert!(!engine.is_executing());
    }

    // ========== Action Type Name Tests ==========

    #[test]
    fn test_action_type_name_keyboard() {
        let engine = ActionEngine::new();
        let action = create_keyboard_action();
        assert_eq!(engine.get_action_type_name(&action), "keyboard");
    }

    #[test]
    fn test_action_type_name_media() {
        let engine = ActionEngine::new();
        let action = create_media_action();
        assert_eq!(engine.get_action_type_name(&action), "media");
    }

    #[test]
    fn test_action_type_name_launch() {
        let engine = ActionEngine::new();
        let action = create_launch_action();
        assert_eq!(engine.get_action_type_name(&action), "launch");
    }

    #[test]
    fn test_action_type_name_script() {
        let engine = ActionEngine::new();
        let action = create_script_action();
        assert_eq!(engine.get_action_type_name(&action), "script");
    }

    #[test]
    fn test_action_type_name_http() {
        let engine = ActionEngine::new();
        let action = create_http_action();
        assert_eq!(engine.get_action_type_name(&action), "http");
    }

    #[test]
    fn test_action_type_name_system() {
        let engine = ActionEngine::new();
        let action = create_system_action();
        assert_eq!(engine.get_action_type_name(&action), "system");
    }

    #[test]
    fn test_action_type_name_text() {
        let engine = ActionEngine::new();
        let action = create_text_action();
        assert_eq!(engine.get_action_type_name(&action), "text");
    }

    #[test]
    fn test_action_type_name_profile() {
        let engine = ActionEngine::new();
        let action = create_profile_action();
        assert_eq!(engine.get_action_type_name(&action), "profile");
    }

    #[test]
    fn test_action_type_name_home_assistant() {
        let engine = ActionEngine::new();
        let action = create_home_assistant_action();
        assert_eq!(engine.get_action_type_name(&action), "homeAssistant");
    }

    #[test]
    fn test_action_type_name_node_red() {
        let engine = ActionEngine::new();
        let action = create_node_red_action();
        assert_eq!(engine.get_action_type_name(&action), "nodeRed");
    }

    // ========== History Recording Tests ==========

    #[test]
    fn test_record_execution_success() {
        let mut engine = ActionEngine::new();
        let action = create_keyboard_action();
        let result = ActionResult::success(50);

        engine.record_execution(&action, &result);

        assert_eq!(engine.get_history().len(), 1);
        let entry = &engine.get_history()[0];
        assert_eq!(entry.action_type, "keyboard");
        assert!(entry.success);
        assert_eq!(entry.duration_ms, 50);
        assert!(entry.error.is_none());
        assert!(entry.timestamp > 0);
    }

    #[test]
    fn test_record_execution_failure() {
        let mut engine = ActionEngine::new();
        let action = create_http_action();
        let result = ActionResult::failure("Connection timeout".to_string(), 30000);

        engine.record_execution(&action, &result);

        assert_eq!(engine.get_history().len(), 1);
        let entry = &engine.get_history()[0];
        assert_eq!(entry.action_type, "http");
        assert!(!entry.success);
        assert_eq!(entry.duration_ms, 30000);
        assert_eq!(entry.error, Some("Connection timeout".to_string()));
    }

    #[test]
    fn test_record_execution_multiple_entries() {
        let mut engine = ActionEngine::new();

        engine.record_execution(&create_keyboard_action(), &ActionResult::success(10));
        engine.record_execution(&create_media_action(), &ActionResult::success(20));
        engine.record_execution(&create_system_action(), &ActionResult::success(30));

        assert_eq!(engine.get_history().len(), 3);
        assert_eq!(engine.get_history()[0].action_type, "keyboard");
        assert_eq!(engine.get_history()[1].action_type, "media");
        assert_eq!(engine.get_history()[2].action_type, "system");
    }

    #[test]
    fn test_history_enforces_max_limit() {
        let mut engine = ActionEngine::new();
        // Engine has max_history = 100

        // Add 105 entries
        for i in 0..105 {
            let action = create_keyboard_action();
            let result = ActionResult::success(i as u64);
            engine.record_execution(&action, &result);
        }

        // Should be capped at 100
        assert_eq!(engine.get_history().len(), 100);

        // First entry should have duration_ms = 5 (entries 0-4 were removed)
        assert_eq!(engine.get_history()[0].duration_ms, 5);

        // Last entry should have duration_ms = 104
        assert_eq!(engine.get_history()[99].duration_ms, 104);
    }

    #[test]
    fn test_clear_history() {
        let mut engine = ActionEngine::new();

        engine.record_execution(&create_keyboard_action(), &ActionResult::success(10));
        engine.record_execution(&create_media_action(), &ActionResult::success(20));

        assert_eq!(engine.get_history().len(), 2);

        engine.clear_history();

        assert!(engine.get_history().is_empty());
    }

    #[test]
    fn test_clear_history_on_empty_is_safe() {
        let mut engine = ActionEngine::new();
        engine.clear_history(); // Should not panic
        assert!(engine.get_history().is_empty());
    }

    // ========== Execution State Tests ==========

    #[test]
    fn test_is_executing_initially_false() {
        let engine = ActionEngine::new();
        assert!(!engine.is_executing());
    }

    #[test]
    fn test_cancel_resets_is_executing() {
        let mut engine = ActionEngine::new();

        // Manually set is_executing to true (simulating an ongoing action)
        engine.is_executing = true;
        assert!(engine.is_executing());

        engine.cancel();

        assert!(!engine.is_executing());
    }

    #[test]
    fn test_cancel_on_idle_engine_is_safe() {
        let mut engine = ActionEngine::new();
        engine.cancel(); // Should not panic
        assert!(!engine.is_executing());
    }

    // ========== HistoryEntry Serialization Tests ==========

    #[test]
    fn test_history_entry_serializes_to_camel_case() {
        let entry = HistoryEntry {
            action_type: "keyboard".to_string(),
            success: true,
            duration_ms: 50,
            timestamp: 1700000000000,
            error: None,
        };

        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"actionType\""));
        assert!(json.contains("\"durationMs\""));
        assert!(!json.contains("\"action_type\"")); // Should be camelCase
    }

    #[test]
    fn test_history_entry_with_error_serializes() {
        let entry = HistoryEntry {
            action_type: "http".to_string(),
            success: false,
            duration_ms: 30000,
            timestamp: 1700000000000,
            error: Some("Connection refused".to_string()),
        };

        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"error\":\"Connection refused\""));
    }

    // ========== ActionResult Helper Tests ==========

    #[test]
    fn test_action_result_success() {
        let result = ActionResult::success(100);
        assert!(result.success);
        assert!(result.message.is_none());
        assert!(result.error.is_none());
        assert_eq!(result.duration_ms, 100);
    }

    #[test]
    fn test_action_result_success_with_message() {
        let result = ActionResult::success_with_message("Completed".to_string(), 200);
        assert!(result.success);
        assert_eq!(result.message, Some("Completed".to_string()));
        assert!(result.error.is_none());
        assert_eq!(result.duration_ms, 200);
    }

    #[test]
    fn test_action_result_failure() {
        let result = ActionResult::failure("Something went wrong".to_string(), 500);
        assert!(!result.success);
        assert!(result.message.is_none());
        assert_eq!(result.error, Some("Something went wrong".to_string()));
        assert_eq!(result.duration_ms, 500);
    }

    // ========== CancellationToken Tests ==========

    #[test]
    fn test_cancellation_token_new_is_not_cancelled() {
        let token = CancellationToken::new();
        assert!(!token.is_cancelled());
    }

    #[test]
    fn test_cancellation_token_default_is_not_cancelled() {
        let token = CancellationToken::default();
        assert!(!token.is_cancelled());
    }

    #[test]
    fn test_cancellation_token_cancel_sets_cancelled() {
        let token = CancellationToken::new();
        token.cancel();
        assert!(token.is_cancelled());
    }

    #[test]
    fn test_cancellation_token_reset_clears_cancelled() {
        let token = CancellationToken::new();
        token.cancel();
        assert!(token.is_cancelled());
        token.reset();
        assert!(!token.is_cancelled());
    }

    #[test]
    fn test_cancellation_token_clone_shares_state() {
        let token1 = CancellationToken::new();
        let token2 = token1.clone();

        assert!(!token1.is_cancelled());
        assert!(!token2.is_cancelled());

        token1.cancel();

        // Both tokens should see cancellation
        assert!(token1.is_cancelled());
        assert!(token2.is_cancelled());
    }

    #[test]
    fn test_cancellation_token_clone_reset_affects_all() {
        let token1 = CancellationToken::new();
        let token2 = token1.clone();

        token1.cancel();
        assert!(token2.is_cancelled());

        token2.reset();
        assert!(!token1.is_cancelled());
        assert!(!token2.is_cancelled());
    }

    #[test]
    fn test_engine_get_cancellation_token() {
        let engine = ActionEngine::new();
        let token = engine.get_cancellation_token();
        assert!(!token.is_cancelled());
    }

    #[test]
    fn test_cancel_sets_cancellation_token() {
        let mut engine = ActionEngine::new();
        let token = engine.get_cancellation_token();

        assert!(!token.is_cancelled());

        engine.cancel();

        // The token should reflect cancellation
        assert!(token.is_cancelled());
    }

    #[test]
    fn test_multiple_cancel_calls_are_safe() {
        let mut engine = ActionEngine::new();
        let token = engine.get_cancellation_token();

        engine.cancel();
        engine.cancel();
        engine.cancel();

        // Should still be cancelled and not panic
        assert!(token.is_cancelled());
        assert!(!engine.is_executing());
    }
}
