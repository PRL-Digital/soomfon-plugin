//! Action System Module
//!
//! Handles action execution including keyboard, media, launch, HTTP, and more.

pub mod types;
pub mod engine;
pub mod event_binder;
pub mod handlers;

use types::{Action, ActionResult};

/// Execute an action standalone (without engine state management)
///
/// This is used by the Tauri command to execute actions without holding
/// a mutex lock across await points.
pub async fn execute_action_standalone(action: &Action) -> ActionResult {
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
        Action::HomeAssistant(config) => handlers::home_assistant::execute(config).await,
        Action::NodeRed(config) => handlers::node_red::execute(config).await,
    };

    let duration = start.elapsed().as_millis() as u64;

    ActionResult {
        duration_ms: duration,
        ..result
    }
}
