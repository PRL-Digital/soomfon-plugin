//! Action System Module
//!
//! Handles action execution including keyboard, media, launch, HTTP, and more.

pub mod types;
pub mod engine;
pub mod event_binder;
pub mod handlers;

// Re-export CancellationToken for use by handlers that support cancellation
pub use engine::CancellationToken;

use crate::config::types::{HomeAssistantConfig, NodeRedConfig};
use types::{Action, ActionResult};

/// Integration configuration for action execution
///
/// Contains optional configuration for integrations like Home Assistant and Node-RED.
/// When provided, handlers will use these settings instead of environment variables.
#[derive(Debug, Clone, Default)]
pub struct IntegrationConfig {
    pub home_assistant: Option<HomeAssistantConfig>,
    pub node_red: Option<NodeRedConfig>,
}

/// Execute an action standalone (without engine state management)
///
/// This is used by the Tauri command to execute actions without holding
/// a mutex lock across await points.
pub async fn execute_action_standalone(action: &Action) -> ActionResult {
    execute_action_with_config(action, &IntegrationConfig::default()).await
}

/// Execute an action with integration configuration
///
/// Allows passing Home Assistant and Node-RED configuration to handlers
/// instead of relying on environment variables.
pub async fn execute_action_with_config(
    action: &Action,
    integrations: &IntegrationConfig,
) -> ActionResult {
    let start = std::time::Instant::now();

    let result = match action {
        Action::Keyboard(config) => handlers::keyboard::execute(config).await,
        Action::Media(config) => handlers::media::execute(config).await,
        Action::Launch(config) => handlers::launch::execute(config).await,
        Action::Script(config) => handlers::script::execute(config).await,
        Action::Http(config) => handlers::http::execute(config).await,
        Action::System(config) => handlers::system::execute(config).await,
        Action::Text(config) => handlers::text::execute(config).await,
        Action::Profile(config) => handlers::profile::execute(config).await,
        Action::HomeAssistant(config) => {
            handlers::home_assistant::execute_with_config(
                config,
                integrations.home_assistant.as_ref(),
            ).await
        }
        Action::NodeRed(config) => {
            handlers::node_red::execute_with_config(
                config,
                integrations.node_red.as_ref(),
            ).await
        }
    };

    let duration = start.elapsed().as_millis() as u64;

    ActionResult {
        duration_ms: duration,
        ..result
    }
}
